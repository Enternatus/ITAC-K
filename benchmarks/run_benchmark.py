#!/usr/bin/env python3
from __future__ import annotations

import argparse, json, math, random, time
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
from typing import Optional, Dict, Tuple, List

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

try:
    from scipy import stats
except Exception:
    stats = None

# ----------------------------- CONFIG ---------------------------------
@dataclass
class Config:
    nodes:int=5; horizon:int=900; warmup:int=40
    policies:Tuple[str,...]=("AGGRESSIVE","SAFE","NEAREST")
    base_policy_costs:Tuple[float,...]=(10.0,20.0,24.0)
    shock_start:int=220; shock_end:int=390
    shock2_start:int=580; shock2_end:int=650
    shock1_aggressive_multiplier:float=5.0
    shock2_aggressive_multiplier:float=0.45
    shock2_safe_multiplier:float=1.0
    base_noise_sd:float=1.5; node_bias_sd:float=0.75; regime_context_noise:float=0.05
    duration_floor:float=1.0
    mean_alpha:float=0.20; var_alpha:float=0.12; bias_alpha:float=0.12; calibration_alpha:float=0.08
    prior_var:float=16.0; confidence_z:float=1.96
    boundary_entropy_threshold:float=0.54
    debt_enter:float=0.72; debt_exit:float=0.48; debt_max:float=2.5
    rho_velocity:float=0.32; rho_acceleration:float=0.58
    freshness_tau:float=55.0; transfer_threshold:float=0.85; min_source_reliability:float=0.60
    freshness_tau_threshold:float=0.40
    context_weight:float=0.30; regime_weight:float=0.25; policy_weight:float=0.25
    resource_weight:float=0.10; temporal_weight:float=0.10
    saturation_eta:float=0.80; correlation_discount:float=0.60; max_peer_records:int=3
    local_probe_penalty:float=0.50; communication_bytes_certificate:int=64; communication_bytes_header:int=12
    service_penalty_weight:float=0.25
    spi_margin:float=0.10; dual_exploration_weight:float=25.0
    constrained_ucb_weight:float=15.0; generic_eig_weight:float=150.0
    probe_budget_fraction:float=0.15
    seeds:int=50; alpha_ci:float=0.05


def clip(x,lo,hi): return max(lo,min(hi,x))
def pos(x): return max(0.0,x)
def sigmoid(x): return 1.0/(1.0+math.exp(-float(np.clip(x,-35,35))))
def hbin(p):
    p=clip(p,1e-9,1-1e-9); return -(p*math.log2(p)+(1-p)*math.log2(1-p))

def ctx_sim(a,b):
    denom=np.linalg.norm(a)+np.linalg.norm(b)+1e-12
    return clip(1.0-np.linalg.norm(a-b)/denom,0.0,1.0)

def ci(mean,var,n,z):
    half=z*math.sqrt(max(var,1e-9))/math.sqrt(max(n,1.0))
    return mean-half, mean+half

# ----------------------------- ENV -----------------------------------
@dataclass
class Event:
    t:int; node:int; regime:str; context:np.ndarray
    oracle_policy:int; oracle_cost:float; policy_costs:np.ndarray

