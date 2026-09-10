/*
  ITAC-K: Boundary-Directed Distributed Uncertainty Resolution
  Filing-Ready Embedded Implementation (O(1) Recursive State)
  
  Features:
  - 6-State DCRAF-R Estimators
  - Risk Kinematics (Debt Interest)
  - Pairwise Policy-Boundary Debt (D_ij)
  - Remote Experiment Substitution (Evidence Certificates)
  - Exploit / Local Probe / Remote Substitute State Machine
*/

#include <esp_now.h>
#include <WiFi.h>
#include <math.h>

const int NUM_SLOTS = 3;
const int NUM_POLICIES = 3; 
// P0 = Aggressive, P1 = Balanced, P2 = Safe
const int NUM_PAIRS = 3; // (0,1), (0,2), (1,2)

// ---- Pin mapping ----
int trigPins[NUM_SLOTS]  = {18, 19, 23};
int echoPins[NUM_SLOTS]  = {34, 14, 27};
int greenPins[NUM_SLOTS] = {16, 17, 21};
int redPins[NUM_SLOTS]   = {25, 33, 4};

// ---- Stage 1: Occupancy & Debounce ----
const float PARKING_THRESHOLD_CM = 15.0;
const int   DEBOUNCE_SAMPLES = 3;
bool occupied[NUM_SLOTS]      = {false, false, false};
bool debounceBuf[NUM_SLOTS][DEBOUNCE_SAMPLES];
int  debounceIdx[NUM_SLOTS]   = {0, 0, 0};

// ---- 6-State Estimators (O(1) Recursive) ----
const float ALPHA_N = 0.05; // Dispersion
const float ALPHA_C = 0.10; // Churn
const float ALPHA_E = 0.10; // Error
const float ALPHA_B = 0.05; // Bias
const float ALPHA_CE = 0.05; // Calibration

float V_dispersion[NUM_SLOTS] = {0};
float V_churn[NUM_SLOTS] = {0};
float V_drift[NUM_SLOTS] = {0}; // fast/slow EMA divergence

float U_error[NUM_SLOTS] = {0};
float U_bias[NUM_SLOTS] = {0};
float U_calibration[NUM_SLOTS] = {0};

float predictedDuration[NUM_SLOTS] = {60.0, 60.0, 60.0};
unsigned long timeArrived[NUM_SLOTS] = {0,0,0};

// ---- Risk Kinematics ----
float V_env = 0.0, prev_V_env = 0.0;
float V_vel = 0.0, prev_V_vel = 0.0;
float V_acc = 0.0;

// ---- Pairwise Policy-Boundary State ----
float D_ij[NUM_PAIRS] = {0.0, 0.0, 0.0}; // Policy-specific uncertainty debt
float S_ij[NUM_PAIRS] = {0.0, 0.0, 0.0}; // Information saturation (Anti-herding)
const float MAX_DEBT = 50.0;
const float RHO_1 = 5.0; // Velocity interest rate
const float RHO_2 = 15.0; // Acceleration interest rate

// ---- Swarm Evidence Certificate ----
uint8_t broadcastAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

typedef struct EvidenceCertificate {
    uint8_t sourceNode;
    uint8_t policyPair; // 0=(0,1), 1=(0,2), 2=(1,2)
    uint32_t contextHash; // V_env, Regime, etc.
    uint8_t regimeID;
    float boundaryInfoCredit; // KL-derived information
    unsigned long timestamp;
    float sourceReliability;
} EvidenceCertificate;

EvidenceCertificate outgoingCert;
EvidenceCertificate incomingCert;

bool hasQualifiedPeerEvidence[NUM_PAIRS] = {false, false, false};
float peerInfoCredit[NUM_PAIRS] = {0.0, 0.0, 0.0};

// ---- Core Utility ----
float getDistance(int trig, int echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duration = pulseIn(echo, HIGH, 30000);
  if (duration == 0) return 999.0;
  return (duration * 0.0343) / 2.0;
}

