# ITAC-K Architecture

<div align="center">
  <img src="../figures/ITAC_K_Architecture_Flow.jpg" alt="ITAC-K Architecture Diagram" width="100%" />
</div>

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

## Mechanism Status Tracker
*   **Volatility Engine:** ACTIVE + VALIDATED
*   **Policy-Admissibility Relation:** ACTIVE + VALIDATED
*   **Boundary-Targeted Probing:** ACTIVE + VALIDATED
*   **Qualified Remote Evidence:** ACTIVE + VALIDATED
*   **Uncertainty Debt:** ACTIVE + NOT SEPARATELY ABLATED
*   **Kinematic Urgency:** ACTIVE + VALIDATED (Neutral effect in tested shocks)
*   **Anti-Herding (Saturation):** IMPLEMENTED BUT OPTIONAL
*   **Hysteresis:** EVALUATED AND DISABLED (Disabled in Final Champion)

## Mathematical Definitions
*   $\phi(p_{ij,t})$: A distance metric representing the probability of policy boundary intersection.
*   $A_{ij,t}$: The action-cost penalty for probing policy $j$ when $i$ is currently optimal.
*   $I_{ij,t}$: Information gain metric representing the expected variance reduction of the boundary estimator.

## Simulation vs ESP32 Implementation Mapping
| Simulation Component | ESP32 Implementation (sketch_ITAC_Swarm.ino) |
| :--- | :--- |
| Volatility update | `updateVolatility()` |
| Admissibility state | `evalAdmissibility()` |
| Remote certificate | `struct PeerEvidence` |
| Equivalence Gate | `qualifyEvidence()` |
| ESP-NOW transport | `OnDataRecv() / esp_now_send()` |