class Env:
    def __init__(self,cfg,seed):
        self.cfg=cfg; self.rng=np.random.default_rng(seed)
        self.node_bias=self.rng.normal(0,cfg.node_bias_sd,cfg.nodes)
    def regime(self,t):
        if self.cfg.shock_start<=t<self.cfg.shock_end: return "SHOCK"
        if self.cfg.shock2_start<=t<self.cfg.shock2_end: return "RECOVERY_STRESS"
        return "NORMAL"
    def latent(self,t,node):
        c=np.array(self.cfg.base_policy_costs,dtype=float)
        r=self.regime(t)
        if r=="SHOCK":
            c[0]*=self.cfg.shock1_aggressive_multiplier; c[1]*=1.0; c[2]*=1.05
        elif r=="RECOVERY_STRESS":
            c[0]*=self.cfg.shock2_aggressive_multiplier; c[1]*=self.cfg.shock2_safe_multiplier; c[2]*=1.08
        c+=self.node_bias[node]
        ph=2*math.pi*(t%80)/80
        c+=np.array([0.25*math.sin(ph+0.2*node),0.10*math.cos(ph+0.1*node),0.12*math.sin(ph+0.4*node)])
        return np.maximum(c,self.cfg.duration_floor)
    def context(self,t,node):
        r=self.regime(t); rb=float(r!="NORMAL")
        density=0.15+0.75*float(self.cfg.shock_start-25<=t<self.cfg.shock_end+15)+0.45*float(self.cfg.shock2_start-10<=t<self.cfg.shock2_end+10)
        density+=self.rng.normal(0,self.cfg.regime_context_noise)
        return np.array([rb,clip(density,0,1.8),node/max(self.cfg.nodes-1,1)],dtype=float)
    def step(self,t,node):
        costs=self.latent(t,node); obs=np.maximum(costs+self.rng.normal(0,self.cfg.base_noise_sd,len(costs)),self.cfg.duration_floor)
        op=int(np.argmin(costs)); return Event(t,node,self.regime(t),self.context(t,node),op,float(costs[op]),obs)

# ----------------------------- RECURSIVE STATE ------------------------
class Predictor:
    def __init__(self,k,cfg):
        self.k=k; self.cfg=cfg
        self.mean=np.array(cfg.base_policy_costs,dtype=float); self.var=np.full(k,cfg.prior_var)
        self.bias=np.zeros(k); self.cal=np.zeros(k); self.count=np.zeros(k)
    def update(self,p,actual):
        pred=float(self.mean[p]); err=actual-pred; ae=abs(err)
        old=pred; a=self.cfg.mean_alpha
        self.mean[p]=a*actual+(1-a)*old
        self.var[p]=self.cfg.var_alpha*(actual-old)**2+(1-self.cfg.var_alpha)*self.var[p]
        self.bias[p]=self.cfg.bias_alpha*err+(1-self.cfg.bias_alpha)*self.bias[p]
        conf=1/(1+math.sqrt(max(self.var[p],1e-9))); success=math.exp(-ae/max(self.mean[p],1.0))
        gap=abs(conf-success); self.cal[p]=self.cfg.calibration_alpha*gap+(1-self.cfg.calibration_alpha)*self.cal[p]
        self.count[p]+=1
    def reliability(self,p):
        e=min(1,abs(self.bias[p])/max(self.cfg.base_policy_costs[p],1)); ce=clip(self.cal[p],0,1); v=min(1,math.sqrt(max(self.var[p],0))/10)
        return clip(1-(0.45*e+0.30*ce+0.25*v),0.05,0.99)
    def interval(self,p,z): return ci(self.mean[p],self.var[p],self.count[p]+1,z)

class Base:
    def __init__(self,cfg,node):
        self.cfg=cfg; self.node=node; self.k=len(cfg.policies); self.pred=Predictor(self.k,cfg)
        self.last=None; self.switches=0; self.probes=0; self.remote=0; self.bytes=0; self.ops=0; self.info=0.0; self.records=[]
    def switch(self,p):
        if self.last is not None and p!=self.last: self.switches+=1
        self.last=p

class Greedy(Base):
    def choose(self,t,e,bus=None): self.ops+=self.k; return int(np.argmin(self.pred.mean)),0,0,0,0,0,0,"EXPLOIT"

class SPI(Base):
    def choose(self,t,e,bus=None):
        safe=1; slo,shi=self.pred.interval(safe,self.cfg.confidence_z); best=safe
        for p in (0,2):
            lo,hi=self.pred.interval(p,self.cfg.confidence_z)
            if hi+self.cfg.spi_margin<slo: best=p; break
        self.ops+=2*self.k
        probe=int(best!=safe and self.pred.count[best]<8)
        if probe: self.probes += 1
        return best,probe,0,0,0,0,0,"LOCAL_PROBE" if probe else "EXPLOIT"

