<div align="center">
  <h1>ITAC-K</h1>
  <p><strong>A Bounded-State Distributed Physical Resource-Allocation Controller</strong></p>
  <p>
    <a href="https://github.com/Enternatus/ITAC-K/releases"><img src="https://img.shields.io/badge/version-v1.0.1-blue.svg" alt="Version"></a>
    <a href="https://github.com/Enternatus/ITAC-K/actions"><img src="https://img.shields.io/badge/build-passing-success.svg" alt="Build Status"></a>
    <a href="configs/final_frozen.json"><img src="https://img.shields.io/badge/status-Frozen_Champion-success.svg" alt="Status"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License"></a>
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
*Note: All benchmark results reported below are generated from the Python simulation harness to evaluate algorithmic boundaries. The provided C++ ESP32 code is a proof-of-edge-capability implementation demonstrating that the O(1) state engine maps cleanly to real hardware memory constraints.*

## Final Results
| System | Mean Regret | Physical Probes | Recovery Delay | Peer Mismatch Regret |
| :--- | :--- | :--- | :--- | :--- |
| **ITAC-K (Frozen)** | **15,198.3** | **2,885.1** | **2.7s** | **14,191.8** |
| *Unqualified Remote* | *15,059.7* | *2,639.8* | *0.9s* | *48,500.2 (Cascade Failure)* |
| **LocalOnly** | 19,304.3 | 4,403.2 | 7.4s | 19,966.5 |
| **Generic VoI** | 20,035.6 | 4,500.0 | 8.9s | - |
| **DualControl** | 26,188.0 | 386.7 | 78.8s | 26,252.0 |

**Why Qualification Matters (Adversarial Breakdown):**
While *Unqualified Remote* achieves slightly lower *aggregate* regret across the entire benchmark, it suffers a catastrophic +240% regret explosion (48,500.2 vs 14,191.8) specifically during `Peer Mismatch` scenarios (where a peer occupies a physically contradictory state). The strict Context Equivalence Gate in ITAC-K sacrifices a marginal amount of aggregate regret to entirely prevent this adversarial cascade failure, making it a mandatory safety mechanism rather than an optimization.

## Ablations & Key Findings
*   **Safe Remote Substitution:** Outperformed LocalOnly by strictly filtering poisoned/mismatched swarm data via the equivalence gate.
*   **Boundary-Targeted Probing:** Outperformed the implemented Generic VoI baseline by focusing local probes strictly on overlapping policy confidence intervals.

## Limitations (Failure Envelope)
*   **Synchronized Spoofing:** ITAC-K lacks cryptographic spoofing filters. If malicious peers forge perfectly matching context vectors, poisoned data passes the gate.
*   **Hyper-Volatility Limit:** If the environment transitions faster than the sum of probe execution and propagation delays, uncertainty debt compounds uncontrollably.

## Reproduce the Results
A fresh environment can reproduce the reported simulation benchmark using the pinned dependencies and frozen configuration, subject to normal numerical/platform variation:
```bash
pip install -r requirements.txt
python benchmarks/run_benchmark.py --config configs/final_frozen.json --seeds 100-199
```

## Repository Structure
*   `/src/hardware/` - ESP32 C++ implementations (Proof of edge-capability).
*   `/benchmarks/` - Core Python simulation harness and baselines.
*   `/configs/` - The comprehensive, frozen benchmark parameters.
*   `/reports/` - Detailed ablation studies, architectural complexity bounds, and technical evidence.
*   `/results/final/` - The raw CSV/PNG outputs from the final evaluation.
