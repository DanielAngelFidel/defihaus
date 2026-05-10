# Habitacion Dos Guia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a static check-in guide for habitacion dos and wire the admin message generator to share it with the guest PIN.

**Architecture:** Keep the existing static HTML pattern. `checkin-habitacion-dos.html` owns the guest-facing room 2 content, and `admin.html` owns the listing-to-guide URL selection.

**Tech Stack:** Static HTML/CSS/JavaScript, Cloudflare Worker API endpoints, Node.js built-in `node:test` for regression checks.

---

### Task 1: Guide Regression Tests

**Files:**
- Create: `tests/arrival-guides.test.mjs`
- Read: `checkin-habitacion-dos.html`
- Read: `admin.html`

- [x] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
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

test("admin maps habitacion dos listings to the habitacion dos guide", () => {
  assert.match(admin, /const ROOM_TWO_GUIDE_URL=ACCESS_URL\+"\/checkin-habitacion-dos\.html";/);
  assert.match(admin, /function isRoomTwo\(listing\)/);
  assert.match(admin, /if\(isRoomTwo\(listing\)\) return ROOM_TWO_GUIDE_URL;/);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/arrival-guides.test.mjs`
Expected: FAIL because the current room 2 guide does not mention the room 2 trash can and still points room-specific photos at `habitacion-uno`.

### Task 2: Complete Habitacion Dos Guide

**Files:**
- Modify: `checkin-habitacion-dos.html`

- [x] **Step 1: Write minimal implementation**

Change step 7 to include the trash can instruction:

```html
<div class="step"><div class="num">7</div><div class="text">Tu habitación es la <strong>#2</strong>. Tu bote de basura está en la cocina y también está marcado con el <strong>#2</strong>. Este es un espacio compartido, así que te pedimos respetar las reglas de convivencia durante tu estancia.</div></div>
<img class="photo" src="/arrival/habitacion-dos/07-room.jpg?v=20260510-1" alt="Habitación dos" onerror="this.hidden=true">
```

Change step 8 to use the room 2 hallway/door asset slot:

```html
<img class="photo" src="/arrival/habitacion-dos/08-hallway.jpg?v=20260510-1" alt="Pasillo hacia la habitación dos" onerror="this.hidden=true">
```

- [x] **Step 2: Run test to verify it passes**

Run: `node --test tests/arrival-guides.test.mjs`
Expected: PASS.

### Task 3: Full Verification

**Files:**
- Read: `tests/*.test.mjs`
- Read: `checkin-habitacion-dos.html`
- Read: `admin.html`

- [x] **Step 1: Run all Node tests**

Run: `node --test tests/*.test.mjs`
Expected: all tests pass.

- [ ] **Step 2: Verify local page content**

Run: `python3 -m http.server 4173`
Open `http://127.0.0.1:4173/checkin-habitacion-dos.html?pin=123456` with Playwright or a browser automation fallback.
Expected: page title and room 2 content render, and the PIN field contains `123456`.