class Dual(Base):
    def choose(self,t,e,bus=None):
        scores=[]
        for p in range(self.k):
            u=math.sqrt(max(self.pred.var[p],1e-9)); ex=self.cfg.dual_exploration_weight*u/math.sqrt(self.pred.count[p]+1)
            scores.append(self.pred.mean[p]-ex)
        p=int(np.argmin(scores)); g=int(np.argmin(self.pred.mean)); probe=int(p!=g); self.ops+=3*self.k
        if probe: self.probes += 1
        return p,probe,0,0,0,0,0,"LOCAL_PROBE" if probe else "EXPLOIT"

class ConstrainedBandit(Base):
    def __init__(self,cfg,node): super().__init__(cfg,node); self.budget=cfg.probe_budget_fraction*cfg.horizon
    def choose(self,t,e,bus=None):
        rem=max(0,self.budget-self.probes); scores=[]
        for p in range(self.k):
            u=math.sqrt(max(self.pred.var[p],1e-9)); bonus=self.cfg.constrained_ucb_weight*u/math.sqrt(self.pred.count[p]+1)
            scores.append(self.pred.mean[p]-bonus*(1 if rem>0 else 0))
        p=int(np.argmin(scores)); g=int(np.argmin(self.pred.mean)); probe=int(p!=g and self.probes<self.budget)
        if probe:self.probes+=1
        self.ops+=3*self.k; return p,probe,0,0,0,0,0,"LOCAL_PROBE" if probe else "EXPLOIT"

class GenericEIG(Base):
    def choose(self,t,e,bus=None):
        scores=[]
        for p in range(self.k):
            u=math.sqrt(max(self.pred.var[p],1e-9)); eig=u/math.sqrt(self.pred.count[p]+1); cost=max(self.pred.mean[p],1)
            scores.append(self.pred.mean[p]-self.cfg.generic_eig_weight*eig/cost)
        p=int(np.argmin(scores)); g=int(np.argmin(self.pred.mean)); probe=int(p!=g); self.ops+=4*self.k
        if probe: self.probes += 1
        return p,probe,0,0,0,0,0,"LOCAL_PROBE" if probe else "EXPLOIT"

# ----------------------------- ITAC-K --------------------------------
@dataclass
class Cert:
    source:int; pair:Tuple[int,int]; context:np.ndarray; regime:str; t:int
    pred:float; actual:float; info:float; reliability:float; lineage:int

class Bus:
    def __init__(self,cfg): self.cfg=cfg; self.records=[]
    def publish(self,c):
        self.records.append(c); lim=self.cfg.nodes*self.cfg.max_peer_records
        if len(self.records)>lim: self.records=self.records[-lim:]
    def candidates(self,node): return [c for c in self.records if c.source!=node]

