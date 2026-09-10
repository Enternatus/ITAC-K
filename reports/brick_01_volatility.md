# Phase 1: Volatility Engine

| Configuration | Regret | Recovery | Switches | Probes |
| :--- | :--- | :--- | :--- | :--- |
| **Baseline (Greedy)** | 5,724.6 | N/A | Low | 0 |
| **+ V_env** | 2,217.0 | Fast | Med | 114 |
| **+ U_pred** | ~2,100 | Fast | Med | 140 |

**Conclusion:** The underlying DCRAF-R volatility engine ($V_{env}$) is highly effective at reducing regret (from 5.7k down to 2.2k) by injecting exploration during state transitions. It is actively helping.
