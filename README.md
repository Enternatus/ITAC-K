# ITAC-K: Distributed Physical Resource Allocation Controller

## Overview
ITAC-K is a bounded-state distributed physical resource-allocation controller. It maintains uncertainty over the admissibility relationship between competing control policies, identifies unresolved decision-relevant policy boundaries, and selectively acquires evidence targeted to those boundaries through feasible local service actions or context-qualified evidence originating from peer nodes.

## Final Frozen Result (v1.0.0)
Based on 100-seed unseen adversarial validation:
- **Regret:** 15,198.3
- **Physical Probes:** 2,885.1
- **Recovery Delay:** 2.7 s

## Repository Structure
- src/hardware/: ESP32 C++ implementation for edge deployment.
- benchmarks/: Python simulation harness (run_benchmark.py).
- configs/: Frozen benchmark parameters.
- reports/: Ablation studies, brick-by-brick analysis, and patent evidence mapping.
- docs/: Architecture workflow and reproducibility guides.

## Reproducibility
Run python benchmarks/run_benchmark.py --config configs/final_frozen.json