class ITAC(Base):
    def __init__(self,cfg,node,kin=True,remote=True,targeted=True,hyst=True,strict_qual=True):
        super().__init__(cfg,node); self.kin=kin; self.remote_on=remote; self.targeted=targeted; self.hyst=hyst
        self.strict_qual=strict_qual
        self.N=self.C=self.fast=self.slow=self.V=self.Vprev=self.vel_prev=0.0; self.last_reg=None
        self.ent={}; self.debt={}; self.sat={}; self.triage="EXPLOIT"; self.latched=False; self.lineage=0
        for i in range(self.k):
            for j in range(i+1,self.k): self.ent[(i,j)]=1.0; self.debt[(i,j)]=0.0; self.sat[(i,j)]=0.0
    def update_env(self,e):
        proxy=float(e.regime!="NORMAL"); prior=1.0 if self.last_reg=="SHOCK" else 0.0
        toggle=abs(proxy-prior); self.C=0.22*toggle+0.78*self.C
        disp=float(np.std(e.policy_costs)); self.N=0.18*disp+0.82*self.N
        m=float(np.mean(e.policy_costs)); self.fast=0.30*m+0.70*self.fast; self.slow=0.04*m+0.96*self.slow
        self.V=0.35*min(1,self.N/8)+0.40*clip(self.C,0,1)+0.25*min(1,abs(self.fast-self.slow)/8)
        vel=self.V-self.Vprev; acc=vel-self.vel_prev; self.Vprev=self.V; self.vel_prev=vel; self.last_reg=e.regime
        return self.V,vel,acc
    def pair_prob(self,i,j):
        den=math.sqrt(max(self.pred.var[i]+self.pred.var[j],1e-9)); return clip(sigmoid((self.pred.mean[j]-self.pred.mean[i])/den),0.001,0.999)
    def update_bounds(self):
        for pair in self.ent: self.ent[pair]=hbin(self.pair_prob(*pair))
    def target_pair(self):
        g=int(np.argmin(self.pred.mean)); c=[p for p in self.ent if g in p]
        if not self.targeted: c=list(self.ent)
        return max(c,key=lambda p:self.ent[p])
    def interest(self,vel,acc): return 0 if not self.kin else self.cfg.rho_velocity*pos(vel)+self.cfg.rho_acceleration*pos(acc)
    def effdebt(self,pair,vel,acc): return self.debt[pair]+self.interest(vel,acc)
    def remote_best(self,bus,e,pair):
        if not self.remote_on:return None
        best=None
        for c in bus.candidates(self.node):
            if c.pair!=pair: continue
            age=max(0,e.t-c.t); fresh=math.exp(-age/max(self.cfg.freshness_tau,1e-9)); cs=ctx_sim(e.context,c.context)
            if self.strict_qual:
                if e.regime!=c.regime: continue
                if cs < self.cfg.transfer_threshold: continue
                if fresh < self.cfg.freshness_tau_threshold: continue
                eq = cs * fresh
            else:
                eq = 1.0 # Unqualified remote accepts anything
            val=c.info*eq*c.reliability*fresh
            if val>0.05 and (best is None or val>best[0]): best=(val,c,eq)
        return best
    def pbv(self,p,pair):
        u=math.sqrt(max(self.pred.var[p],1e-9)); expected=u/math.sqrt(self.pred.count[p]+1); risk=(1-self.pred.reliability(p))+self.cfg.service_penalty_weight
        return expected*(0.5+self.ent[pair])/(max(self.pred.mean[p],1)+self.cfg.local_probe_penalty+risk)
    def choose(self,t,e,bus):
        V,vel,acc=self.update_env(e); self.update_bounds(); pair=self.target_pair(); B=self.ent[pair]; E=self.effdebt(pair,vel,acc)
        if self.hyst:
            if self.triage=="EXPLOIT" and (B>self.cfg.boundary_entropy_threshold or E>self.cfg.debt_enter): self.latched=True
            elif self.triage!="EXPLOIT" and B<0.78*self.cfg.boundary_entropy_threshold and E<self.cfg.debt_exit: self.latched=False
        else: self.latched=(B>self.cfg.boundary_entropy_threshold or E>self.cfg.debt_enter)
        if not self.latched:
            p=int(np.argmin(self.pred.mean)); self.triage="EXPLOIT"; self.ops+=self.k+5
            return p,0,0,0,B,self.debt[pair],E,self.triage
        rb=self.remote_best(bus,e,pair)
        if rb is not None:
            val,c,eq=rb; old=self.debt[pair]; self.debt[pair]=clip(old-0.85*val,0,self.cfg.debt_max)
            self.sat[pair]=min(1,self.cfg.saturation_eta*self.sat[pair]+val); self.ent[pair]*=math.exp(-0.75*val)
            self.remote+=1; b=self.cfg.communication_bytes_certificate+self.cfg.communication_bytes_header; self.bytes+=b; self.triage="REMOTE_SUBSTITUTE"; self.ops+=self.k+9
            return int(np.argmin(self.pred.mean)),0,1,b,B,old,E,self.triage
        best=max(range(self.k),key=lambda p:self.pbv(p,pair)); self.debt[pair]=clip(self.debt[pair]+0.18*B+0.12*E,0,self.cfg.debt_max); self.probes+=1; self.triage="LOCAL_PROBE"; self.ops+=4*self.k
        return best,1,0,0,B,self.debt[pair],E,self.triage
    def post(self,t,e,p,probe,bus):
        pair=self.target_pair(); old_h=self.ent[pair]; pred_before=float(self.pred.mean[p]); self.pred.update(p,float(e.policy_costs[p])); self.update_bounds(); new_h=self.ent[pair]
        # boundary-specific uncertainty reduction + normalized prediction-distribution mismatch proxy
        boundary_gain=max(0.0,old_h-new_h); err=abs(float(e.policy_costs[p])-pred_before)/max(pred_before,1.0); kl=0.5*err*err
        info=clip(0.65*boundary_gain+0.35*kl,0,1.25)
        sat=self.sat[pair]; inc=info*(1-0.65*sat); self.sat[pair]=min(1,self.cfg.saturation_eta*sat+inc); self.debt[pair]=clip(self.debt[pair]-0.90*inc,0,self.cfg.debt_max); self.info+=inc
        if probe and inc>0.05:
            self.lineage+=1; rel=self.pred.reliability(p); cert=Cert(self.node,pair,e.context.copy(),e.regime,t,pred_before,float(e.policy_costs[p]),inc,rel,self.lineage)
            bus.publish(cert); self.bytes+=self.cfg.communication_bytes_certificate+self.cfg.communication_bytes_header
        return inc
    def state_count(self):
        pc=self.k*(self.k-1)//2
        return 10+3*pc

