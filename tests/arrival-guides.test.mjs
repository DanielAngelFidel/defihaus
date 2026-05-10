import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import test from "node:test";

const roomTwoGuide = await readFile(new URL("../checkin-habitacion-dos.html", import.meta.url), "utf8");
const admin = await readFile(new URL("../admin.html", import.meta.url), "utf8");

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
