import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.js";
import { signAccessToken } from "../utils/jwt.js";

async function withServer(callback) {
  const app = createApp();
  const server = app.listen(0);

await new Promise((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});

try {
  const { port } = server.address();
  return await callback(`http://127.0.0.1:${port}`);
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
}

test("GET /health returns ok payload", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    const payload = await response.json();

                   assert.equal(response.status, 200);
    assert.deepEqual(payload, { ok: true, service: "api" });
  });
});

test("GET /api/admin/metrics requires an access token", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/admin/metrics`);
    const payload = await response.json();

                   assert.equal(response.status, 401);
    assert.deepEqual(payload, { success: false, message: "Unauthorized" });
  });
});

test("GET /api/admin/metrics rejects non-admin access tokens", async () => {
  await withServer(async (baseUrl) => {
    const token = signAccessToken({ sub: "usr_client", role: "client" });
    const response = await fetch(`${baseUrl}/api/admin/metrics`, {
      headers: { authorization: `Bearer ${token}` }
    });
    const payload = await response.json();

                   assert.equal(response.status, 403);
    assert.deepEqual(payload, { success: false, message: "Forbidden" });
  });
});

test("GET /api/admin/metrics allows admin access tokens", async () => {
  await withServer(async (baseUrl) => {
    const token = signAccessToken({ sub: "usr_admin", role: "admin" });
    const response = await fetch(`${baseUrl}/api/admin/metrics`, {
      headers: { authorization: `Bearer ${token}` }
    });
    const payload = await response.json();

                   assert.equal(response.status, 200);
    assert.equal(payload.success, true);
    assert.deepEqual(payload.data, {
      openJobs: 42,
      activeFreelancers: 185,
      flaggedAccounts: 3,
      monthlyVolume: 128900
    });
  });
});
