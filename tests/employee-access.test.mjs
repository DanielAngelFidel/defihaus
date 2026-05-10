import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readText(path) {
  try {
    return await readFile(new URL(path, import.meta.url), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

const equipo = await readText("../equipo.html");
const manifestText = await readText("../equipo-manifest.json");
const redirects = await readText("../_redirects");
const manifest = manifestText ? JSON.parse(manifestText) : {};

test("employee access page is a single mobile entry point to the admin panel", () => {
  assert.match(equipo, /<title>Defihaus Equipo<\/title>/);
  assert.match(equipo, /<h1>Defihaus Equipo<\/h1>/);
  assert.match(equipo, /href="admin\.html"/);
  assert.match(equipo, />Entrar al panel<\/a>/);
  assert.match(equipo, /No necesitas instalar nada/);
});

test("employee access page makes home screen installation optional without exposing secrets", () => {
  assert.match(equipo, /Icono opcional/);
  assert.match(equipo, /iPhone/);
  assert.match(equipo, /Android/);
  assert.doesNotMatch(equipo, /ACCESS_KEY|SHELLY_AUTH_KEY|GITHUB_TOKEN|dh-narv-2026|acapulco2024/);
});

test("employee access page includes a WhatsApp group pinned message", () => {
  assert.match(equipo, /Mensaje para fijar en WhatsApp/);
  assert.match(equipo, /Panel Defihaus/);
  assert.match(equipo, /https:\/\/navarte2\.romanortehost\.com\/equipo/);
  assert.match(equipo, /copyGroupMessage/);
});

test("employee access page has an installable staff manifest", () => {
  assert.match(equipo, /<link rel="manifest" href="\/equipo-manifest\.json">/);
  assert.equal(manifest.name, "Defihaus Equipo");
  assert.equal(manifest.short_name, "Equipo");
  assert.equal(manifest.start_url, "/equipo.html");
  assert.equal(manifest.display, "standalone");
});

test("employee access page can be shared as slash equipo", () => {
  assert.match(redirects, /^\/equipo\s+\/equipo\.html\s+200$/m);
});
