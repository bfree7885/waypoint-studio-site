/**
 * Sheds 3.0 — educational content, seasonality, demo places, and Take builders.
 * Illustrative only. Not a prediction model or legal authority.
 */
(function (global) {
  "use strict";

  var DEMO_PLACES = [
    { name: "Central PA foothills (demo)", lat: 40.78, lon: -77.86, note: "Default field area" },
    { name: "Allegheny Plateau edge (demo)", lat: 41.15, lon: -78.45, note: "Mixed hardwood benches" },
    { name: "Ridge-and-valley demo", lat: 40.55, lon: -77.35, note: "South aspects & saddles" },
    { name: "Lake Erie plain (demo)", lat: 42.05, lon: -80.15, note: "Flat timber edges" },
    { name: "Poconos foothills (demo)", lat: 41.05, lon: -75.35, note: "Hemlock draws" }
  ];

  var EDUCATION = [
    {
      id: "behavior",
      title: "Deer behavior",
      summary: "Bucks shift bedding and travel after pressure and weather swings.",
      body:
        "After cold fronts, deer often move earlier toward thermal cover and browse. Midday beds favor thick cover with a wind advantage. Shed season movement is quieter than rut travel — think short loops between bedding and food, not long daylight marches."
    },
    {
      id: "habitat",
      title: "Habitat edges",
      summary: "Transition zones hold more sign than pure open or pure timber.",
      body:
        "Look where two cover types meet: cutover into timber, swamp edge into cedar, south bench into thicket. Edges concentrate travel because they offer security and food within a few steps. Demo zone fills on the map illustrate this idea — they are not hotspot guarantees."
    },
    {
      id: "food",
      title: "Food sources",
      summary: "Late-winter browse and leftover mast shape where antlers drop.",
      body:
        "As mast depletes, deer lean on woody browse, winter wheat, and leftover agricultural edges where legal and accessible. Fresh tracks near food do not equal shed certainty — they only show recent use. Follow the corridor that connects food to bedding rather than circling a single oak."
    },
    {
      id: "terrain",
      title: "Terrain & aspect",
      summary: "Warm aspects and soft snowline edges reward patient walks.",
      body:
        "South and southwest benches catch sun after cold nights and often melt first. Leeward timber holds deer when wind is sharp. Saddles and finger ridges act as funnels. Learn to read slope and aspect before trusting any overlay — Education mode hides hotspot fills so terrain stays the teacher."
    },
    {
      id: "weather",
      title: "Weather timing",
      summary: "Calm after a front often beats raw cold for finding sign.",
      body:
        "Hard freezes lock ground and hide small antlers under crust. Softening days after a thaw expose drop zones on south faces. High wind pushes deer into lee cover; glassing open ridges then is usually quiet. Conditions labels in Sheds are seasonal demos — verify with your own sky and thermometer."
    },
    {
      id: "timing",
      title: "Season timing",
      summary: "Late winter into early spring is classic shed window in much of the Northeast.",
      body:
        "Most bucks in temperate hardwood country drop between late winter and early spring, with local variation. Closed hunting seasons and posted land still apply — shed hunting ethics mean permission, respect for nesting wildlife, and Education mode when pressure should stay low. Always confirm dates with your state wildlife agency."
    }
  ];

  var SEASON_MONTHS = [
    { m: 0, label: "Jan", phase: "early-drop", hint: "Cold beds · south benches" },
    { m: 1, label: "Feb", phase: "peak-window", hint: "Prime walk window (demo)" },
    { m: 2, label: "Mar", phase: "peak-window", hint: "Thaw edges · soft snowline" },
    { m: 3, label: "Apr", phase: "late-window", hint: "Green-up · harder finds" },
    { m: 4, label: "May", phase: "off", hint: "Learn habitat · low pressure" },
    { m: 5, label: "Jun", phase: "off", hint: "Education & scouting notes" },
    { m: 6, label: "Jul", phase: "off", hint: "Velvet growth · stay light" },
    { m: 7, label: "Aug", phase: "off", hint: "Pattern food · ethics first" },
    { m: 8, label: "Sep", phase: "pre", hint: "Pre-season terrain study" },
    { m: 9, label: "Oct", phase: "pre", hint: "Rut nearby · not shed focus" },
    { m: 10, label: "Nov", phase: "pre", hint: "Pressure high · Education mode" },
    { m: 11, label: "Dec", phase: "early-drop", hint: "Early drops possible (demo)" }
  ];

  var REGULATIONS = {
    headline: "Regulations — verify locally",
    points: [
      "Shed hunting rules vary by state, season, and land ownership.",
      "This prototype never shows live parcel or property boundaries.",
      "Treat every overlay as educational demo data — not permission to enter.",
      "When in doubt: ask landowners, check state wildlife pages, and prefer Education mode."
    ],
    agencyHint: "Confirm seasons and methods with your state wildlife agency before you walk."
  };

  var LAYER_COPY = {
    zones: "Illustrative interest polygons around the map center — not a find forecast.",
    season: "Season strip shows a Northeast-oriented demo calendar for learning timing.",
    predict: "Prediction tint is a teaching layer (aspect + cover heuristics), not AI certainty.",
    regs: "Regulation reminders stay on-map as text — never automated legal advice."
  };

  function monthIndex(d) {
    return (d || new Date()).getMonth();
  }

  function seasonPhase(month) {
    var row = SEASON_MONTHS[month];
    return row ? row.phase : "off";
  }

  function conditionLevel(month) {
    var phase = seasonPhase(month);
    if (phase === "peak-window") return "favorable";
    if (phase === "early-drop" || phase === "late-window") return "fair";
    return "poor";
  }

  var READS = {
    favorable: {
      level: "favorable",
      label: "Favorable",
      opportunity: "South benches & soft edges — demo",
      why: "Warm aspects hold sun after cold nights; thaw lines often expose drop zones first."
    },
    fair: {
      level: "fair",
      label: "Fair",
      opportunity: "Lee-side timber transitions — demo",
      why: "Mixed thermal cover; check where bedding brush meets travel benches."
    },
    poor: {
      level: "poor",
      label: "Quiet season",
      opportunity: "Terrain study first — demo",
      why: "Outside the classic drop window. Use Education mode and build habitat literacy."
    }
  };

  function buildTake(opts) {
    opts = opts || {};
    var month = typeof opts.month === "number" ? opts.month : monthIndex();
    var level = opts.level || conditionLevel(month);
    var edu = !!opts.educationMode;
    var phase = seasonPhase(month);
    var seasonRow = SEASON_MONTHS[month];

    if (edu) {
      return {
        title: "Waypoint’s Take",
        body:
          "Education mode is on — hotspot-style fills stay hidden so the land can teach. Read aspect, cover edges, and food-to-bed corridors without adding pressure. " +
          (seasonRow ? seasonRow.hint + "." : ""),
        footer: "Why it matters today · ethics first"
      };
    }

    if (level === "favorable") {
      return {
        title: "Waypoint’s Take",
        body:
          "Today’s seasonal demo read favors patient walks on sun-warmed benches and soft snowline edges. " +
          "That does not mean antlers are waiting — it means the physical conditions that often uncover sign are more cooperative. Move slow, glass twice, and leave no trace.",
        footer: "Why it matters today · demo seasonality"
      };
    }

    if (level === "fair") {
      return {
        title: "Waypoint’s Take",
        body:
          "Conditions look workable but not generous. Lee timber and transition edges deserve more attention than open flats. " +
          "If the ground is locked or wind is sharp, shorten the loop and treat the outing as a terrain lesson.",
        footer: "Why it matters today · calm judgment"
      };
    }

    return {
      title: "Waypoint’s Take",
      body:
        phase === "pre"
          ? "We are outside the shed-focused window. Use the map to study saddles, south aspects, and cover edges so winter walks start with a mental model — not a hotspot chase."
          : "Quiet conditions favor learning over searching. Open Education mode, skim habitat notes, and save private observations for places you already have permission to walk.",
      footer: "Why it matters today · learn the land"
    };
  }

  function searchPlaces(query) {
    var q = String(query || "")
      .trim()
      .toLowerCase();
    if (!q) return DEMO_PLACES.slice();
    return DEMO_PLACES.filter(function (p) {
      return (
        p.name.toLowerCase().indexOf(q) !== -1 ||
        (p.note && p.note.toLowerCase().indexOf(q) !== -1)
      );
    });
  }

  function zoneExplain(level) {
    if (level === "high") {
      return "Higher relative interest (demo): warm aspect + cover edge heuristic.";
    }
    if (level === "medium") {
      return "Moderate (demo): timber edge / travel transition.";
    }
    return "Lower (demo): open or less structured cover — still useful for learning.";
  }

  global.ShedsData = {
    DEMO_PLACES: DEMO_PLACES,
    EDUCATION: EDUCATION,
    SEASON_MONTHS: SEASON_MONTHS,
    REGULATIONS: REGULATIONS,
    LAYER_COPY: LAYER_COPY,
    READS: READS,
    monthIndex: monthIndex,
    seasonPhase: seasonPhase,
    conditionLevel: conditionLevel,
    buildTake: buildTake,
    searchPlaces: searchPlaces,
    zoneExplain: zoneExplain
  };
})(typeof window !== "undefined" ? window : globalThis);
