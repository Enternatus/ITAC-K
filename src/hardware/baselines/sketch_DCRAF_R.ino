/*
  DCRAF-R (Dynamic Calibration and Risk-Adaptive Framework)
  A Dual-Uncertainty, Outcome-Calibrated Resource Allocation Architecture.
  O(1) Memory Implementation for ESP32.
*/

const int NUM_SLOTS = 3;

// ---- Pin mapping ----
int trigPins[NUM_SLOTS]  = {18, 19, 23};
int echoPins[NUM_SLOTS]  = {34, 14, 27};
int greenPins[NUM_SLOTS] = {16, 17, 21};
int redPins[NUM_SLOTS]   = {25, 33, 4};

// ---- Stage 1: Occupancy detection ----
const float PARKING_THRESHOLD_CM = 15.0;
const int   DEBOUNCE_SAMPLES = 3;
bool occupied[NUM_SLOTS]      = {false, false, false};
bool debounceBuf[NUM_SLOTS][DEBOUNCE_SAMPLES];
int  debounceIdx[NUM_SLOTS]   = {0, 0, 0};

// ---- Constants for O(1) Streaming Statistics ----
const float EMA_ALPHA   = 0.30;
const float ALPHA_MEAN  = 0.05;
const float ALPHA_VAR   = 0.05;
const float ALPHA_FAST  = 0.30;
const float ALPHA_SLOW  = 0.02;
const float ALPHA_CHURN = 0.10;
const float ALPHA_ERR   = 0.10;
const float ALPHA_CALIB = 0.10;

// Dual Uncertainty Channels
float slotMean[NUM_SLOTS]      = {0,0,0};
float slotVar[NUM_SLOTS]       = {0,0,0};
float slotFastEMA[NUM_SLOTS]   = {0,0,0};
float slotSlowEMA[NUM_SLOTS]   = {0,0,0};
float slotChurn[NUM_SLOTS]     = {0,0,0};

float predErrorEMA[NUM_SLOTS]  = {0,0,0}; // U_pred: Absolute error
float predBiasEMA[NUM_SLOTS]   = {0,0,0}; // U_pred: Directional bias
float calibErrorEMA[NUM_SLOTS] = {0,0,0}; // CE_t: Calibration error

unsigned long timeArrived[NUM_SLOTS] = {0,0,0};
float predictedDurationSec[NUM_SLOTS] = {60.0, 60.0, 60.0};
float lastPredictedDuration[NUM_SLOTS] = {60.0, 60.0, 60.0};
float lastConfidence[NUM_SLOTS] = {0.95, 0.95, 0.95};

// Global Risk & Regime State
float globalEnvVolatility = 0.0;
float globalPredUncertainty = 0.0;
float globalCalibError = 0.0;
float currentRisk = 0.0;

// Page-Hinkley Regime Detection
float ph_statistic = 0.0;
const float PH_DELTA = 0.1;
const float PH_LAMBDA = 2.0; // Threshold for regime shift
int currentRegime = 0; // 0: Stable, 1: Volatile, 2: Critical

// Policy Admissibility
int currentRiskTier = 3; // 1: Aggressive, 2: Risk-Averse, 3: Nearest-Neighbor
bool recommendedThisCycle[NUM_SLOTS] = {false, false, false};

// Hardware reading
float getDistance(int trig, int echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duration = pulseIn(echo, HIGH, 30000);
  if (duration == 0) return 999.0;
  return (duration * 0.0343) / 2.0;
}

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < NUM_SLOTS; i++) {
    pinMode(trigPins[i], OUTPUT);
    pinMode(echoPins[i], INPUT);
    pinMode(greenPins[i], OUTPUT);
    pinMode(redPins[i], OUTPUT);
    for(int d=0; d<DEBOUNCE_SAMPLES; d++) debounceBuf[i][d] = false;
  }
  Serial.println("[System] DCRAF-R Booted...");
}

