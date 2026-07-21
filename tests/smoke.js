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
  "dashboard/index.html",
  "incubator/index.html",
  "design-system/index.html",
  "styles/aurora-tokens.css",
  "styles/aurora.css",
  "docs/AURORA-DESIGN-SYSTEM.md",
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
  "docs/RC3-CONSTITUTION.md",
  "docs/PRODUCTS.md",
  "docs/NAVIGATION-PLAN.md",
  "docs/INCUBATOR.md",
  "docs/DASHBOARD-3.md",
  "styles/dashboard.css",
  "dashboard/js/widgets.js",
  "dashboard/js/engine.js",
  "dashboard/js/layout.js",
  "dashboard/js/app.js",
  "shared/a11y-dialog.js"
];

required.forEach(function (rel) {
  if (exists(rel)) ok("route " + rel);
  else fail("route " + rel, "missing");
});

/* —— Apps that must NOT be claimed as live product routes —— */
[
  "photo-coach/index.html",
  "signalterrain/index.html",
  "steepleaf/index.html",
  "savant-sommelier/index.html",
  "landscape-interpretation/index.html"
].forEach(function (rel) {
  if (exists(rel)) warn("unexpected live app", rel + " exists — update homepage claims");
  else ok("absent (incubator/direction-only) " + rel);
});

/* —— Homepage IA honesty —— */
var home = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert(home.indexOf("Observe.") !== -1, "homepage missing Observe mission");
assert(home.indexOf("Discover.") !== -1, "homepage missing Discover mission");
assert(home.indexOf("Understand.") !== -1, "homepage missing Understand mission");
assert(home.indexOf("Capture what you find") !== -1, "homepage missing tagline");
assert(home.indexOf("dashboard/") !== -1, "homepage missing Dashboard");
assert(home.indexOf("waypoint-scenes/") !== -1, "homepage missing Scenes");
assert(home.indexOf("sheds/") !== -1, "homepage missing Sheds");
assert(home.indexOf("volunteer/") !== -1, "homepage missing Volunteer");
assert(home.indexOf("incubator/") !== -1, "homepage missing Incubator");
assert(home.indexOf("privacy/") !== -1, "homepage missing privacy link");
assert(home.indexOf("Waypoint’s Take") !== -1 || home.indexOf("Waypoint's Take") !== -1, "homepage missing Waypoint's Take");
assert(home.indexOf("foragecast/") !== -1, "homepage should still link supporting ForageCast");
ok("homepage IA honesty markers");

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

/* —— Dashboard 3.0 modules —— */
try {
  var dashCtx = {
    window: {},
    console: console,
    sessionStorage: {
      _d: {},
      getItem: function (k) { return this._d[k] || null; },
      setItem: function (k, v) { this._d[k] = String(v); }
    },
    localStorage: {
      _d: {},
      getItem: function (k) { return this._d[k] || null; },
      setItem: function (k, v) { this._d[k] = String(v); }
    }
  };
  dashCtx.window = dashCtx;
  function loadDash(rel) {
    vm.runInNewContext(fs.readFileSync(path.join(root, rel), "utf8"), dashCtx);
  }
  loadDash("dashboard/js/widgets.js");
  loadDash("dashboard/js/engine.js");
  loadDash("dashboard/js/layout.js");
  assert(dashCtx.WaypointDashboardWidgets.catalog.length === 13, "expected 13 widgets");
  var demo = dashCtx.WaypointDashboardEngine.demoContext();
  dashCtx.WaypointDashboardWidgets.catalog.forEach(function (w) {
    var built = w.build(demo);
    assert(built.primary && built.take, "widget incomplete: " + w.id);
    assert(/matter|today|favor|keep|verify|build|cool|front|smoke|river|wind|uv|moon|cloud|mile|bank|distance|layer|ease|awareness|short|clearer|patience|patient|overnight|golden|humidity|flexible|surface|official|night|front-load|conditions/i.test(built.take) || built.take.length > 20, "weak take: " + w.id);
  });
  var layout = dashCtx.WaypointDashboardLayout.load();
  assert(layout.order.length === 13, "layout order incomplete");
  assert(layout.enabled.weather === true, "weather should default on");
  assert(layout.enabled.wildlife === false, "wildlife should default off");
  layout.order = dashCtx.WaypointDashboardLayout.move(layout.order, "weather", 1);
  assert(layout.order[1] === "weather" || layout.order[0] !== "weather", "reorder failed");
  var dashHtml = fs.readFileSync(path.join(root, "dashboard/index.html"), "utf8");
  assert(dashHtml.indexOf("Waypoint’s Take") !== -1 || dashHtml.indexOf("Waypoint's Take") !== -1, "dashboard missing Take chrome");
  assert(dashHtml.indexOf("dash-kiosk") !== -1, "dashboard missing kiosk");
  ok("dashboard 3.0 modules");
} catch (err) {
  fail("dashboard 3.0 modules", err.message || err);
}

