# ITAC-K: Boundary-Directed Distributed Uncertainty Resolution
**Hardware Constraint:** $O(1)$ recursive state memory executing on an ESP32 microcontroller. 
**Objective:** Replace generic multi-armed bandit sampling with a causal hardware arbitrator that manages pairwise policy debt and context-qualified remote experiment substitution.

## 1. Architecture Flowchart
```mermaid
flowchart TD
    %% 1. Observation
    World[PHYSICAL WORLD] --> Sensors[Sensors / Occupancy Events]
    
    %% 2. Estimation
    Sensors --> Estimator[Six-State Estimator<br>V, C, D, E, B, CE]
    Estimator --> Kinematics[Risk Kinematics<br>V, dV/dt, d2V/dt2]
    
    %% 3. Counterfactuals
    Kinematics --> CPM[Counterfactual Policy Model<br>J_hat, Margins M_ij]
    
    %% 4. Boundary State
    CPM --> PBState[Policy-Boundary State<br>p(i>j), B_ij, D_ij]
    
    %% 5. Arbitration (The Core State Machine)
    PBState --> Arbitrator{Information-Action Arbitrator}
    
    Arbitrator -->|Low Debt| Exploit[EXPLOIT<br>Direct Allocation]
    Arbitrator -->|High Debt| LocalProbe[LOCAL PROBE<br>Physical Acquisition]
    Arbitrator -->|High Debt + Cert| RemoteSub[REMOTE SUBSTITUTE<br>Context-Qualified Peer]
    
    %% 6. Networking & Qualification
    PeerEvidence[Peer Evidence] --> Qualify[Context Match, Freshness,<br>Reliability, Anti-Herding]
    Qualify --> RemoteSub
    
    %% 7. Action & Feedback
    Exploit --> Action[Physical Service Action]
    LocalProbe --> Action
    Action --> Outcome[Actual Outcome]
    
    Outcome --> Attribution[Policy-Boundary Attribution<br>KL Divergence Proxy]
    RemoteSub --> Attribution
    
    Attribution --> Debt[Boundary Information Credit<br>Debt Reduction]
    Debt --> Admissibility[Update Policy Admissibility]
    Admissibility -->|Next Decision| Arbitrator
```

## 2. Core Mathematical Formulas (O(1) Recursive)

**A. Risk Kinematics (Physics of Volatility)**
*   *Velocity:* $v_{R,t} = \frac{V_{env,t} - V_{env,t-1}}{\Delta t}$
*   *Acceleration:* $a_{R,t} = \frac{v_{R,t} - v_{R,t-1}}{\Delta t}$

**B. Policy-Boundary Ambiguity ($B_t$)**
*   *Pairwise Probability:* $p_{ij,t} = P(P_i \succ P_j \mid S_t)$
*   *Ambiguity:* $B_t = \sum_{(i,j) \in \mathcal{C}_t} w_{ij} \cdot \phi(p_{ij,t})$

**C. Pairwise Uncertainty Debt & Kinematic Interest ($D_{ij}$)**
*   *Base Debt Update:* $D_{ij,t+1} = \text{clip}(D_{ij,t} + \alpha A_{ij,t} - \beta I_{ij,t}, 0, D_{\max})$
*   *Effective Debt (With Interest):* $D^{eff}_{ij,t} = D_{ij,t} + \rho_1 \max(0, v_{R,t}) + \rho_2 \max(0, a_{R,t})$

**D. Remote Experiment Substitution ($I_{B \to A}$)**
*   *Context Similarity:* $S_{AB} = 1 - \frac{||X_A - X_B||}{Z}$
*   *Transferable Information:* $I_{B \to A} = I_{raw} \cdot S_{AB} \cdot Q_{source} \cdot e^{-\lambda \Delta t}$
*   *Anti-Herding (Recursive Saturation):* $S_{ij, t+1} = \eta S_{ij, t} + I_{B \to A}$

## 3. The Triage State Machine (Action Selection with Hysteresis)

When a resource allocation decision is required, the controller executes a strictly deterministic triage evaluation featuring **State-Dependent Hysteresis** to prevent chattering near boundaries.

*Hysteresis Logic:* Enter information-acquisition mode when $D^{eff}_{ij} > T_{enter}$. Return to exploit mode only when $D^{eff}_{ij} < T_{exit}$ (with $T_{enter} > T_{exit}$).

*   **STATE 1: EXPLOIT (Direct Execution)**
    *   *Condition:* System is in exploit mode (Debt is low/resolved).
    *   *Action:* Use the best currently admissible policy. Accrue standard debt ($+\alpha$) for exploiting without recent verification.
*   **STATE 2: REMOTE SUBSTITUTE**
    *   *Condition:* System is in information-acquisition mode AND Qualified Peer Evidence Exists ($I_{B \to A} > T_{transfer}$).
    *   *Action:* Accept the peer's Evidence Certificate. Apply the information credit to reduce $D_{ij}$ without performing a local physical probe.
*   **STATE 3: LOCAL PROBE (Active Calibration)**
    *   *Condition:* System is in information-acquisition mode AND NO Qualified Peer Evidence Exists.
    *   *Action:* Select a feasible service action $a^*$ that maximizes **Boundary-Directed Information Value (PBV)**:
        $$PBV(a) = \frac{E[\Delta B_{ij} \mid a]}{C_{op}(a) + C_{probe}(a) + \lambda R(a)}$$
