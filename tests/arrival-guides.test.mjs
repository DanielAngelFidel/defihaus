import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const roomTwoGuide = await readFile(new URL("../checkin-habitacion-dos.html", import.meta.url), "utf8");
const admin = await readFile(new URL("../admin.html", import.meta.url), "utf8");

function loadAdminApi() {
  const script = admin.match(/<script>([\s\S]*)<\/script>/)[1].replace(/\brenderLogin\(\);\s*$/, "");
  const noopElement = {
    addEventListener() {},
    classList: { add() {}, remove() {} },
    focus() {},
    innerHTML: "",
    style: {},
    textContent: "",
  };
  const sandbox = {
    Blob,
    ClipboardItem: class ClipboardItem {},
    Date,
    JSON,
    URLSearchParams,
    console,
    document: { getElementById: () => noopElement },
    fetch: async () => new Response("{}"),
    localStorage: { getItem: () => "[]", setItem() {} },
    navigator: { clipboard: { write: async () => {}, writeText: async () => {} } },
    setTimeout,
    window: {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(`${script}; globalThis.__adminApi={airbnbMessage, guideUrlWithPin, renderRes};`, sandbox);
  return sandbox.__adminApi;
}

test("habitacion dos guide identifies room and trash can number two", () => {
  assert.match(roomTwoGuide, /Guía de llegada · Habitación dos/);
  assert.match(roomTwoGuide, /Tu habitación es la <strong>#2<\/strong>/);
  assert.match(roomTwoGuide, /Tu bote de basura está en la cocina y también está marcado con el <strong>#2<\/strong>/);
});

test("habitacion dos guide reserves room-specific image paths for room two assets", () => {
  assert.match(roomTwoGuide, /src="\/arrival\/habitacion-dos\/07-room\.jpg\?v=[0-9-]+"/);
  assert.match(roomTwoGuide, /src="\/arrival\/habitacion-dos\/08-hallway\.jpg\?v=[0-9-]+"/);
  assert.doesNotMatch(roomTwoGuide, /src="\/arrival\/habitacion-uno\/07-room\.jpg/);
  assert.doesNotMatch(roomTwoGuide, /src="\/arrival\/habitacion-uno\/08-hallway\.jpg/);
});

test("habitacion dos guide has the room photo asset", async () => {
  await access(new URL("../arrival/habitacion-dos/07-room.jpg", import.meta.url));
});

test("admin maps habitacion dos listings to the habitacion dos guide", () => {
  assert.match(admin, /const ROOM_TWO_GUIDE_URL=ACCESS_URL\+"\/checkin-habitacion-dos\.html";/);
  assert.match(admin, /function isRoomTwo\(listing\)/);
  assert.match(admin, /if\(isRoomTwo\(listing\)\) return ROOM_TWO_GUIDE_URL;/);
});

test("admin builds the habitacion dos visual guide URL with the reservation PIN", () => {
  const api = loadAdminApi();

  assert.equal(
    api.guideUrlWithPin("habitacion dos", "211610"),
    "https://navarte2.romanortehost.com/checkin-habitacion-dos.html?pin=211610",
  );
});

test("admin renders the visual guide button for habitacion dos reservations", () => {
  const api = loadAdminApi();
  const reservationHtml = api.renderRes({
    checkIn: "2026-05-02T18:00:00.000Z",
    checkOut: "2026-05-31T13:00:00.000Z",
    guest: "Reserved",
    listing: "habitacion dos",
    pin: "211610",
  }, "active");

  assert.match(reservationHtml, /Copiar mensaje Airbnb \+ guía visual/);
  assert.match(reservationHtml, /Ver guía visual/);
  assert.match(reservationHtml, /href="https:\/\/navarte2\.romanortehost\.com\/checkin-habitacion-dos\.html\?pin=211610"/);
});

test("admin copies the updated habitacion dos Airbnb message with visual guide", () => {
  const api = loadAdminApi();
  const message = api.airbnbMessage("211610", "habitacion dos");

  assert.match(message, /^Hola 😊/);
  assert.match(message, /Aquí tienes tu guía de check-in, ya con tu PIN cargado:/);
  assert.match(message, /https:\/\/navarte2\.romanortehost\.com\/checkin-habitacion-dos\.html\?pin=211610/);
  assert.match(message, /Tu PIN de acceso es: 211610/);
  assert.match(message, /Al llegar, busca la entrada que dice 26B\./);
  assert.doesNotMatch(message, /Para que tu llegada sea muy fácil, te compartimos tu acceso digital/);
});
