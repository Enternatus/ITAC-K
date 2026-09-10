# Benchmark Integrity Report

| Check | Status | Evidence |
| :--- | :--- | :--- |
| **Probe counting** | PASS | Validated in Python tests; counters accurately reflect active exploration by baselines. |
| **Reward calculation** | PASS | `regret = max(0.0, obs - e.oracle_cost)` applied uniformly. |
| **Seed reproducibility** | PASS | NumPy and generic random seeds initialized securely at the start of each run. |
| **Information leakage** | PASS | No future information passed to baselines or ITAC-K. |
| **Baseline fairness** | PASS | DualControl and GenericEIG weights tuned to actively explore; all receive identical observations. |
