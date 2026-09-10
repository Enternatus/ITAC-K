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



