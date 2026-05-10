import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerSource = await readFile(new URL("../worker.js", import.meta.url), "utf8");
const { default: worker } = await import(
  "data:text/javascript;base64," + Buffer.from(workerSource).toString("base64")
);

const REAL_DATE = Date;
const REAL_FETCH = globalThis.fetch;

const env = {
  ACCESS_KEY: "test-secret",
  CHECKIN_HOUR: "16",
  CHECKOUT_HOUR: "11",
  ICAL_URL: "https://calendar.test/listing.ics",
  SHELLY_AUTH_KEY: "shelly-secret",
  SHELLY_DEVICE_ID: "device-1",
  SHELLY_SERVER: "shelly.test",
};

const expectedCheckIn = new Date("2026-05-10T16:00:00").toISOString();

function reservationCalendar() {
  return [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "DTSTART;VALUE=DATE:20260510",
    "DTEND;VALUE=DATE:20260512",
    "SUMMARY:Guest Test",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
}

async function generatePin(checkIn, checkOut, secret) {
  const data = checkIn + "|" + checkOut + "|" + secret;
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const num = (hashArray[0] << 16) | (hashArray[1] << 8) | hashArray[2];
  return String(num % 1000000).padStart(6, "0");
}

function freezeNow(isoDate) {
  class FakeDate extends REAL_DATE {
    constructor(...args) {
      if (args.length === 0) return new REAL_DATE(isoDate);
      return new REAL_DATE(...args);
    }
  }
  FakeDate.now = () => new REAL_DATE(isoDate).getTime();
  FakeDate.parse = REAL_DATE.parse;
  FakeDate.UTC = REAL_DATE.UTC;
  globalThis.Date = FakeDate;
}

function mockCalendarFetch() {
  globalThis.fetch = async (url) => {
    const href = typeof url === "string" ? url : url.url;
    if (href === env.ICAL_URL) return new Response(reservationCalendar());
    if (href === "https://shelly.test/device/relay/control") return new Response("{}", { status: 200 });
    throw new Error("Unexpected fetch: " + href);
  };
}

function post(path, body, ip) {
  return new Request("https://worker.test" + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "cf-connecting-ip": ip,
    },
    body: JSON.stringify(body),
  });
}

test.afterEach(() => {
  globalThis.Date = REAL_DATE;
  globalThis.fetch = REAL_FETCH;
});

test("verify returns early_access when the correct PIN is used before check-in", async () => {
  freezeNow("2026-05-10T20:30:00.000Z");
  mockCalendarFetch();
  const pin = await generatePin("2026-05-10", "2026-05-12", env.ACCESS_KEY);

  const response = await worker.fetch(post("/api/verify", { pin }, "203.0.113.10"), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.valid, false);
  assert.equal(body.error, "early_access");
  assert.equal(body.checkIn, expectedCheckIn);
});

test("open returns early_access when the correct PIN is used before check-in", async () => {
  freezeNow("2026-05-10T20:30:00.000Z");
  mockCalendarFetch();
  const pin = await generatePin("2026-05-10", "2026-05-12", env.ACCESS_KEY);

  const response = await worker.fetch(post("/api/open", { pin }, "203.0.113.11"), env);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "early_access");
  assert.equal(body.checkIn, expectedCheckIn);
});