# ----------------------------- RUN -----------------------------------
ALGS=["Greedy","SPI_HCPI","DualControl","ConstrainedBandit","GenericEIG",
      "ITAC_K_Full",
      "ITAC_K_LocalOnly",
      "ITAC_K_GenericVoI_Local",
      "ITAC_K_UnqualifiedRemote",
      "ITAC_K_NoKinematics",
      "ITAC_K_NoHysteresis"]

def make_alg(name,cfg,node):
    if name=="Greedy": return Greedy(cfg,node)
    if name=="SPI_HCPI": return SPI(cfg,node)
    if name=="DualControl": return Dual(cfg,node)
    if name=="ConstrainedBandit": return ConstrainedBandit(cfg,node)
    if name=="GenericEIG": return GenericEIG(cfg,node)
    
    # ITAC(cfg, node, kin, remote, targeted, hyst, strict_qual)
    if name=="ITAC_K_Full": return ITAC(cfg,node,True,True,True,True,True)
    if name=="ITAC_K_LocalOnly": return ITAC(cfg,node,True,False,True,True,True)
    if name=="ITAC_K_GenericVoI_Local": return ITAC(cfg,node,True,False,False,True,True)
    if name=="ITAC_K_UnqualifiedRemote": return ITAC(cfg,node,True,True,True,True,False)
    if name=="ITAC_K_NoKinematics": return ITAC(cfg,node,False,True,True,True,True)
    if name=="ITAC_K_NoHysteresis": return ITAC(cfg,node,True,True,True,False,True)
    
    raise ValueError(name)

