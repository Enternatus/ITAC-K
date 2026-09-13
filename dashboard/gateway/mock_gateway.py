"""
ITAC-K Telemetry Gateway Adapter
=================================
This server acts as the bridge between the ITAC-K edge network and the web dashboard.

Architecture:
  [ESP32 Edge Nodes]
        │ (ESP-NOW broadcast: struct PeerEvidence)
        ▼
  [ESP32 USB/Serial Gateway Receiver]
        │ (Serial UART / JSON over COM port or MQTT)
        ▼
  [mock_gateway.py / gateway server]
        │ (WebSocket JSON at ws://localhost:8000/ws/telemetry)
        ▼
  [Frontend Dashboard (LiveWebSocketProvider)]

Usage:
  python mock_gateway.py [--port 8000] [--source SIMULATED_GATEWAY | LIVE_HARDWARE]
"""

import asyncio
import json
import random
import time
import argparse
import websockets

CONNECTED_CLIENTS = set()

def generate_telemetry_payload(data_source: str = "SIMULATED_GATEWAY") -> dict:
    now = int(time.time() * 1000)
    recommended_slot = random.choice([1, 2, 3])
    actions = ["EXPLOIT", "REMOTE SUBSTITUTE", "LOCAL PROBE"]
    current_action = random.choice(actions)
    boundaries = ["CLEAR", "NARROW", "UNRESOLVED"]
    boundary = random.choice(boundaries)

    reasons = {
        "EXPLOIT": f"Policy A currently optimal for Slot {recommended_slot}. Boundary sufficiently clear; direct allocation executed without probing.",
        "REMOTE SUBSTITUTE": f"Consumed qualified peer evidence from NODE-02 (similarity 0.88 >= 0.80). Physical probe bypassed.",
        "LOCAL PROBE": f"High boundary ambiguity between Policy A and B. Uncertainty debt threshold exceeded; ultrasonic sensor probe triggered."
    }

    slots = [
        {
            "id": i,
            "status": "AVAILABLE" if (i == recommended_slot or random.random() > 0.4) else "OCCUPIED",
            "sensorOk": True,
            "recommended": i == recommended_slot
        }
        for i in [1, 2, 3]
    ]

    peers = [
        {
            "id": "NODE-01",
            "online": True,
            "lastSeen": random.randint(100, 1500),
            "verdict": "ACCEPTED",
            "contextScore": round(0.85 + random.uniform(-0.04, 0.08), 2),
            "freshness": random.randint(150, 450),
            "lastEvidence": "Policy boundary resolved — ACCEPTED"
        },
        {
            "id": "NODE-02",
            "online": True,
            "lastSeen": random.randint(50, 800),
            "verdict": "ACCEPTED",
            "contextScore": round(0.91 + random.uniform(-0.03, 0.05), 2),
            "freshness": random.randint(120, 300),
            "lastEvidence": "Peer certificate validated (ESP-NOW)"
        },
        {
            "id": "NODE-03",
            "online": True,
            "lastSeen": random.randint(2000, 6000),
            "verdict": "CONTEXT-MISMATCH",
            "contextScore": round(0.68 + random.uniform(-0.05, 0.04), 2),
            "freshness": random.randint(800, 2400),
            "lastEvidence": "Rejected: Context similarity < 0.80"
        },
        {
            "id": "NODE-04",
            "online": random.random() > 0.15,
            "lastSeen": random.randint(500, 12000),
            "verdict": "STALE",
            "contextScore": 0.74,
            "freshness": random.randint(3500, 8500),
            "lastEvidence": "Stale: Freshness decay expired"
        }
    ]

    event_options = [
        {"text": f"Slot {recommended_slot} recommendation refreshed via {current_action}", "category": "DECISION", "accent": True, "slotId": recommended_slot},
        {"text": "Peer certificate qualified from NODE-01", "category": "EVIDENCE", "accent": False},
        {"text": "Volatility engine update: V_env = 0.384", "category": "SYSTEM", "accent": False},
        {"text": "Context qualification filter rejected NODE-03", "category": "EVIDENCE", "accent": False}
    ]
    event = random.choice(event_options)
    event["id"] = f"gw-evt-{int(time.time() * 1000) % 100000}"
    event["timestamp"] = now

    volatility_spark = [{"t": i, "v": round(0.25 + random.uniform(0, 0.35), 3)} for i in range(20)]
    debt_spark = [{"t": i, "v": round(0.10 + random.uniform(0, 0.40), 3)} for i in range(20)]

    return {
        "dataSource": data_source,
        "timestamp": now,
        "slots": slots,
        "peers": peers,
        "decision": {
            "recommendedSlot": recommended_slot,
            "action": current_action,
            "confidence": random.randint(72, 95),
            "competingConfidence": random.randint(30, 58),
            "boundaryState": boundary,
            "timestamp": now,
            "policyA": "Policy A (Aggressive)",
            "policyB": "Policy B (Conservative)",
            "evidenceSource": "PEER" if current_action == "REMOTE SUBSTITUTE" else "LOCAL PROBE",
            "evidencePeer": "NODE-02" if current_action == "REMOTE SUBSTITUTE" else None,
            "reason": reasons[current_action],
            "whyPanel": f"Slot {recommended_slot} was selected based on recursive O(1) state evaluation. {reasons[current_action]}",
            "causal": {
                "observation": f"Slot {recommended_slot} occupancy delta",
                "volatilityState": "MODERATE",
                "predictiveReliability": "0.89",
                "policyBoundary": f"Gap: {random.randint(18, 42)}%",
                "evidenceAcquired": current_action,
                "decision": f"SLOT {recommended_slot}"
            },
            "cost": round(random.uniform(0.02, 0.15), 3),
            "regret": round(random.uniform(0.01, 0.08), 3),
            "kinematicUrgency": round(random.uniform(0.35, 1.45), 2),
            "uncertaintyDebt": round(random.uniform(0.20, 0.85), 3)
        },
        "event": event,
        "volatilitySpark": volatility_spark,
        "debtSpark": debt_spark,
        "boundaryHistory": [random.choice(boundaries) for _ in range(10)]
    }