/* —— Sheds 3.0 —— */
try {
  assert(exists("sheds/sheds.js"), "sheds.js missing");
  assert(exists("sheds/sheds-data.js"), "sheds-data.js missing");
  assert(exists("styles/sheds.css"), "sheds.css missing");
  assert(exists("docs/SHEDS-3.md"), "SHEDS-3.md missing");

  var shedsCtx = { window: {}, console: console };
  shedsCtx.window = shedsCtx;
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "sheds/sheds-data.js"), "utf8"),
    shedsCtx
  );
  var SD = shedsCtx.ShedsData || shedsCtx.window.ShedsData;
  assert(SD, "ShedsData not exported");
  assert(SD.EDUCATION.length >= 6, "education topics incomplete");
  assert(SD.SEASON_MONTHS.length === 12, "season calendar incomplete");
  assert(SD.DEMO_PLACES.length >= 3, "demo places incomplete");
  assert(typeof SD.buildTake === "function", "buildTake missing");
  assert(typeof SD.searchPlaces === "function", "searchPlaces missing");

  var takeFav = SD.buildTake({ month: 1, level: "favorable", educationMode: false });
  assert(takeFav.body && takeFav.body.length > 40, "favorable take too short");
  assert(/Waypoint|today|bench|edge|patient|walk|condition/i.test(takeFav.body), "weak favorable take");
  assert(!/guarantee|sure thing|100%|secret hotspot/i.test(takeFav.body), "take sounds clickbait");

  var takeEdu = SD.buildTake({ month: 6, educationMode: true });
  assert(/Education mode/i.test(takeEdu.body), "edu take missing mode note");

  var levelFeb = SD.conditionLevel(1);
  assert(levelFeb === "favorable", "Feb should be favorable demo window");
  var levelJul = SD.conditionLevel(6);
  assert(levelJul === "poor", "Jul should be quiet demo season");

  var hits = SD.searchPlaces("foothills");
  assert(hits.length >= 1, "search should find foothills demo");

  var shedsHtml = fs.readFileSync(path.join(root, "sheds/index.html"), "utf8");
  assert(
    shedsHtml.indexOf("Waypoint’s Take") !== -1 ||
      shedsHtml.indexOf("Waypoint's Take") !== -1,
    "sheds missing Waypoint's Take"
  );
  assert(shedsHtml.indexOf("sheds-data.js") !== -1, "sheds missing data script");
  assert(shedsHtml.indexOf("theme-sheds") !== -1, "sheds missing theme-sheds");
  assert(shedsHtml.indexOf("sheds-search-input") !== -1, "sheds missing search");
  assert(shedsHtml.indexOf("sheds-edu-list") !== -1, "sheds missing education list");
  assert(shedsHtml.indexOf("sheds-obs-list") !== -1, "sheds missing observations");
  assert(/ethical|Education mode|demo/i.test(shedsHtml), "sheds missing ethics/demo language");

  var shedsCss = fs.readFileSync(path.join(root, "styles/sheds.css"), "utf8");
  assert(
    shedsCss.indexOf("aspen") !== -1 || shedsCss.indexOf("sheds-aspen-gold") !== -1,
    "sheds.css should reference aspen palette"
  );
  assert(shedsCss.indexOf("prefers-reduced-motion") !== -1, "sheds.css missing reduced-motion");

  ok("sheds 3.0 modules");
} catch (err) {
  fail("sheds 3.0 modules", err.message || err);
}

/* —— Internal link scan (sample) —— */
var missingLinks = 0;
var htmlFiles = [];
function walk(dir) {
  fs.readdirSync(dir).forEach(function (name) {
    if (name === ".git" || name === "node_modules" || name === ".tmp-audit") return;
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