def run(cfg,name,seed,scenario):
    env=Env(cfg,seed); bus=Bus(cfg); agents=[make_alg(name,cfg,n) for n in range(cfg.nodes)]
    rec=[]; total_reg=0; bad_ag=0; ag=0; recovery=[None,None]
    for t in range(cfg.horizon):
        for node in range(cfg.nodes):
            e=env.step(t,node); a=agents[node]; p,probe,remote,bytes_step,B,D,E,tri=a.choose(t,e,bus)
            obs=float(e.policy_costs[p]); regret=max(0.0,obs-e.oracle_cost); ag+=int(p==0); bad_ag+=int(p==0 and e.oracle_policy!=0)
            if p==0 and t>=cfg.shock_end and t<cfg.shock2_start and recovery[0] is None: recovery[0]=t-cfg.shock_end
            if p==0 and t>=cfg.shock2_end and recovery[1] is None: recovery[1]=t-cfg.shock2_end
            if isinstance(a,ITAC):
                a.post(t,e,p,probe,bus)
                V,vel,acc=a.V,a.vel_prev,a.vel_prev-a.Vprev # quick approximations to avoid error
            else:
                a.pred.update(p,obs); V=vel=acc=float("nan")
            a.switch(p); rec.append([t,node,scenario,name,p,e.oracle_policy,obs,e.oracle_cost,regret,probe,remote,bytes_step,B,D,E,V,vel,acc,tri])
            total_reg+=regret
    max_state=max(a.state_count() if isinstance(a,ITAC) else len(cfg.policies)*5+8 for a in agents)
    probes=sum(a.probes for a in agents); remote=sum(a.remote for a in agents); comm=sum(a.bytes for a in agents); switches=sum(a.switches for a in agents); ops=sum(a.ops for a in agents); info=sum(a.info for a in agents)
    throughput_loss=sum(r[8] for r in rec)
    return {
        "scenario":scenario,"algorithm":name,"seed":seed,"total_regret":total_reg,"mean_regret":total_reg/(cfg.horizon*cfg.nodes),
        "physical_probes":probes,"remote_substitutions":remote,"communication_bytes":comm,"bad_aggressive_decisions":bad_ag,"aggressive_decisions":ag,"policy_switches":switches,
        "recovery_delay_1":(recovery[0] if recovery[0] is not None else float("nan")),
        "recovery_delay_2":(recovery[1] if recovery[1] is not None else float("nan")),
        "total_decision_ops":ops,"mean_decision_ops":ops/(cfg.horizon*cfg.nodes),"information_gain":info,
        "information_per_probe":info/max(probes,1),"information_per_regret":info/max(total_reg,1e-9),"max_state_count":max_state
    }, pd.DataFrame(rec,columns=["t","node","scenario","algorithm","selected_policy","oracle_policy","observed_cost","oracle_cost","regret","probe","remote_substitute","communication_bytes","boundary_entropy","debt","effective_debt","volatility","velocity","acceleration","triage"])


def scenario_cfg(base,name):
    d=asdict(base)
    if name=="baseline_adversarial": pass
    elif name=="fast_shock": d.update(shock_start=180,shock_end=300,shock2_start=470,shock2_end=535)
    elif name=="long_shock": d.update(shock_start=180,shock_end=500,shock2_start=680,shock2_end=760)
    elif name=="noisy_sensor": d.update(base_noise_sd=3.5)
    elif name=="high_node_heterogeneity": d.update(node_bias_sd=1.8)
    elif name=="rapid_oscillation": d.update(shock_start=120,shock_end=210,shock2_start=240,shock2_end=330)
    elif name=="violent_shock": d.update(shock_start=150,shock_end=170,shock2_start=300,shock2_end=320, shock1_aggressive_multiplier=8.0, shock2_aggressive_multiplier=0.1)
    elif name=="peer_mismatch": d.update(regime_context_noise=1.5, node_bias_sd=3.0)
    else: raise ValueError(name)
    d["policies"]=tuple(d["policies"]); d["base_policy_costs"]=tuple(d["base_policy_costs"]); return Config(**d)
SCENARIOS=["baseline_adversarial","fast_shock","long_shock","noisy_sensor","high_node_heterogeneity","rapid_oscillation","violent_shock","peer_mismatch"]

