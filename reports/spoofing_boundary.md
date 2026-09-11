# Security & Peer-Spoofing Boundary

This experiment tests the strict difference between Context Qualification and Cryptographic Authentication.

| Adversarial Condition | Gate Action | Regret Impact |
| :--- | :--- | :--- |
| **Legitimate Matching Peer** | Accepted | -12% Regret (Expected benefit) |
| **Legitimate Mismatched Peer** | Rejected | 0% (Protected by Equivalence Gate) |
| **Forged Matching Peer (Spoof)** | **Accepted** | **+185% Regret (Catastrophic)** |

**Conclusion:**
ITAC-K successfully filters out accidental or environmental peer mismatch (context qualification). It **fails** against an actively malicious peer that deliberately forges a valid Context Hash and Regime ID. The Equivalence Gate is an environmental filter, not a cryptographic security boundary.
