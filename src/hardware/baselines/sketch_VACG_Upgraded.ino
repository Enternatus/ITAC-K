/*
  DCRAF - Smart Parking Prototype
  Volatility-Aware Confidence Gating (VACG) Architecture
  ------------------------------------------------------------------
  Implements all 6 DCRAF stages for a 3-slot prototype.
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

// ---- Stage 2: Availability prediction (EMA) ----
const float EMA_ALPHA = 0.3;
unsigned long timeArrived[NUM_SLOTS] = {0, 0, 0};
float predictedDurationSec[NUM_SLOTS] = {60.0, 60.0, 60.0};

// ---- Stage 3: VACG Volatility Engine ----
const float ALPHA_MEAN  = 0.05;
const float ALPHA_VAR   = 0.05;
const float ALPHA_FAST  = 0.30;
const float ALPHA_SLOW  = 0.02;
const float ALPHA_CHURN = 0.10;

const float NOISE_REF = 20.0;
const float DRIFT_REF = 30.0;

float slotMean[NUM_SLOTS]    = {0, 0, 0};
float slotVar[NUM_SLOTS]     = {0, 0, 0};
float slotFastEMA[NUM_SLOTS] = {0, 0, 0};
float slotSlowEMA[NUM_SLOTS] = {0, 0, 0};
float slotChurn[NUM_SLOTS]   = {0, 0, 0};

float globalVolatility = 0.0;

// ---- Stage 4: Confidence estimation ----
float confidences[NUM_SLOTS] = {0.95, 0.95, 0.95};

// ---- Stage 6: Mutual exclusion ----
bool recommendedThisCycle[NUM_SLOTS] = {false, false, false};

// ---- Stage 5: Hysteresis State ----
int currentPolicyTier = 3; // 1: Aggressive, 2: Risk-Averse, 3: Nearest-Neighbor
const float HYSTERESIS_MARGIN = 0.05;

// Hardware reading
float getDistance(int trig, int echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duration = pulseIn(echo, HIGH, 30000); // 30ms timeout
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
  Serial.println("[System] DCRAF VACG Engine Booted...");
}

void loop() {
  unsigned long currentMillis = millis();
  float totalVol = 0.0;
  int numFree = 0;
  int freeSlots[NUM_SLOTS];
  float avgConfidence = 0.0;

  for (int i = 0; i < NUM_SLOTS; i++) {
    recommendedThisCycle[i] = false;
    
    // 1. Read & Debounce
    float dist = getDistance(trigPins[i], echoPins[i]);
    Serial.print(">>> DEBUG: Sensor "); Serial.print(i+1); Serial.print(" Raw Distance: "); Serial.print(dist); Serial.println(" cm");
    
    bool rawOcc = (dist < PARKING_THRESHOLD_CM);
    debounceBuf[i][debounceIdx[i]] = rawOcc;
    debounceIdx[i] = (debounceIdx[i] + 1) % DEBOUNCE_SAMPLES;
    
    int occCount = 0;
    for(int d=0; d<DEBOUNCE_SAMPLES; d++) {
      if (debounceBuf[i][d]) occCount++;
    }
    
    bool newState = (occCount > (DEBOUNCE_SAMPLES / 2));
    bool stateChanged = (newState != occupied[i]);
    
    // Update Churn
    slotChurn[i] += ALPHA_CHURN * ((stateChanged ? 1.0 : 0.0) - slotChurn[i]);
    
    if (stateChanged) {
      occupied[i] = newState;
      if (newState) {
        timeArrived[i] = currentMillis;
      } else {
        float actualSec = (currentMillis - timeArrived[i]) / 1000.0;
        predictedDurationSec[i] = (EMA_ALPHA * actualSec) + ((1.0 - EMA_ALPHA) * predictedDurationSec[i]);
        
        slotMean[i] += ALPHA_MEAN * (actualSec - slotMean[i]);
        float err = actualSec - slotMean[i];
        slotVar[i] += ALPHA_VAR * ((err * err) - slotVar[i]);
        
        slotFastEMA[i] += ALPHA_FAST * (actualSec - slotFastEMA[i]);
        slotSlowEMA[i] += ALPHA_SLOW * (actualSec - slotSlowEMA[i]);
        
        float stddev = sqrt(slotVar[i]);
        // Bounded Dispersion Confidence Score (using Coefficient of Variation)
        float cov = stddev / (slotMean[i] + 1.0); 
        float c = 1.0 - cov;
        if (c < 0.1) c = 0.1;
        if (c > 0.99) c = 0.99;
        confidences[i] = c;
      }
    }
    
    // Update LEDs
    if (occupied[i]) {
      digitalWrite(redPins[i], HIGH);
      digitalWrite(greenPins[i], LOW);
    } else {
      digitalWrite(redPins[i], LOW);
      digitalWrite(greenPins[i], HIGH);
      freeSlots[numFree++] = i;
      avgConfidence += confidences[i];
    }
    
    // Calculate Slot Volatility
    float noiseScore = sqrt(slotVar[i]) / NOISE_REF;
    if (noiseScore > 1.0) noiseScore = 1.0;
    float driftScore = abs(slotFastEMA[i] - slotSlowEMA[i]) / DRIFT_REF;
    if (driftScore > 1.0) driftScore = 1.0;
    float v = (0.35 * noiseScore) + (0.40 * slotChurn[i]) + (0.25 * driftScore);
    totalVol += v;
  }
  
  globalVolatility = totalVol / NUM_SLOTS;
  if (numFree > 0) avgConfidence /= numFree;
  else avgConfidence = 0.95;

  // 5. Policy Switch
  int chosenSlot = -1;
  String policyUsed = "NONE (Full)";
  
  if (numFree > 0) {
    float dynamic_T_high = 0.88 + (0.10 * globalVolatility * globalVolatility);
    float dynamic_T_low  = 0.75 + (0.10 * globalVolatility);
    if (dynamic_T_high > 0.98) dynamic_T_high = 0.98;
    
    // Determine Target Tier with Hysteresis
    int targetTier = 3;
    if (currentPolicyTier == 1) {
      if (avgConfidence < dynamic_T_high - HYSTERESIS_MARGIN) {
        targetTier = (avgConfidence >= dynamic_T_low) ? 2 : 3;
      } else {
        targetTier = 1;
      }
    } else if (currentPolicyTier == 2) {
      if (avgConfidence >= dynamic_T_high + HYSTERESIS_MARGIN) targetTier = 1;
      else if (avgConfidence < dynamic_T_low - HYSTERESIS_MARGIN) targetTier = 3;
      else targetTier = 2;
    } else { // Tier 3
      if (avgConfidence >= dynamic_T_high + HYSTERESIS_MARGIN) targetTier = 1;
      else if (avgConfidence >= dynamic_T_low + HYSTERESIS_MARGIN) targetTier = 2;
      else targetTier = 3;
    }
    currentPolicyTier = targetTier;
    
    if (currentPolicyTier == 1) {
      float bestScore = -1.0;
      for (int k = 0; k < numFree; k++) {
        int s = freeSlots[k];
        float score = 1.0 / (predictedDurationSec[s] + 1.0);
        if (score > bestScore && !recommendedThisCycle[s]) {
          bestScore = score;
          chosenSlot = s;
        }
      }
      policyUsed = "5a AGGRESSIVE-OPTIMAL";
    } 
    else if (currentPolicyTier == 2) {
      for (int k = 0; k < numFree; k++) {
        int s = freeSlots[k];
        if (!recommendedThisCycle[s] && predictedDurationSec[s] < 30.0) { 
          chosenSlot = s; 
          break; 
        }
      }
      if (chosenSlot == -1) {
        for (int k = 0; k < numFree; k++) {
          int s = freeSlots[k];
          if (!recommendedThisCycle[s]) { chosenSlot = s; break; }
        }
        policyUsed = "5b RISK-AVERSE (Fallback)";
      } else {
        policyUsed = "5b RISK-AVERSE";
      }
    } 
    else {
      for (int k = 0; k < numFree; k++) {
        int s = freeSlots[k];
        if (!recommendedThisCycle[s]) { chosenSlot = s; break; }
      }
      policyUsed = "5c NEAREST-NEIGHBOR";
    }
    if (chosenSlot != -1) recommendedThisCycle[chosenSlot] = true;
  }

  // 6. Serial Output
  Serial.println("---------------------------------------------------");
  Serial.print("Global Volatility Index: "); Serial.println(globalVolatility, 3);
  for (int i = 0; i < NUM_SLOTS; i++) {
    Serial.print("Slot "); Serial.print(i + 1);
    Serial.print(" | "); Serial.print(occupied[i] ? "OCCUPIED" : "FREE");
    Serial.print(" | predDur="); Serial.print(predictedDurationSec[i], 1);
    Serial.print("s | conf="); Serial.print(confidences[i], 2);
    Serial.println();
  }
  Serial.print("Avg free conf: "); Serial.print(avgConfidence, 2);
  Serial.print(" | Policy: "); Serial.println(policyUsed);
  if (chosenSlot != -1) {
    Serial.print("=> RECOMMENDATION: Slot "); Serial.println(chosenSlot + 1);
  }
  
  delay(2000);
}
