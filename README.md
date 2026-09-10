<div align="center">
  <h1>ITAC-K</h1>
  <p><strong>A Bounded-State Distributed Physical Resource-Allocation Controller</strong></p>
  <p>
    <a href="https://github.com/Enternatus/ITAC-K/releases"><img src="https://img.shields.io/badge/version-v1.0.1-blue.svg" alt="Version"></a>
    <a href="configs/final_frozen.json"><img src="https://img.shields.io/badge/status-Frozen_Champion-success.svg" alt="Status"></a>
  </p>
</div>

<br>
<div align="center">
  <img src="figures/ITAC_K_Architecture.jpg" alt="ITAC-K Architecture Diagram" width="100%" />
</div>
<br>


## What is ITAC-K?
ITAC-K is a distributed control architecture designed for physical edge nodes (e.g., ESP32 microcontrollers). It manages resource allocation and policy selection under highly uncertain, adversarial, and rapidly changing environmental regimes.

## Architecture
The core system is built on bounded recursive state updates (with respect to stream length) and operates through:
1. **Six-State Volatility Engine** ($V_{env}$)
2. **Predictive Reliability State**
3. **Policy-Admissibility Relation**
4. **Boundary-Directed Evidence Acquisition**
5. **Qualified Remote Evidence**
6. **Uncertainty Debt Tracking**

## Experimental Question & Protocol
**Protocol:** 100-seed unseen adversarial evaluation suite (Seeds 100-199). 

## Final Results
| System | Mean Regret | Physical Probes | Recovery Delay | Bad Aggressive Decisions |
| :--- | :--- | :--- | :--- | :--- |
| **ITAC-K (Frozen)** | **15,198.3** | **2,885.1** | **2.7s** | **148.2** |
| *Unqualified Remote* | *15,059.7* | *2,639.8* | *0.9s* | *147.9\** |
| **LocalOnly** | 19,304.3 | 4,403.2 | 7.4s | 176.0 |
| **Generic VoI** | 20,035.6 | 4,500.0 | 8.9s | 177.3 |
| **DualControl** | 26,188.0 | 386.7 | 78.8s | 49.8 |

*\*Important Nuance on Unqualified Remote: Despite slightly lower aggregate regret in this specific benchmark, the unqualified variant exhibits severe mismatch-induced cascade failures during adversarial contexts and therefore does not satisfy the intended robustness criterion. The strict Context Equivalence Gate in ITAC-K is a mandatory safety mechanism.*

## Ablations & Key Findings
*   **Safe Remote Substitution:** Outperformed LocalOnly by filtering poisoned/mismatched swarm data.
*   **Boundary-Targeted Probing:** Outperformed the implemented Generic VoI baseline by focusing local probes strictly on overlapping policy confidence intervals.

## Limitations (Failure Envelope)
*   **Synchronized Spoofing:** ITAC-K lacks cryptographic spoofing filters. If malicious peers forge perfectly matching context vectors, poisoned data passes the gate.
*   **Hyper-Volatility Limit:** If the environment transitions faster than the sum of probe execution and propagation delays, uncertainty debt compounds uncontrollably.

## Reproduce the Results
A fresh environment can reproduce the reported benchmark using the pinned dependencies and frozen configuration, subject to normal numerical/platform variation:
```bash
pip install -r requirements.txt
python benchmarks/run_benchmark.py --config configs/final_frozen.json --seeds 100-199
```

## Repository Structure
*   `/src/hardware/` - ESP32 C++ implementations.
*   `/benchmarks/` - Core Python simulation harness and baselines.
*   `/configs/` - The comprehensive, frozen benchmark parameters.
*   `/reports/` - Detailed ablation, complexity, and patent-evidence documentation.
*   `/results/final/` - The raw CSV/PNG outputs from the final evaluation.

