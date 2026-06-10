/**
 * County geocoding regression tests for ForageCast.
 * Run: node foragecast/test-county-geocode.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, "counties.data.json"), "utf8")
);

const STATE_ABBR = {
  PA: "Pennsylvania",
  NY: "New York",
  NJ: "New Jersey",
  VT: "Vermont",
  MA: "Massachusetts",
  ME: "Maine",
};

const STATE_NAMES = {};
Object.keys(STATE_ABBR).forEach((abbr) => {
  STATE_NAMES[STATE_ABBR[abbr].toLowerCase()] = STATE_ABBR[abbr];
});

function normalizeState(state) {
  if (!state) return "";
  const trimmed = String(state).trim();
  const upper = trimmed.toUpperCase();
  if (STATE_ABBR[upper]) return STATE_ABBR[upper];
  const lower = trimmed.toLowerCase();
  if (STATE_NAMES[lower]) return STATE_NAMES[lower];
  return trimmed;
}

function normalizeCountyKey(name) {
  return String(name || "")
    .replace(/\./g, "")
    .replace(/\s+county\s*$/i, "")
    .replace(/\s+parish\s*$/i, "")
    .toLowerCase()
    .trim();
}

function stripStateFromQuery(query, state) {
  let q = String(query || "").trim();
  const normState = normalizeState(state);
  q = q.replace(/,\s*(PA|NY|NJ|VT|MA|ME)\s*$/i, "");
  Object.keys(STATE_ABBR).forEach((abbr) => {
    if (STATE_ABBR[abbr] === normState) {
      q = q.replace(new RegExp(",\\s*" + abbr + "\\s*$", "i"), "");
    }
  });
  if (normState) {
    q = q.replace(
      new RegExp(
        ",\\s*" + normState.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$",
        "i"
      ),
      ""
    );
  }
  return q.trim();
}

function extractCountyKey(query, state) {
  return normalizeCountyKey(stripStateFromQuery(query, state));
}

function resolveCounty(state, query) {
  const normState = normalizeState(state);
  const countyKey = extractCountyKey(query, state);
  if (!normState || !countyKey) return null;
  const byState = data.byStateCounty[normState];
  if (!byState) return null;
  return byState[countyKey] || null;
}

function countyToPlace(entry) {
  return {
    name: entry.county,
    latitude: entry.lat,
    longitude: entry.lon,
    admin1: entry.state,
    admin2: entry.county,
    fips: entry.fips,
    country_code: "US",
    source: "county-registry",
  };
}

function oldPickPlace(results, state, query) {
  const q = (query || "").toLowerCase();
  const inState = results.filter(
    (r) => r.admin1 === state && r.country_code === "US"
  );
  const pool = inState.length ? inState : results;
  return pool[0];
}

const CASES = [
  {
    query: "Pike County, PA",
    state: "Pennsylvania",
    expectedFips: "42103",
    expectedState: "Pennsylvania",
  },
  {
    query: "Pike County",
    state: "Pennsylvania",
    expectedFips: "42103",
    expectedState: "Pennsylvania",
  },
  {
    query: "Orange County, NY",
    state: "New York",
    expectedFips: "36071",
    expectedState: "New York",
  },
  {
    query: "Orange County",
    state: "New York",
    expectedFips: "36071",
    expectedState: "New York",
  },
  {
    query: "Sussex County, NJ",
    state: "New Jersey",
    expectedFips: "34037",
    expectedState: "New Jersey",
  },
  {
    query: "Sussex County",
    state: "New Jersey",
    expectedFips: "34037",
    expectedState: "New Jersey",
  },
];

let passed = 0;
let failed = 0;

console.log("Registry FIPS resolution");
for (const test of CASES) {
  const entry = resolveCounty(test.state, test.query);
  const place = entry ? countyToPlace(entry) : null;
  const ok =
    place &&
    place.fips === test.expectedFips &&
    place.admin1 === test.expectedState;
  console.log(
    (ok ? "PASS" : "FAIL") +
      `  ${test.query} + ${test.state} -> ${place ? place.fips + " " + place.admin1 : "null"}`
  );
  if (ok) passed++;
  else failed++;
}

console.log("\nOld geocoder cross-state regression (Pike County, PA)");
const fakeOpenMeteo = [
  {
    name: "Pike County Lake",
    admin1: "Alabama",
    admin2: "Pike",
    country_code: "US",
  },
  {
    name: "Pike County Regional Airport",
    admin1: "Kentucky",
    admin2: "Pike",
    country_code: "US",
  },
];
const oldPick = oldPickPlace(fakeOpenMeteo, "Pennsylvania", "Pike County");
const oldBug = oldPick.admin1 !== "Pennsylvania";
console.log(
  oldBug
    ? "CONFIRMED  bare Pike County used to resolve to " + oldPick.admin1
    : "unexpected old behavior"
);

const registryFix = resolveCounty("Pennsylvania", "Pike County");
const newOk =
  registryFix &&
  registryFix.fips === "42103" &&
  registryFix.state === "Pennsylvania";
console.log(
  (newOk ? "PASS" : "FAIL") +
    "  registry now pins Pike County to Pennsylvania (FIPS 42103)"
);
if (newOk) passed++;
else failed++;

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed > 0 ? 1 : 0);
