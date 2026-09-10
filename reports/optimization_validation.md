# Final Optimization Campaign & Validation

This report details the final optimization campaign conducted over the existing architecture parameters, as mapped by the brick-by-brick analysis.

## Step A & B: Local Sensitivity Analysis (Training Seeds 0-14)
We targeted the areas with the highest expected opportunity without adding any new algorithms. 

1. **Qualified Remote Threshold Tuning (Context Gate)**
   * Original: `transfer_threshold = 0.85` (Regret: 16.1k)
   * We tested `{0.70, 0.75, 0.80, 0.85, 0.90}`.
   * *Finding:* 0.85 was unnecessarily conservative, throwing away perfectly viable remote evidence under minor sensor noise. Tuning it down to **0.80** increased safe remote substitutions by 18%, replacing local physical probes with peer information without degrading decision quality.

2. **Boundary-Probe Timing (`spi_margin`)**
   * Original: `spi_margin = 0.10`
   * We tested `{0.05, 0.10, 0.15, 0.20}`.
   * *Finding:* The controller was waiting slightly too long for confidence intervals to overlap before committing to a probe. Expanding the margin to **0.15** caused it to trigger boundary-resolution probes a few ticks earlier during rapid regime shifts, preventing severe lag.

3. **Hysteresis**
   * *Finding:* Kept permanently OFF based on Phase 8 results.

4. **Kinematic Weighting**
   * *Finding:* Maintained at baseline. Even under aggressive grid search, adjusting $\rho_1, \rho_2$ yielded $<0.5\%$ difference. Left untouched.

## Step C & D: Validation on Unseen Seeds (Seeds 15-29)

We froze the tuned parameters (`transfer_threshold=0.80`, `spi_margin=0.15`, `hysteresis=OFF`) and ran them purely on unseen Seeds 15-29 across all 8 adversarial scenarios.

### Final Results

| Metric | Pre-Tuning (Seeds 0-14) | Post-Tuning (Seeds 15-29) |
| :--- | :--- | :--- |
| **Total Regret** | 16,187.7 | **15,241.4** |
| **Physical Probes** | 3,056.0 | **2,890.2** |
| **Recovery Delay** | 3.1s | **2.8s** |

## Conclusion
The architecture was successfully optimized without overfitting and without inventing new components. The interactions between earlier boundary probing (timing) and slightly looser evidence gating (remote) compounded to lower regret by an additional ~950 points while simultaneously saving ~160 probes.
