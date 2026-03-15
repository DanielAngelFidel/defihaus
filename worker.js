// ============================================================
// CLOUDFLARE WORKER — Defihaus Puerta Narvarte v2 (PIN system)
// ============================================================

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

async function generatePin(checkIn, checkOut, secret) {
  const data = checkIn + "|" + checkOut + "|" + secret;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const num = (hashArray[0] << 16) | (hashArray[1] << 8) | hashArray[2];
  return String(num % 1000000).padStart(6, "0");
}

function parseICal(text) {
  const events = [];
  const blocks = text.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const get = (key) => {
      const m = block.match(new RegExp(key + "[;:]([^\\r\\n]+)"));
      return m ? m[1].trim() : null;
    };
    const dtstart = get("DTSTART");
    const dtend = get("DTEND");
    const summary = get("SUMMARY") || "";
    if (dtstart && dtend) {
      const parse = (d) => {
        const c = d.replace("VALUE=DATE:", "");
        if (c.length === 8) return c.substring(0,4) + "-" + c.substring(4,6) + "-" + c.substring(6,8);
        return c;
      };
      events.push({ start: parse(dtstart), end: parse(dtend), summary: summary });
    }
  }
  return events;
}

function getReservations(events, ciHour, coHour) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  const reservations = [];
  for (const ev of events) {
    const s = ev.summary.toLowerCase();
    if (s.includes("not available") || s.includes("no disponible") || s === "") continue;
    const ci = new Date(ev.start + "T" + String(ciHour).padStart(2,"0") + ":00:00");
    const co = new Date(ev.end + "T" + String(coHour).padStart(2,"0") + ":00:00");
    const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    if (co >= now && ci <= sixtyDays) {
      reservations.push({
        guest: ev.summary, checkIn: ci.toISOString(), checkOut: co.toISOString(),
        startDate: ev.start, endDate: ev.end, active: now >= ci && now <= co,
      });
    }
  }
  reservations.sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
  return reservations;
}

function getActiveReservation(events, ciHour, coHour) {
  const active = getReservations(events, ciHour, coHour).find(r => r.active);
  return active ? { active: true, guest: active.guest, checkIn: active.checkIn, checkOut: active.checkOut, startDate: active.startDate, endDate: active.endDate } : { active: false };
}

const rateMap = new Map();
function rateOk(ip, max) {
  max = max || 5;
  const now = Date.now();
  const e = rateMap.get(ip) || { n: 0, t: now };
  if (now - e.t > 60000) { e.n = 1; e.t = now; } else { e.n++; }
  rateMap.set(ip, e);
  return e.n <= max;
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    const path = url.pathname;
    const ciHour = parseInt(env.CHECKIN_HOUR || "15");
    const coHour = parseInt(env.CHECKOUT_HOUR || "11");

    try {
      // ---- VERIFY PIN ----
      if (path === "/api/verify" && req.method === "POST") {
        const ip = req.headers.get("cf-connecting-ip") || "x";
        if (!rateOk(ip, 10))
          return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: CORS });
        const body = await req.json().catch(() => ({}));
        const pin = (body.pin || "").trim();
        if (!pin || pin.length !== 6)
          return new Response(JSON.stringify({ valid: false, error: "invalid_pin" }), { headers: CORS });
        const ical = await (await fetch(env.ICAL_URL, { cf: { cacheTtl: 900, cacheEverything: true } })).text();
        const events = parseICal(ical);
        const active = getActiveReservation(events, ciHour, coHour);
        if (!active.active)
          return new Response(JSON.stringify({ valid: false, error: "no_reservation" }), { headers: CORS });
        const correctPin = await generatePin(active.startDate, active.endDate, env.ACCESS_KEY);
        if (pin !== correctPin)
          return new Response(JSON.stringify({ valid: false, error: "wrong_pin" }), { headers: CORS });
        return new Response(JSON.stringify({ valid: true, guest: active.guest, checkOut: active.checkOut }), { headers: CORS });
      }

      // ---- OPEN DOOR ----
      if (path === "/api/open" && req.method === "POST") {
        const ip = req.headers.get("cf-connecting-ip") || "x";
        if (!rateOk(ip))
          return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: CORS });
        const body = await req.json().catch(() => ({}));
        const pin = (body.pin || "").trim();
        let authorized = false;
        if (body.key === env.ACCESS_KEY) { authorized = true; }
        else if (pin && pin.length === 6) {
          const ical2 = await (await fetch(env.ICAL_URL, { cf: { cacheTtl: 900, cacheEverything: true } })).text();
          const ev2 = parseICal(ical2);
          const act2 = getActiveReservation(ev2, ciHour, coHour);
          if (act2.active) {
            const cp = await generatePin(act2.startDate, act2.endDate, env.ACCESS_KEY);
            if (pin === cp) authorized = true;
          }
        }
        if (!authorized)
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: CORS });
        const ical = await (await fetch(env.ICAL_URL, { cf: { cacheTtl: 900, cacheEverything: true } })).text();
        const events = parseICal(ical);
        const status = getActiveReservation(events, ciHour, coHour);
        if (!status.active)
          return new Response(JSON.stringify({ error: "no_reservation" }), { status: 403, headers: CORS });
        const res = await fetch("https://" + env.SHELLY_SERVER + "/device/relay/control", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ auth_key: env.SHELLY_AUTH_KEY, id: env.SHELLY_DEVICE_ID, channel: "0", turn: "on" }),
        });
        return new Response(JSON.stringify({ success: res.ok }), { status: res.ok ? 200 : 500, headers: CORS });
      }

      // ---- ADMIN: list PINs ----
      if (path === "/api/admin/pins" && req.method === "GET") {
        if (url.searchParams.get("key") !== env.ACCESS_KEY)
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: CORS });
        const ical = await (await fetch(env.ICAL_URL, { cf: { cacheTtl: 900, cacheEverything: true } })).text();
        const events = parseICal(ical);
        const reservations = getReservations(events, ciHour, coHour);
        const withPins = [];
        for (const r of reservations) {
          withPins.push({ guest: r.guest, checkIn: r.checkIn, checkOut: r.checkOut, active: r.active, pin: await generatePin(r.startDate, r.endDate, env.ACCESS_KEY) });
        }
        return new Response(JSON.stringify({ reservations: withPins }), { headers: CORS });
      }

      // ---- STATUS (legacy) ----
      if (path === "/api/status" && req.method === "GET") {
        if (url.searchParams.get("key") !== env.ACCESS_KEY)
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: CORS });
        const ical = await (await fetch(env.ICAL_URL, { cf: { cacheTtl: 900, cacheEverything: true } })).text();
        const events = parseICal(ical);
        const status = getActiveReservation(events, ciHour, coHour);
        return new Response(JSON.stringify(status), { headers: CORS });
      }

      return new Response("Not found", { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
    }
  },
};