void loop() {
  unsigned long currentMillis = millis();
  float totalEnvVol = 0.0;
  float totalPredUnc = 0.0;
  float totalCalibErr = 0.0;
  
  int numFree = 0;
  int freeSlots[NUM_SLOTS];

  for (int i = 0; i < NUM_SLOTS; i++) {
    recommendedThisCycle[i] = false;
    
    // 1. Read & Debounce
    float dist = getDistance(trigPins[i], echoPins[i]);
    bool rawOcc = (dist < PARKING_THRESHOLD_CM);
    debounceBuf[i][debounceIdx[i]] = rawOcc;
    debounceIdx[i] = (debounceIdx[i] + 1) % DEBOUNCE_SAMPLES;
    
    int occCount = 0;
    for(int d=0; d<DEBOUNCE_SAMPLES; d++) {
      if (debounceBuf[i][d]) occCount++;
    }
    
    bool newState = (occCount > (DEBOUNCE_SAMPLES / 2));
    bool stateChanged = (newState != occupied[i]);
    
    // Channel A: Update Environmental Volatility (Churn)
    slotChurn[i] += ALPHA_CHURN * ((stateChanged ? 1.0 : 0.0) - slotChurn[i]);
    
    if (stateChanged) {
      occupied[i] = newState;
      if (newState) {
        timeArrived[i] = currentMillis;
      } else {
        // --- OUTCOME FEEDBACK LOOP ---
        float actualSec = (currentMillis - timeArrived[i]) / 1000.0;
        
        // 1. Update U_pred (Predictive Unreliability)
        float error = actualSec - lastPredictedDuration[i];
        float absError = abs(error);
        predErrorEMA[i] += ALPHA_ERR * (absError - predErrorEMA[i]);
        predBiasEMA[i] += ALPHA_ERR * (error - predBiasEMA[i]);
        
        // 2. Update CE_t (Calibration Error)
        // If we were highly confident, but the absolute error was large, we are miscalibrated.
        float normalizedError = min(1.0f, absError / 60.0f); // Assuming 60s is a "large" error reference
        float expectedSuccess = lastConfidence[i];
        float observedSuccess = 1.0 - normalizedError;
        float calibErr = abs(expectedSuccess - observedSuccess);
        calibErrorEMA[i] += ALPHA_CALIB * (calibErr - calibErrorEMA[i]);

        // 3. Update V_env (Environmental Noise & Drift)
        slotMean[i] += ALPHA_MEAN * (actualSec - slotMean[i]);
        float errFromMean = actualSec - slotMean[i];
        slotVar[i] += ALPHA_VAR * ((errFromMean * errFromMean) - slotVar[i]);
        
        slotFastEMA[i] += ALPHA_FAST * (actualSec - slotFastEMA[i]);
        slotSlowEMA[i] += ALPHA_SLOW * (actualSec - slotSlowEMA[i]);
        
        // 4. Generate New Prediction
        predictedDurationSec[i] = (EMA_ALPHA * actualSec) + ((1.0 - EMA_ALPHA) * predictedDurationSec[i]);
        lastPredictedDuration[i] = predictedDurationSec[i];
        
        // 5. Generate New Confidence
        float cov = sqrt(slotVar[i]) / (slotMean[i] + 1.0); 
        float c = 1.0 - cov;
        lastConfidence[i] = max(0.1f, min(0.99f, c));
      }
    }
    
    if (occupied[i]) {
      digitalWrite(redPins[i], HIGH);
      digitalWrite(greenPins[i], LOW);
    } else {
      digitalWrite(redPins[i], LOW);
      digitalWrite(greenPins[i], HIGH);
      freeSlots[numFree++] = i;
    }
    
    // Aggregation for Global Risk
    float noiseScore = min(1.0f, sqrt(slotVar[i]) / 20.0f);
    float driftScore = min(1.0f, abs(slotFastEMA[i] - slotSlowEMA[i]) / 30.0f);
    float v_env = (0.35 * noiseScore) + (0.40 * slotChurn[i]) + (0.25 * driftScore);
    
    float u_pred = min(1.0f, predErrorEMA[i] / 30.0f);
    
    totalEnvVol += v_env;
    totalPredUnc += u_pred;
    totalCalibErr += calibErrorEMA[i];
  }
  
  globalEnvVolatility = totalEnvVol / NUM_SLOTS;
  globalPredUncertainty = totalPredUnc / NUM_SLOTS;
  globalCalibError = totalCalibErr / NUM_SLOTS;

  // --- Page-Hinkley Regime Detection ---
  float risk_signal = (0.5 * globalEnvVolatility) + (0.5 * globalPredUncertainty);
  float mu_risk = 0.2; // Baseline acceptable risk
  ph_statistic = max(0.0f, ph_statistic + (risk_signal - mu_risk - PH_DELTA));
  
  if (ph_statistic > PH_LAMBDA) {
      currentRegime = 2; // Critical
  } else if (ph_statistic > (PH_LAMBDA / 2.0)) {
      currentRegime = 1; // Volatile
  } else {
      currentRegime = 0; // Stable
  }
  
  // --- Asymmetric Risk Controller ---
  // Fast degradation, slow recovery
  float targetRisk = (0.4 * globalEnvVolatility) + (0.4 * globalPredUncertainty) + (0.2 * globalCalibError);
  if (targetRisk > currentRisk) {
      currentRisk += 0.20 * (targetRisk - currentRisk); // Fast entry into danger
  } else {
      currentRisk += 0.05 * (targetRisk - currentRisk); // Slow recovery
  }

  // --- Policy Admissibility Layer ---
  int chosenSlot = -1;
  String policyUsed = "NONE (Full)";
  
  if (numFree > 0) {
    int admissibleTier = 3;
    if (currentRisk < 0.3 && currentRegime == 0) admissibleTier = 1;      // Low risk, Stable
    else if (currentRisk < 0.6 && currentRegime <= 1) admissibleTier = 2; // Mod risk, Volatile
    else admissibleTier = 3;                                              // High risk or Critical
    
    currentRiskTier = admissibleTier;
    
    if (currentRiskTier == 1) { // P_A: Aggressive / Highest Efficiency
      float bestDur = 9999.0;
      for (int k = 0; k < numFree; k++) {
        int s = freeSlots[k];
        if (predictedDurationSec[s] < bestDur) {
          bestDur = predictedDurationSec[s];
          chosenSlot = s;
        }
      }
      policyUsed = "P_A (Efficiency)";
    } 
    else if (currentRiskTier == 2) { // P_B: Risk-Averse
      for (int k = 0; k < numFree; k++) {
        int s = freeSlots[k];
        if (predictedDurationSec[s] < 30.0) { chosenSlot = s; break; }
      }
      if (chosenSlot == -1) {
          chosenSlot = freeSlots[0];
          policyUsed = "P_B (Fallback)";
      } else {
          policyUsed = "P_B (Bounded)";
      }
    } 
    else { // P_C: Safe Fallback
      chosenSlot = freeSlots[0];
      policyUsed = "P_C (Nearest Fallback)";
    }
  }

  // --- Serial Output ---
  Serial.println("---------------------------------------------------");
  Serial.print("V_env: "); Serial.print(globalEnvVolatility, 2);
  Serial.print(" | U_pred: "); Serial.print(globalPredUncertainty, 2);
  Serial.print(" | CE_t: "); Serial.print(globalCalibError, 2);
  Serial.println();
  Serial.print("Regime: "); Serial.print(currentRegime);
  Serial.print(" (PH: "); Serial.print(ph_statistic, 2);
  Serial.print(") | Risk Budget: "); Serial.print(currentRisk, 2);
  Serial.println();
  Serial.print("Policy Admitted: "); Serial.print(policyUsed);
  if (chosenSlot != -1) {
    Serial.print(" => Assigned Slot: "); Serial.println(chosenSlot + 1);
  }
  
  delay(2000);
}