async def handle_client(websocket):
    CONNECTED_CLIENTS.add(websocket)
    remote = websocket.remote_address
    print(f"[Gateway] Dashboard client connected: {remote}")
    try:
        # Send initial state immediately
        payload = generate_telemetry_payload(DATA_SOURCE)
        await websocket.send(json.dumps(payload))
        # Keep client connection open
        await websocket.wait_closed()
    finally:
        CONNECTED_CLIENTS.remove(websocket)
        print(f"[Gateway] Dashboard client disconnected: {remote}")

async def broadcast_loop():
    while True:
        await asyncio.sleep(2.5)
        if CONNECTED_CLIENTS:
            payload = generate_telemetry_payload(DATA_SOURCE)
            message = json.dumps(payload)
            # Broadcast to all connected web dashboard clients
            websockets.broadcast(CONNECTED_CLIENTS, message)

async def main(host: str, port: int):
    print("=" * 60)
    print("ITAC-K TELEMETRY GATEWAY ADAPTER")
    print(f"Data Source Mode: {DATA_SOURCE}")
    print(f"Listening on: ws://{host}:{port}/ws/telemetry")
    print("=" * 60)
    
    async with websockets.serve(handle_client, host, port):
        await broadcast_loop()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ITAC-K WebSocket Telemetry Gateway")
    parser.add_argument("--host", default="0.0.0.0", help="Host interface to bind")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
    parser.add_argument(
        "--source",
        choices=["SIMULATED_GATEWAY", "LIVE_HARDWARE"],
        default="SIMULATED_GATEWAY",
        help="Provenance label for emitted telemetry frames"
    )
    args = parser.parse_args()
    DATA_SOURCE = args.source

    try:
        asyncio.run(main(args.host, args.port))
    except KeyboardInterrupt:
        print("\n[Gateway] Shutting down.")