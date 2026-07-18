#!/usr/bin/env node
/**
 * Waypoint Studio smoke checks — routes, volunteer engine, dialog helper.
 * Run: node tests/smoke.mjs
 */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");
var assert = require("assert");

var root = path.join(__dirname, "..");
var failures = [];
var warnings = [];

function ok(name) {
  console.log("OK  " + name);
}

function fail(name, err) {
  failures.push(name + ": " + err);
  console.log("FAIL  " + name + " — " + err);
}

function warn(name, msg) {
  warnings.push(name + ": " + msg);
  console.log("WARN  " + name + " — " + msg);
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

/* —— Required routes —— */
var required = [
  "index.html",
  "404.html",
  "robots.txt",
  "sitemap.xml",
  "privacy/index.html",
  "contact/index.html",
  "support/index.html",
  "about/index.html",
  "volunteer/index.html",
  "volunteer/opportunity/index.html",
  "volunteer/organization/index.html",
  "volunteer/saved/index.html",
  "sheds/index.html",
  "foragecast/index.html",
  "foragecast/education/index.html",
  "waypoint-scenes/index.html",
  "fieldry/index.html",
  "education/index.html",
  "shared/a11y-dialog.js"
];

required.forEach(function (rel) {
  if (exists(rel)) ok("route " + rel);
  else fail("route " + rel, "missing");
});

/* —— Apps that must NOT be claimed as live routes —— */
[
  "dashboard/index.html",
  "photo-coach/index.html",
  "signalterrain/index.html",
  "steepleaf/index.html",
  "savant-sommelier/index.html",
  "landscape-interpretation/index.html"
].forEach(function (rel) {
  if (exists(rel)) warn("unexpected live app", rel + " exists — update homepage claims");
  else ok("absent (direction-only) " + rel);
});

/* —— Homepage honesty —— */
var home = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert(home.indexOf("Long-term direction") !== -1, "homepage missing direction section");
assert(home.indexOf("privacy/") !== -1, "homepage missing privacy link");
assert(home.indexOf("Not available in this repository build") !== -1, "homepage must disclaim missing apps");
ok("homepage honesty markers");

/* —— Broken audio sources removed —— */
var ws = fs.readFileSync(
  path.join(root, "projects/waypoint-scenes/ws0001/index.html"),
  "utf8"
);
if (ws.indexOf("assets/wind.mp3") !== -1) {
  fail("ws0001 audio", "still references missing wind.mp3");
} else {
  ok("ws0001 missing mp3 references removed");
}

/* —— Volunteer catalog —— */
var ctx = {
  window: {},
  console: console,
  localStorage: {
    _d: {},
    getItem: function (k) {
      return this._d[k] || null;
    },
    setItem: function (k, v) {
      this._d[k] = String(v);
    }
  }
};
ctx.window = ctx;
function load(rel) {
  vm.runInNewContext(fs.readFileSync(path.join(root, rel), "utf8"), ctx);
}
try {
  [
    "volunteer/data/model.js",
    "volunteer/data/categories.js",
    "volunteer/data/organizations.js",
    "volunteer/data/opportunities.js",
    "volunteer/data/enrichment.js",
    "volunteer/js/catalog.js",
    "volunteer/js/planning.js",
    "volunteer/js/filters.js",
    "volunteer/js/today-engine.js",
    "volunteer/js/today-i-can.js",
    "shared/a11y-dialog.js"
  ].forEach(load);

  assert(ctx.VolunteerOpportunities.list.length >= 20, "catalog too small");
  var remote = ctx.VolunteerFilters.apply(
    ctx.VolunteerOpportunities.list,
    { facets: ["remote"] },
    { userLat: 40.78, userLon: -77.86 }
  );
  assert(remote.length >= 1, "remote facet empty");
  var rec = ctx.VolunteerTodayICan.recommend(
    ctx.VolunteerOpportunities.list,
    "30-min",
    {
      now: new Date(),
      season: "summer",
      location: { lat: 40.78, lon: -77.86 },
      weather: { available: false, tags: [] },
      user: {}
    },
    { limit: 3 }
  );
  assert(rec.results.length >= 1, "today-i-can empty");
  assert(rec.results[0].reasons.length >= 1, "missing reasons");
  ctx.VolunteerPlanning.toggleSaved("opp-globe-clouds");
  assert(ctx.VolunteerPlanning.isSaved("opp-globe-clouds"), "save failed");
  assert(typeof ctx.WaypointA11y.bindDialog === "function", "a11y helper missing");
  ok("volunteer discovery engine");
} catch (err) {
  fail("volunteer discovery engine", err.message || err);
}

/* —— Internal link scan (sample) —— */
var missingLinks = 0;
var htmlFiles = [];
function walk(dir) {
  fs.readdirSync(dir).forEach(function (name) {
    if (name === ".git" || name === "node_modules") return;
    var full = path.join(dir, name);
    var st = fs.statSync(full);
    if (st.isDirectory()) walk(full);
    else if (name.endsWith(".html")) htmlFiles.push(full);
  });
}
walk(root);
var linkRe = /(?:href|src)=["']([^"']+)["']/gi;
htmlFiles.forEach(function (file) {
  var text = fs.readFileSync(file, "utf8");
  var base = path.dirname(file);
  var m;
  while ((m = linkRe.exec(text))) {
    var url = m[1];
    if (
      url.startsWith("#") ||
      url.startsWith("mailto:") ||
      url.startsWith("http") ||
      url.startsWith("//") ||
      url.startsWith("data:")
    ) {
      continue;
    }
    var clean = url.split("#")[0].split("?")[0];
    if (!clean) continue;
    var target = path.resolve(base, clean);
    var fine =
      fs.existsSync(target) ||
      fs.existsSync(path.join(target, "index.html"));
    if (!fine) {
      missingLinks++;
      if (missingLinks <= 5) warn("link", path.relative(root, file) + " -> " + url);
    }
  }
});
if (missingLinks === 0) ok("internal links");
else warn("internal links", missingLinks + " missing targets (see WARN samples)");

console.log("");
console.log(
  "Summary: " +
    failures.length +
    " failures, " +
    warnings.length +
    " warnings"
);
if (failures.length) process.exit(1);