// Generate a simple O(1) context hash based on current kinematics and regime
uint32_t generateContextHash() {
  return (uint32_t)(V_env * 100) ^ (uint32_t)(V_acc * 1000);
}

// ---- ESP-NOW Callbacks ----
void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {}

void OnDataRecv(const uint8_t * mac, const uint8_t *incomingData, int len) {
  memcpy(&incomingCert, incomingData, sizeof(incomingCert));
  
  // 1. Context Similarity & Freshness Evaluation
  uint32_t localHash = generateContextHash();
  float contextSimilarity = (localHash == incomingCert.contextHash) ? 1.0f : 0.5f; // Simplified sim
  float freshness = 1.0f; // Simplified (assume fresh on receipt)
  
  // 2. Transferable Information Test
  float Q_transfer = incomingCert.sourceReliability * contextSimilarity * freshness;
  
  // 3. Information Saturation (Anti-herding)
  int pair = incomingCert.policyPair;
  S_ij[pair] = (0.5 * S_ij[pair]) + incomingCert.boundaryInfoCredit; // Recursive saturation
  float marginalCredit = incomingCert.boundaryInfoCredit / (1.0 + S_ij[pair]); // Diminishing returns
  
  float actualCredit = Q_transfer * marginalCredit;
  
  if (actualCredit > 1.0f) { // Substitution Threshold
    hasQualifiedPeerEvidence[pair] = true;
    peerInfoCredit[pair] = actualCredit;
    Serial.printf("[SWARM] Qualified Peer Evidence rx for boundary %d. Credit: %.2f\n", pair, actualCredit);
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  esp_now_init();
  esp_now_register_send_cb(OnDataSent);
  esp_now_peer_info_t peerInfo;
  memcpy(peerInfo.peer_addr, broadcastAddress, 6);
  peerInfo.channel = 0; peerInfo.encrypt = false;
  esp_now_add_peer(&peerInfo);
  esp_now_register_recv_cb(OnDataRecv);

  for (int i = 0; i < NUM_SLOTS; i++) {
    pinMode(trigPins[i], OUTPUT); pinMode(echoPins[i], INPUT);
    pinMode(greenPins[i], OUTPUT); pinMode(redPins[i], OUTPUT);
  }
}

void loop() {
  unsigned long currentMillis = millis();
  float currentTotalChurn = 0.0;
  int numFree = 0;
  int freeSlots[NUM_SLOTS];

  // 1. PHYSICAL OBSERVATION & 6-STATE ESTIMATION
  for (int i = 0; i < NUM_SLOTS; i++) {
    float dist = getDistance(trigPins[i], echoPins[i]);
    bool rawOcc = (dist < PARKING_THRESHOLD_CM);
    debounceBuf[i][debounceIdx[i]] = rawOcc;
    debounceIdx[i] = (debounceIdx[i] + 1) % DEBOUNCE_SAMPLES;
    
    int occCount = 0;
    for(int d=0; d<DEBOUNCE_SAMPLES; d++) if (debounceBuf[i][d]) occCount++;
    bool newState = (occCount > (DEBOUNCE_SAMPLES / 2));
    bool stateChanged = (newState != occupied[i]);
    
    V_churn[i] += ALPHA_C * ((stateChanged ? 1.0 : 0.0) - V_churn[i]);
    currentTotalChurn += V_churn[i];
    
    if (stateChanged) {
      occupied[i] = newState;
      if (newState) {
        timeArrived[i] = currentMillis;
      } else {
        // OUTCOME & BOUNDARY-SPECIFIC CREDIT
        float actualSec = (currentMillis - timeArrived[i]) / 1000.0;
        float error = actualSec - predictedDuration[i];
        
        U_error[i] += ALPHA_E * (abs(error) - U_error[i]);
        U_bias[i] += ALPHA_B * (error - U_bias[i]);
        
        // Counterfactual attribution: Which boundary was actually resolved?
        // (Simplified: assuming the event resolved uncertainty for Pair 0)
        int resolvedPair = 0; 
        float infoCredit = 2.0 + (U_error[i] / 5.0); // KL divergence proxy
        
        D_ij[resolvedPair] = max(0.0f, D_ij[resolvedPair] - infoCredit);
        
        // EVENT-TRIGGERED GOSSIP
        if (infoCredit > 2.5f) { 
          outgoingCert.sourceNode = 1;
          outgoingCert.policyPair = resolvedPair;
          outgoingCert.contextHash = generateContextHash();
          outgoingCert.boundaryInfoCredit = infoCredit;
          outgoingCert.sourceReliability = 0.95f;
          outgoingCert.timestamp = currentMillis;
          esp_now_send(broadcastAddress, (uint8_t *) &outgoingCert, sizeof(outgoingCert));
        }
        
        predictedDuration[i] = (0.3 * actualSec) + (0.7 * predictedDuration[i]);
      }
    }
    
    if (occupied[i]) { digitalWrite(redPins[i], HIGH); digitalWrite(greenPins[i], LOW); }
    else { digitalWrite(redPins[i], LOW); digitalWrite(greenPins[i], HIGH); freeSlots[numFree++] = i; }
  }

  // 2. RISK KINEMATICS
  globalV_env = currentTotalChurn / NUM_SLOTS;
  V_vel = globalV_env - prev_V_env;
  V_acc = V_vel - prev_V_vel;
  prev_v_vel = V_vel; prev_V_env = globalV_env;

  // 3. INFORMATION-ACTION ARBITRATOR (Triage State Machine)
  if (numFree > 0) {
    // Evaluate Debt Interest for a specific boundary (e.g., Aggressive vs Risk-Averse = Pair 0)
    int targetPair = 0;
    float D_eff = D_ij[targetPair] + (RHO_1 * max(0.0f, V_vel)) + (RHO_2 * max(0.0f, V_acc));
    
    int chosenSlot = freeSlots[0];
    String stateMachineLog = "";

    if (D_eff < 30.0f) {
      // STATE A: EXPLOIT
      stateMachineLog = "EXPLOIT (Direct allocation)";
      D_ij[targetPair] += 1.0; // Accrue base debt for exploiting unverified boundary
    } 
    else {
      // Ambiguity is HIGH. Check for Qualified Peer Evidence.
      if (hasQualifiedPeerEvidence[targetPair]) {
        // STATE B: REMOTE SUBSTITUTE
        stateMachineLog = "REMOTE SUBSTITUTE (Peer evidence accepted)";
        D_ij[targetPair] = max(0.0f, D_ij[targetPair] - peerInfoCredit[targetPair]);
        hasQualifiedPeerEvidence[targetPair] = false; // Consume certificate
      } 
      else {
        // STATE C: LOCAL PROBE
        stateMachineLog = "LOCAL PROBE (Physical information-acquisition)";
        // Route to the slot that yields maximum Boundary-Directed Information Value (PBV)
        // (Simplified: pick the slot with highest prediction error)
        int highestErrorIdx = freeSlots[0];
        for(int k=1; k<numFree; k++) {
          if (U_error[freeSlots[k]] > U_error[highestErrorIdx]) highestErrorIdx = freeSlots[k];
        }
        chosenSlot = highestErrorIdx;
      }
    }
    
    Serial.printf("Kinematics -> V: %.2f, dV: %.3f, d2V: %.3f\n", globalV_env, V_vel, V_acc);
    Serial.printf("Boundary 0 Debt -> Base: %.1f, Effective: %.1f\n", D_ij[targetPair], D_eff);
    Serial.printf("Arbitrator State -> %s | Action -> Route to Slot %d\n\n", stateMachineLog.c_str(), chosenSlot);
  }

  delay(2000);
}
