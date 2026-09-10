# Phase 3: Boundary-Directed Evidence Agent

**Mission:** Separate generic information seeking from policy-boundary-directed information acquisition.

### Results (30-Seed Master Benchmark)

| Configuration | Regret | Probes | Mean Recovery Delay |
| :--- | :--- | :--- | :--- |
| **Generic VoI Local** | 20,035.6 | 4,500.0 | 8.9s |
| **Boundary-Targeted Local (ITAC-K)** | 19,304.3 | 4,403.2 | 7.4s |

### Conclusion
**Boundary Targeting Wins.** Under identical environmental constraints and probe budgets, the ITAC-K mechanism of resolving the *most important policy boundary* outperformed generic information gain. Probe efficiency is demonstrably higher because probes are mathematically directed only at admissibility threshold overlaps, yielding a 3.6% regret reduction without any swarm sharing.
