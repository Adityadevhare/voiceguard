#!/usr/bin/env node
/**
 * VoiceGuard Integration Test — Milestone 2
 *
 * Tests the full path:
 *   test.wav → Node POST /api/detection → FastAPI POST /predict → W2V2-AASIST → Node response
 *
 * Prerequisites:
 *   1. FastAPI ML service running on http://127.0.0.1:8000
 *   2. Node backend running on http://localhost:5000 (with ML_SERVICE_URL set)
 *
 * Usage:
 *   node test-integration.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const NODE_URL = process.env.NODE_URL || "http://localhost:5000";
const ML_URL = process.env.ML_URL || "http://127.0.0.1:8000";

const FETCH_TIMEOUT_MS = 30_000;

const TEST_WAV = resolve(__dirname, "..", "ml-service", "test.wav");

let passed = 0;
let failed = 0;

function fetchWithTimeout(url, options) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}`);
    failed++;
  }
}

async function testDirectMl() {
  console.log("\n--- Test 1: Direct FastAPI /predict ---");

  const wavBuf = readFileSync(TEST_WAV);
  const blob = new Blob([wavBuf], { type: "audio/wav" });
  const form = new FormData();
  form.append("audio", blob, "test.wav");

  let res;
  try {
    res = await fetchWithTimeout(`${ML_URL}/predict`, { method: "POST", body: form });
  } catch (err) {
    console.error("  FAIL  Could not reach FastAPI:", err.message);
    failed++;
    return;
  }

  assert(res.ok, `HTTP ${res.status}`);

  const body = await res.json();
  assert(body.success === true, "success === true");
  assert(body.model === "W2V2-AASIST", 'model === "W2V2-AASIST"');
  assert(body.result !== undefined, "result is present");
  assert(
    body.result.classification === "bonafide" ||
      body.result.classification === "spoof",
    `classification is "${body.result.classification}"`,
  );
  assert(typeof body.result.logit0 === "number", "logit0 is number");
  assert(typeof body.result.logit1 === "number", "logit1 is number");
  assert(
    typeof body.result.inferenceTimeMs === "number",
    "inferenceTimeMs is number",
  );
  assert(!("filename" in body), "no legacy 'filename' field");
  assert(!("logit_0" in (body.result || {})), "no legacy 'logit_0' field");

  console.log("  Response:", JSON.stringify(body, null, 2));
}

async function testNodeDetection() {
  console.log("\n--- Test 2: Node POST /api/detection (full pipeline) ---");

  const wavBuf = readFileSync(TEST_WAV);
  const audioBase64 = wavBuf.toString("base64");

  let res;
  try {
    res = await fetchWithTimeout(`${NODE_URL}/api/detection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: audioBase64 }),
    });
  } catch (err) {
    console.error("  FAIL  Could not reach Node backend:", err.message);
    failed++;
    return;
  }

  assert(res.ok, `HTTP ${res.status}`);

  const body = await res.json();
  assert(body.success === true, "success === true");
  assert(body.data !== undefined, "data is present");

  const data = body.data;
  assert(
    data.result === "human" || data.result === "ai",
    `result is "${data.result}"`,
  );
  assert(
    data.riskLevel === "low" || data.riskLevel === "critical",
    `riskLevel is "${data.riskLevel}"`,
  );
  assert(typeof data.message === "string" && data.message.length > 0, "message is non-empty string");
  assert(typeof data.modelVersion === "string", "modelVersion is string");
  assert(typeof data.processingTime === "number", "processingTime is number");

  if (data.result === "human") {
    assert(data.riskLevel === "low", "human → riskLevel low");
    assert(
      data.message === "The voice currently sounds natural.",
      "human → correct message",
    );
  } else {
    assert(data.riskLevel === "critical", "ai → riskLevel critical");
    assert(
      data.message === "Be careful before trusting the person behind this voice.",
      "ai → correct message",
    );
  }

  console.log("  Response:", JSON.stringify(body, null, 2));
}

async function testNodeMissingAudio() {
  console.log("\n--- Test 3: Node POST /api/detection (missing audio) ---");

  const res = await fetchWithTimeout(`${NODE_URL}/api/detection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  assert(res.status === 422 || res.status === 400, `HTTP ${res.status} (expected 4xx)`);
  const body = await res.json();
  assert(body.success === false, "success === false");
  console.log("  Response:", JSON.stringify(body, null, 2));
}

async function testNodeInvalidFileType() {
  console.log("\n--- Test 4: Node POST /api/detection (non-WAV data) ---");

  const fakeBase64 = Buffer.from("not a real wav file").toString("base64");

  const res = await fetchWithTimeout(`${NODE_URL}/api/detection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio: fakeBase64 }),
  });

  const body = await res.json();
  assert(body.success === false, "success === false");
  assert(body.error !== undefined, "error is present");
  console.log("  Response:", JSON.stringify(body, null, 2));
}

async function main() {
  console.log("VoiceGuard Integration Test — Milestone 2");
  console.log("=========================================");

  await testDirectMl();
  await testNodeDetection();
  await testNodeMissingAudio();
  await testNodeInvalidFileType();

  console.log("\n=========================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
