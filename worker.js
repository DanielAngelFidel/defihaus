// ============================================================
// CLOUDFLARE WORKER — Defihaus Puerta Narvarte
// ============================================================
// Deploy como Cloudflare Worker
// 
// Variables de entorno (Workers → Settings → Variables):
//   SHELLY_AUTH_KEY  = M2VhYjAzdWlkD83B85060A77195AE2651037FC777AE31232B17DA24AA54EAF8AD09A3D939278A07EA8B15FA8A9D0
//   SHELLY_DEVICE_ID = a085e3c9b840
//   SHELLY_SERVER    = shelly-247-eu.shelly.cloud
//   ICAL_URL         = https://www.airbnb.com/calendar/ical/1574837156020290632.ics?t=0c1f056f3ec645619cfa39f465d01004&locale=en
//   ACCESS_KEY       = (inventa una clave larga, ej: dh-narv-2026-xK9mPz)
//   CHECKIN_HOUR     = 15
//   CHECKOUT_HOUR    = 11
// ============================================================

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function parseICal(text) {
  const events = [];
  const blocks = text.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const get = (key) => {
      const m = block.match(new RegExp(`${key}[;:]([^\\r\\n]+)`));
      return m ? m[1].trim() : null;
    };
    const dtstart = get("DTSTART");
    const dtend = get("DTEND");
    const summary = get("SUMMARY") || "";
    if (dtstart && dtend) {
      const parse = (d) => {
        const c = d.replace("VALUE=DATE:", "");
        if (c.length === 8) return `${c.substring(0,4)}-${c.substring(4,6)}-${c.substring(6,8)}`;
        return c;
      };
      events.push({ start: parse(dtstart), end: parse(dtend), summary });
    }
  }
  return events;
}

function getActiveReservation(events, ciHour, coHour) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  for (const ev of events) {
    const s = ev.summary.toLowerCase();
    if (s.includes("not available") || s.includes("no disponible") || s === "") continue;
    const ci = new Date(ev.start + `T${String(ciHour).padStart(2,"0")}:00:00`);
    const co = new Date(ev.end + `T${String(coHour).padStart(2,"0")}:00:00`);
    if (now >= ci && now <= co) {
      return { active: true, guest: ev.summary, checkIn: ci.toISOString(), checkOut: co.toISOString() };
    }
  }
  return { active: false };
}

const rateMap = new Map();
function rateOk(ip) {
  const now = Date.now();
  const e = rateMap.get(ip) || { n: 0, t: now };
  if (now - e.t > 60000) { e.n = 1; e.t = now; } else { e.n++; }
  rateMap.set(ip, e);
  return e.n <= 5;
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(req.url);
    const path = url.pathname;

    try {
      // ---- STATUS ----
      if (path === "/api/status" && req.method === "GET") {
        if (url.searchParams.get("key") !== env.ACCESS_KEY)
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: CORS });

        const ical = await (await fetch(env.ICAL_URL, { cf: { cacheTtl: 900, cacheEverything: true } })).text();
        const events = parseICal(ical);
        const status = getActiveReservation(events, parseInt(env.CHECKIN_HOUR || "15"), parseInt(env.CHECKOUT_HOUR || "11"));
        return new Response(JSON.stringify(status), { headers: CORS });
      }

      // ---- OPEN DOOR ----
      if (path === "/api/open" && req.method === "POST") {
        const ip = req.headers.get("cf-connecting-ip") || "x";
        if (!rateOk(ip))
          return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: CORS });

        const body = await req.json().catch(() => ({}));
        if (body.key !== env.ACCESS_KEY)
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: CORS });

        // Verify active reservation
        const ical = await (await fetch(env.ICAL_URL, { cf: { cacheTtl: 900, cacheEverything: true } })).text();
        const events = parseICal(ical);
        const status = getActiveReservation(events, parseInt(env.CHECKIN_HOUR || "15"), parseInt(env.CHECKOUT_HOUR || "11"));
        if (!status.active)
          return new Response(JSON.stringify({ error: "no_reservation" }), { status: 403, headers: CORS });

        // Open door via Shelly Cloud
        const res = await fetch(`https://${env.SHELLY_SERVER}/device/relay/control`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            auth_key: env.SHELLY_AUTH_KEY,
            id: env.SHELLY_DEVICE_ID,
            channel: "0",
            turn: "on",
          }),
        });
        const ok = res.ok;
        return new Response(JSON.stringify({ success: ok }), { status: ok ? 200 : 500, headers: CORS });
      }

      return new Response("Not found", { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
    }
  },
};