def mean_ci(x,alpha=.05):
    x=np.asarray(x,float); x=x[np.isfinite(x)]
    if len(x)<2:return float(np.mean(x)),float("nan"),float("nan")
    m=float(np.mean(x));
    if stats is not None: mar=float(stats.t.ppf(1-alpha/2,len(x)-1)*stats.sem(x))
    else: mar=float(1.96*np.std(x,ddof=1)/math.sqrt(len(x)))
    return m,m-mar,m+mar

def paired(df,metric,a,b):
    x=df[df.algorithm==a].set_index("seed")[metric]; y=df[df.algorithm==b].set_index("seed")[metric]; ix=x.index.intersection(y.index); z=(x.loc[ix]-y.loc[ix]).to_numpy(float); m,lo,hi=mean_ci(z)
    return {"metric":metric,"A":a,"B":b,"A_minus_B_mean":m,"CI_low":lo,"CI_high":hi,"n":len(z),"A_better_fraction":float(np.mean(x.loc[ix].to_numpy()<y.loc[ix].to_numpy()))}

import concurrent.futures

def run_seed_task(args):
    cfg, sc, alg, seed = args
    scfg = scenario_cfg(cfg, sc)
    return run(scfg, alg, seed, sc)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--seeds",type=int,default=50); ap.add_argument("--horizon",type=int,default=900); ap.add_argument("--nodes",type=int,default=5); ap.add_argument("--scenario",default="all",choices=["all"]+SCENARIOS); ap.add_argument("--outdir",default="itack_benchmark_outputs"); args=ap.parse_args()
    cfg=Config(seeds=args.seeds,horizon=args.horizon,nodes=args.nodes); random.seed(0); np.random.seed(0); out=Path(args.outdir); out.mkdir(parents=True,exist_ok=True)
    json.dump(asdict(cfg),open(out/"config.json","w"),indent=2)
    scenarios=SCENARIOS if args.scenario=="all" else [args.scenario]; rows=[]; traces={}
    t0=time.time()
    
    tasks = []
    for sc in scenarios:
        for seed in range(cfg.seeds):
            for alg in ALGS:
                tasks.append((cfg, sc, alg, seed))
                
    print(f"Executing {len(tasks)} runs using ProcessPoolExecutor...")
    with concurrent.futures.ProcessPoolExecutor() as executor:
        results = list(executor.map(run_seed_task, tasks))
        
    for r, tr in results:
        rows.append(r)
        if r["scenario"]=="baseline_adversarial" and r["seed"]==0:
            traces[r["algorithm"]]=tr.groupby("t")["regret"].sum().cumsum()
            
    for sc in scenarios:
        print(f"\n=== {sc} ===")
        g=pd.DataFrame([r for r in rows if r["scenario"]==sc]).groupby("algorithm",as_index=False).agg(total_regret=("total_regret","mean"),physical_probes=("physical_probes","mean"),remote_substitutions=("remote_substitutions","mean"),communication_bytes=("communication_bytes","mean"),bad_aggressive_decisions=("bad_aggressive_decisions","mean"),recovery_delay_1=("recovery_delay_1","mean"))
        print(g.sort_values("total_regret").to_string(index=False))
    df=pd.DataFrame(rows); df.to_csv(out/"scenario_seed_results.csv",index=False)
    base=df[df.scenario=="baseline_adversarial"]
    summ=[]
    for alg,g in base.groupby("algorithm"):
        r={"algorithm":alg}
        for m in ["total_regret","physical_probes","remote_substitutions","communication_bytes","bad_aggressive_decisions","policy_switches","recovery_delay_1","recovery_delay_2","mean_decision_ops","information_gain","information_per_probe","information_per_regret","max_state_count"]:
            mm,lo,hi=mean_ci(g[m],cfg.alpha_ci); r[m]=mm; r[m+"_CI_low"]=lo; r[m+"_CI_high"]=hi
        summ.append(r)
    s=pd.DataFrame(summ).sort_values("total_regret"); s.to_csv(out/"summary.csv",index=False)
    comps=["Greedy","SPI_HCPI","DualControl","ConstrainedBandit","GenericEIG","ITAC_K_NoKinematics","ITAC_K_LocalOnly","ITAC_K_GenericVoI_Local","ITAC_K_UnqualifiedRemote","ITAC_K_NoHysteresis"]
    prs=[]
    for m in ["total_regret","physical_probes","communication_bytes","bad_aggressive_decisions","recovery_delay_1","mean_decision_ops"]:
        for other in comps: prs.append(paired(base,m,"ITAC_K_Full",other))
    pd.DataFrame(prs).to_csv(out/"paired_effects.csv",index=False)
    robust=df.groupby(["scenario","algorithm"],as_index=False).agg(total_regret=("total_regret","mean"),physical_probes=("physical_probes","mean"),remote_substitutions=("remote_substitutions","mean"),communication_bytes=("communication_bytes","mean"),bad_aggressive_decisions=("bad_aggressive_decisions","mean"),recovery_delay_1=("recovery_delay_1","mean"),recovery_delay_2=("recovery_delay_2","mean")); robust.to_csv(out/"scenario_summary.csv",index=False)
    # plots
    plt.figure(figsize=(12,6));
    for alg,c in traces.items(): plt.plot(c.index,c.values,label=alg)
    for x in [cfg.shock_start,cfg.shock_end,cfg.shock2_start,cfg.shock2_end]: plt.axvline(x,linestyle="--",linewidth=.8)
    plt.xlabel("Time step"); plt.ylabel("Cumulative regret"); plt.title("Baseline adversarial cumulative regret (seed 0)"); plt.legend(); plt.tight_layout(); plt.savefig(out/"cumulative_regret_seed0.png",dpi=160); plt.close()
    for metric,title,fn in [("total_regret","Mean total regret","mean_regret.png"),("physical_probes","Mean physical probes","mean_probes.png"),("communication_bytes","Mean communication bytes","mean_communication.png"),("recovery_delay_1","Mean recovery delay after shock 1","recovery_delay.png")]:
        plt.figure(figsize=(11,5)); plt.bar(np.arange(len(s)),s[metric]); plt.xticks(np.arange(len(s)),s.algorithm,rotation=45,ha="right"); plt.ylabel(metric); plt.title(title); plt.tight_layout(); plt.savefig(out/fn,dpi=160); plt.close()
    plt.figure(figsize=(8,6));
    for _,r in s.iterrows(): plt.scatter(r.physical_probes,r.total_regret,s=70); plt.annotate(r.algorithm,(r.physical_probes,r.total_regret),xytext=(5,5),textcoords="offset points",fontsize=8)
    plt.xlabel("Physical probes"); plt.ylabel("Total regret"); plt.title("Probe count versus regret"); plt.tight_layout(); plt.savefig(out/"probes_vs_regret.png",dpi=160); plt.close()
    # O(1) audit
    it=make_alg("ITAC_K_Full",cfg,0); audit={"fixed_policy_count":len(cfg.policies),"fixed_pair_count":len(cfg.policies)*(len(cfg.policies)-1)//2,"max_peer_records_per_node":cfg.max_peer_records,"controller_state_count_estimate":it.state_count(),"recursive_state_update":"O(1) for fixed-dimensional state","physical_resource_selection":"O(n) when scanning n resources","historical_buffer":False,"sliding_window":False}; json.dump(audit,open(out/"O1_audit.json","w"),indent=2)
    print("\n=== BASELINE SUMMARY ==="); print(s[["algorithm","total_regret","physical_probes","remote_substitutions","communication_bytes","bad_aggressive_decisions","recovery_delay_1","mean_decision_ops","information_per_probe"]].to_string(index=False)); print(f"\nCompleted in {time.time()-t0:.2f}s. Outputs: {out.resolve()}")

if __name__=="__main__": main()
