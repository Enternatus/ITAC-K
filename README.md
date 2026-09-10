<div align="center">
  <h1>ITAC-K</h1>
  <p><strong>A Bounded-State Distributed Physical Resource-Allocation Controller</strong></p>
  <p>
    <a href="https://github.com/Enternatus/ITAC-K/releases"><img src="https://img.shields.io/badge/version-v1.0.0-blue.svg" alt="Version"></a>
    <a href="configs/final_frozen.json"><img src="https://img.shields.io/badge/status-Frozen_Champion-success.svg" alt="Status"></a>
  </p>
</div>

## What is ITAC-K?
ITAC-K is a lightweight, distributed control architecture designed for physical edge nodes (e.g., ESP32 microcontrollers). It manages resource allocation and policy selection under highly uncertain, adversarial, and rapidly changing environmental regimes. 

## Problem
In highly volatile IoT environments (such as decentralized smart parking), local edge sensors must continuously decide which policy to apply. Relying entirely on local physical probing is slow and expends significant energy/latency. Conversely, blindly trusting peer nodes (swarm data) introduces catastrophic cascading failures when nodes occupy mismatched physical contexts.

## Core Idea
Instead of generic information-seeking, ITAC-K tracks the **admissibility boundary** between competing policies and targets physical evidence acquisition strictly to unresolved boundaries. Furthermore, ITAC-K features a strict **Equivalence Gate**, allowing nodes to bypass physical probes by safely accepting peer evidence *only* when the peer mathematically qualifies against strict context and regime thresholds.

## Architecture
The core system is built on (1)$ recursive state updates (with respect to stream length) and operates through the following pipeline:
1. **Six-State Volatility Engine** ({env}$)
2. **Predictive Reliability State**
3. **Policy-Admissibility Relation**
4. **Boundary-Directed Evidence Acquisition**
5. **Qualified Remote Evidence** (Context Equivalence Gating)
6. **Uncertainty Debt Tracking**

## Key Engineering Contributions
*   **Safe Remote Substitution:** Drops physical probing rates by mathematically filtering poisoned/mismatched swarm data.
*   **Boundary-Targeted Probing:** Focuses local probes strictly on overlapping policy confidence intervals, defeating generic Variance-of-Information (VoI) approaches.
*   **Bounded Edge Complexity:** Entirely recursive (1)$ state representation mapped cleanly to hardware (C++ ESP-NOW).

## Final Frozen Configuration
The validated champion configuration disables Hysteresis (to prevent lag in violent shock regimes) and utilizes the following tuned gates:
*   	ransfer_threshold: **0.80**
*   spi_margin: **0.15**
*   hysteresis: **OFF**

*(See configs/final_frozen.json for the immutable deployment state).*

## Final Results
*Validated on 100-seed unseen adversarial evaluation suite (Seeds 100-199).*

| System | Mean Regret | Physical Probes | Recovery Delay | Bad Aggressive Decisions |
| :--- | :--- | :--- | :--- | :--- |
| **ITAC-K (Frozen)** | **15,198.3** | **2,885.1** | **2.7s** | **148.2** |
| **LocalOnly** | 19,304.3 | 4,403.2 | 7.4s | 176.0 |
| **Generic VoI** | 20,035.6 | 4,500.0 | 8.9s | 177.3 |
| **DualControl** | 26,188.0 | 386.7 | 78.8s | 49.8 |

## Reproduce the Results
A fresh environment should be able to replicate these findings exactly:
1. Clone the repository.
2. Install dependencies: pip install -r requirements.txt
3. Run the frozen benchmark:
   `ash
   python benchmarks/run_benchmark.py --config configs/final_frozen.json --seeds 100-199
   `

## Repository Structure
*   /src/hardware/ - C++ ESP32 deployment code (sketch_ITAC_Swarm.ino).
*   /benchmarks/ - Core Python simulation harness and baselines.
*   /configs/ - The frozen and historical benchmark JSON parameters.
*   /reports/ - Detailed ablation, complexity, and patent-evidence documentation.
*   /results/final/ - The raw CSV/PNG outputs from the final evaluation.

## Limitations (Failure Envelope)
*   **Synchronized Spoofing:** ITAC-K lacks cryptographic spoofing filters. If malicious peers forge perfectly matching context vectors, poisoned data passes the gate.
*   **Hyper-Volatility Limit:** If the environment transitions faster than the sum of probe execution and propagation delays, uncertainty debt compounds uncontrollably.

## Citation
Please see CITATION.cff for citation metadata.

## License
*License pending explicit determination by owner.*
