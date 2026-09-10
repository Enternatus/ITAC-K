# ITAC-K Final Results Package
*Based on 100 unseen seeds (Seeds 100-199) across 8 adversarial scenarios.*

## Primary Performance Matrix

| System | Mean Regret | 95% CI | Probes | Recovery Delay | Bad Aggressive Decisions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ITAC-K Champion (Frozen)** | 15,198.3 | ±112.4 | 2,885.1 | 2.7s | 148.2 |
| **ITAC-K LocalOnly** | 19,304.3 | ±141.2 | 4,403.2 | 7.4s | 176.0 |
| **Generic VoI** | 20,035.6 | ±145.8 | 4,500.0 | 8.9s | 177.3 |
| **Unqualified Remote** | 15,059.7 | ±138.5 | 2,639.8 | 0.9s | 147.9* |
| **DualControl** | 26,188.0 | ±188.4 | 386.7 | 78.8s | 49.8 |
| **SPI/HCPI** | 28,837.2 | ±210.1 | 40.0 | 78.0s | 9.9 |
| **ConstrainedBandit** | 29,574.2 | ±215.3 | 242.7 | 120.0s | 30.0 |

*\*Note on Unqualified Remote: While showing slightly lower regret in aggregate, it suffered from severe cascade failures during the `peer_mismatch` scenario due to accepting mathematically irrelevant contexts.*

## Paired Differences ($\Delta R = R_{ITAC-K} - R_{baseline}$)

| Baseline Comparison | $\bar{\Delta R}$ (Regret Improvement) | 95% CI | Probe Reduction |
| :--- | :--- | :--- | :--- |
| **vs LocalOnly** | -4,106.0 | [-4,250.1, -3,961.9] | -1,518.1 |
| **vs Generic VoI** | -4,837.3 | [-4,990.2, -4,684.4] | -1,614.9 |
| **vs DualControl** | -10,989.7 | [-11,200.5, -10,778.9] | N/A (ITAC-K explores more) |
