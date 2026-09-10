# ITAC-K Failure Envelope

This document defines the operating boundaries of the ITAC-K architecture, specifically detailing where the system struggles and under what conditions the mechanisms fail to provide a principled advantage.

### 1. Synchronized Spoofing under Context Mismatch
**Condition:** If a majority of peer nodes occupy a different true regime but mathematically spoof or accidentally broadcast a $S_{context} \ge 0.80$ (passing the Equivalence Gate).
**Outcome:** The gate admits poisoned certificates. ITAC-K updates its policy-admissibility boundaries using invalid data, leading to aggressive decisions that incur high local regret. 
**Why it fails:** The controller trusts the context representation. It has no secondary cryptographic or temporal-correlation filter to detect synchronized spoofing once the context vector matches.

### 2. Hyper-Volatile Environments ($f_{volatility} > K$)
**Condition:** The true optimal policy changes faster than the physical probe cooldown and the network propagation delay.
**Outcome:** Uncertainty debt compounds instantly. The controller forces probes, but the environment shifts before the evidence can resolve the boundary. Recovery delay approaches infinity.
**Why it fails:** ITAC-K assumes that the period of stability is at least marginally longer than the time required to acquire evidence. It degrades into random behavior when stability falls below this threshold.

### 3. Starvation under Zero-Overlap Confidence
**Condition:** The predictive engine is temporarily highly confident in the wrong policy (e.g., due to a rare, perfectly adversarial noise sequence).
**Outcome:** Confidence intervals do not overlap. The `spi_margin` threshold is never breached, boundary-directed probing is entirely suppressed, and the system exploits the wrong policy until the environmental volatility engine ($V_{env}$) eventually overrides it via the $\ddot{V}$ shock trigger.
**Why it fails:** The admissibility boundary logic is inherently conservative regarding physical probing. If predictions are confidently wrong and the environment appears stable, it will not probe.
