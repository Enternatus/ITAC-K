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
  <img src="figures/ITAC_K_Architecture_Flow.jpg" alt="ITAC-K Architecture Diagram" width="100%" />
</div>
<br>

## What is ITAC-K?
ITAC-K is a distributed control architecture designed for physical edge nodes (e.g., ESP32 microcontrollers). It manages resource allocation and policy selection under highly uncertain, adversarial, and rapidly changing environmental regimes.

## Architecture

### System Flow Diagram
```mermaid
flowchart TB
    subgraph edgenode["Edge Node (ESP32)"]
        direction LR
        subgraph sensing["Sensing Layer"]
            US["Ultrasonic Sensors<br/><i>Raw distance mapping</i>"]
            MD[("Slot State<br/><i>Empty / Occupied</i>")]
            US --> MD
        end
        subgraph state_engine["Recursive State Engine (O(1))"]
            VE["Volatility Engine<br/><i>Dispersion, Churn, Drift</i>"]
            PR["Predictive Reliability<br/><i>Error, Bias, Calibration</i>"]
            PA["Policy-Admissibility<br/><i>Confidence bounds overlap</i>"]
            UD["Uncertainty Debt<br/><i>Accumulated decision risk</i>"]
            
            MD --> VE
            VE --> PR
            PR --> PA
            PA --> UD
        end
    end

    subgraph arbitration["Action Arbitration"]
        direction LR
        EXP["Exploit<br/><i>Direct Allocation</i>"]
        LP["Local Probe<br/><i>Physical Evidence</i>"]
        RS["Remote Substitute<br/><i>Peer Evidence</i>"]
        
        UD --> EXP
        UD --> LP
        UD --> RS
    end

    subgraph swarm["Distributed Swarm (ESP-NOW)"]
        direction LR
        PEER["Peer Nodes<br/><i>Broadcast certificates</i>"]
        QG{"Qualification Gate<br/><i>Context, Freshness, Regime</i>"}
        
        RS -.-> PEER
        PEER --> QG
    end

    BU[("Bayesian Update<br/><i>Update admissibility limits</i>")]

    QG -->|Pass| BU
    QG -.->|Reject| DISCARD["Discard<br/><i>Prevent mismatch</i>"]
    LP --> BU
    EXP --> BU
    BU -->|Recursive feedback| VE

    style edgenode fill:#1a1a2e,stroke:#16213e,color:#eee
    style arbitration fill:#0f3460,stroke:#16213e,color:#eee
    style swarm fill:#16213e,stroke:#22c55e,color:#eee
    style sensing fill:#1a1a2e,stroke:#e94560,color:#eee
    style state_engine fill:#1a1a2e,stroke:#3b82f6,color:#eee
```

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
