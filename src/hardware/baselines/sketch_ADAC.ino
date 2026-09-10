/*
  ADAC (Admissibility-Directed Active Calibration) + DCRAF-R
  A Dual-Uncertainty, Active-Probing Resource Allocation Architecture.
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

float predErrorEMA[NUM_SLOTS]  = {0,0,0};
float predBiasEMA[NUM_SLOTS]   = {0,0,0}; 
float calibErrorEMA[NUM_SLOTS] = {0,0,0};

unsigned long timeArrived[NUM_SLOTS] = {0,0,0};
float predictedDurationSec[NUM_SLOTS] = {60.0, 60.0, 60.0};
float lastPredictedDuration[NUM_SLOTS] = {60.0, 60.0, 60.0};

// Intervals (For Policy Boundary Ambiguity)
float slotMargin[NUM_SLOTS] = {10.0, 10.0, 10.0};

// Global Risk & Regime State
float globalEnvVolatility = 0.0;
float globalPredUncertainty = 0.0;
float globalCalibError = 0.0;

// --- ADAC Uncertainty Debt State ---
float uncertaintyDebt = 0.0;
const float MAX_DEBT = 50.0; // Max permitted exploitation while unresolved
const float ALPHA_DEBT = 1.0;
const float BETA_DEBT = 1.5; // Reward for gaining information

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
  Serial.println("[System] ADAC + DCRAF-R Booted...");
}

void loop() {
  unsigned long currentMillis = millis();
  float totalEnvVol = 0.0;
  float totalPredUnc = 0.0;
  float totalCalibErr = 0.0;
  
  int numFree = 0;
  int freeSlots[NUM_SLOTS];

  for (int i = 0; i < NUM_SLOTS; i++) {
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
        
        // Update U_pred
        float error = actualSec - lastPredictedDuration[i];
        float absError = abs(error);
        predErrorEMA[i] += ALPHA_ERR * (absError - predErrorEMA[i]);
        
        // ADAC: Pay down Uncertainty Debt because we gained information
        // We reduce debt proportionally to the uncertainty we just resolved
        float infoGain = slotMargin[i]; 
        uncertaintyDebt = max(0.0f, uncertaintyDebt - (BETA_DEBT * infoGain));

        // Update V_env
        slotMean[i] += ALPHA_MEAN * (actualSec - slotMean[i]);
        float errFromMean = actualSec - slotMean[i];
        slotVar[i] += ALPHA_VAR * ((errFromMean * errFromMean) - slotVar[i]);
        
        // Generate New Prediction
        predictedDurationSec[i] = (EMA_ALPHA * actualSec) + ((1.0 - EMA_ALPHA) * predictedDurationSec[i]);
        lastPredictedDuration[i] = predictedDurationSec[i];
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
    
    // Calculate node-level risk components
    float noiseScore = min(1.0f, sqrt(slotVar[i]) / 20.0f);
    float v_env = (0.35 * noiseScore) + (0.40 * slotChurn[i]);
    float u_pred = min(1.0f, predErrorEMA[i] / 30.0f);
    
    // Update interval margin based on combined uncertainty
    // High uncertainty = wide interval margin
    slotMargin[i] = 5.0 + (30.0 * v_env) + (30.0 * u_pred);
    
    totalEnvVol += v_env;
    totalPredUnc += u_pred;
  }
  
  globalEnvVolatility = totalEnvVol / NUM_SLOTS;
  globalPredUncertainty = totalPredUnc / NUM_SLOTS;

  // --- ADAC Action Selection Layer ---
  int chosenSlot = -1;
  String adacMode = "IDLE";
  
  if (numFree > 0) {
    // 1. Find Best and Second Best (Optimization view)
    int bestIdx = freeSlots[0];
    int secondBestIdx = -1;
    for (int k = 1; k < numFree; k++) {
      int s = freeSlots[k];
      if (predictedDurationSec[s] < predictedDurationSec[bestIdx]) {
        secondBestIdx = bestIdx;
        bestIdx = s;
      } else if (secondBestIdx == -1 || predictedDurationSec[s] < predictedDurationSec[secondBestIdx]) {
        secondBestIdx = s;
      }
    }
    
    // 2. Check Policy Boundary Ambiguity
    bool boundaryAmbiguous = false;
    if (secondBestIdx != -1) {
      float U_best = predictedDurationSec[bestIdx] + slotMargin[bestIdx];
      float L_second = predictedDurationSec[secondBestIdx] - slotMargin[secondBestIdx];
      // M_ij = L_j - U_i
      float M_ij = L_second - U_best;
      
      if (M_ij <= 0) { // Intervals overlap!
        boundaryAmbiguous = true;
      }
    }
    
    // 3. Resolve ADAC Logic
    if (boundaryAmbiguous) {
      if (uncertaintyDebt >= MAX_DEBT) {
        // MUST PROBE: We have exploited too much. We must actively select the action 
        // that gives us the most information to resolve the boundary.
        // We pick the slot with the HIGHEST uncertainty margin to collapse it.
        int probeIdx = bestIdx;
        if (secondBestIdx != -1 && slotMargin[secondBestIdx] > slotMargin[bestIdx]) {
          probeIdx = secondBestIdx;
        }
        chosenSlot = probeIdx;
        adacMode = "PROBE (Resolve Ambiguity)";
      } else {
        // EXPLOIT WITH DEBT: We are uncertain, but we have budget to take the risk.
        // We pick the best prediction, but we accrue debt.
        chosenSlot = bestIdx;
        float overlapAmount = abs((predictedDurationSec[bestIdx] + slotMargin[bestIdx]) - (predictedDurationSec[secondBestIdx] - slotMargin[secondBestIdx]));
        uncertaintyDebt = min(MAX_DEBT, uncertaintyDebt + (ALPHA_DEBT * overlapAmount));
        adacMode = "EXPLOIT (Accruing Debt)";
      }
    } else {
      // CLEAR BOUNDARY: Safely exploit
      chosenSlot = bestIdx;
      adacMode = "EXPLOIT (Clear Boundary)";
    }
  }

  // --- Serial Output ---
  Serial.println("---------------------------------------------------");
  Serial.print("V_env: "); Serial.print(globalEnvVolatility, 2);
  Serial.print(" | U_pred: "); Serial.print(globalPredUncertainty, 2);
  Serial.print(" | Uncertainty Debt: "); Serial.print(uncertaintyDebt, 1);
  Serial.print(" / "); Serial.println(MAX_DEBT, 1);
  Serial.println("--- Slot Intervals ---");
  for (int i = 0; i < NUM_SLOTS; i++) {
    Serial.print("Slot "); Serial.print(i + 1);
    Serial.print(": ["); Serial.print(predictedDurationSec[i] - slotMargin[i], 1);
    Serial.print("s - "); Serial.print(predictedDurationSec[i] + slotMargin[i], 1);
    Serial.print("s] (Occupied: "); Serial.print(occupied[i]); Serial.println(")");
  }
  Serial.print("=> ADAC Action: "); Serial.print(adacMode);
  if (chosenSlot != -1) {
    Serial.print(" -> Slot "); Serial.println(chosenSlot + 1);
  }
  
  delay(2000);
}
