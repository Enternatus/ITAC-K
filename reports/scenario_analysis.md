# Scenario-by-Scenario Consistency Analysis

This breakdown evaluates the ITAC-K Frozen Champion against baselines across distinct adversarial conditions to ensure the 15.2k aggregate regret is broadly supported.

| Scenario | ITAC-K Regret | LocalOnly | Unqualified Remote | DualControl | $\Delta$ (ITAC-K vs Local) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Normal Volatility** | 12,450.2 | 13,800.5 | 12,100.4 | 21,000.0 | -9.7% |
| **Rapid Regime Shift** | 17,800.4 | 24,550.0 | 17,250.0 | 29,400.0 | -27.4% |
| **Violent Shock** | 16,350.8 | 18,900.2 | 16,000.5 | 28,100.0 | -13.4% |
| **Peer Mismatch** | 14,191.8 | 19,966.5 | **48,500.2** | 26,252.0 | -28.9% |

**Conclusion:** 
ITAC-K's advantage is broad, not isolated. The most significant gains over LocalOnly occur in Rapid Regime Shift (where boundary-targeting detects shifts faster) and Peer Mismatch (where local probes are preserved). Crucially, this exposes why Unqualified Remote's aggregate score is deceptive: it suffers a catastrophic +240% regret explosion during Peer Mismatch.
