const TOKEN = process.env.DEEPDIG_TOKEN;
if (!TOKEN) {
  console.error("Set DEEPDIG_TOKEN environment variable");
  process.exit(1);
}

const BASE_URL = "https://deep-dig.xyz/api/refine";
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // check every 30 min

const headers = {
  "accept": "*/*",
  "authorization": `Bearer ${TOKEN}`,
  "content-type": "application/json",
  "origin": "https://deep-dig.xyz",
  "referer": "https://deep-dig.xyz/",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36",
};

function log(msg) {
  console.log(`[${new Date().toLocaleString("fr-FR")}] ${msg}`);
}

async function apiCall(endpoint) {
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    headers,
    body: "{}",
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function cycle() {
  const collect = await apiCall("collect");

  if (collect.status !== 200) {
    log(`Refine not ready (${collect.data?.error || collect.status}), checking again in 30 min...`);
    return;
  }

  log(`Collected! ${JSON.stringify(collect.data)}`);

  const start = await apiCall("start");
  log(`New refine started: ${start.status} → ${JSON.stringify(start.data)}`);
}

// Check token expiry
try {
  const payload = JSON.parse(atob(TOKEN.split(".")[0]));
  const expiresAt = new Date(payload.e * 1000);
  if (Date.now() > payload.e * 1000) {
    log(`⚠ Token expired on ${expiresAt.toLocaleString("fr-FR")}! Get a fresh one from DevTools.`);
    process.exit(1);
  }
  log(`Token valid until ${expiresAt.toLocaleString("fr-FR")}`);
} catch { /* non-standard token format, skip check */ }

log("Refiner running — checking every 30 min...\n");
cycle();
setInterval(cycle, CHECK_INTERVAL_MS);
