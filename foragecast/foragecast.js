(function () {
  "use strict";

  var TIMING_CLASS = {
    Early: "timing-early",
    Improving: "timing-improving",
    Prime: "timing-prime",
    Late: "timing-late",
    Poor: "timing-poor"
  };

  var GLOBAL_DISCLAIMER =
    "ForageCast is an environmental guidance tool, not a guarantee of presence, safety, legality, or edibility. Always confirm identification and follow local regulations.";

  function computeMorelRead(input) {
    var timing = "Improving";
    var confidence = "Medium";
    var explanation = "";
    var whyBullets = [];
    var regionNote = input.region
      ? " for " + input.region + ", " + input.state
      : " in " + input.state;

    /* —— Moisture signal —— */
    var moistureSignal = "Neutral";
    if (input.rainfall === "wet") {
      moistureSignal = "Supportive";
      whyBullets.push("Recent moisture supports fungal activity.");
    } else if (input.rainfall === "moderate") {
      moistureSignal = "Adequate";
      whyBullets.push("Moderate recent rainfall may support fruiting where soils drain well.");
    } else {
      moistureSignal = "Limited";
      whyBullets.push("Dry recent conditions may suppress new flushes until moisture returns.");
    }

    /* —— Temperature signal —— */
    var temperatureSignal = "Neutral";
    if (input.temperature === "cold") {
      temperatureSignal = "Below seasonal threshold";
      timing = "Early";
      whyBullets.push("Cold trend suggests soil warmth is still building.");
      explanation =
        "Conditions suggest the season is still opening" +
        regionNote +
        ". Soil warmth is likely limited — watch for sustained warming before expecting meaningful morel activity.";
    } else if (input.temperature === "warming") {
      temperatureSignal = "Advancing";
      whyBullets.push("Warming trend suggests seasonal emergence may be advancing.");
    } else {
      temperatureSignal = "Extended warmth";
      whyBullets.push("Extended warmth may narrow the remaining window in this band.");
    }

    /* —— Habitat signal —— */
    var habitatSignal = "Neutral";
    if (input.forest === "ash") {
      habitatSignal = "Favorable — disturbed hardwood";
      whyBullets.push("Ash / elm / apple habitat is commonly associated with morel searching.");
    } else if (input.forest === "mixed") {
      habitatSignal = "Favorable — mixed hardwood";
      whyBullets.push("Mixed hardwood edges and transitions often hold early morel activity.");
    } else if (input.forest === "conifer") {
      habitatSignal = "Low suitability";
      whyBullets.push("Conifer-heavy cover typically lowers morel habitat confidence.");
    } else {
      habitatSignal = "Uncertain";
      whyBullets.push("Forest type is unknown — habitat clarity would improve this estimate.");
    }

    /* —— Elevation note —— */
    var elevationNote = "Mid elevation — typical regional timing.";
    if (input.elevation === "high") {
      elevationNote = "High elevation — timing often lags lowlands by one to two weeks.";
      whyBullets.push("High elevation may delay timing relative to surrounding valleys.");
    } else if (input.elevation === "low") {
      elevationNote = "Low elevation — season may open earlier than upland sites.";
      whyBullets.push("Low elevation sites often warm first and may lead regional timing.");
    }

    /* —— Timing rules —— */
    if (input.temperature === "cold") {
      timing = "Early";
    } else if (input.temperature === "warm" && input.rainfall === "dry") {
      timing = input.elevation === "high" ? "Poor" : "Late";
      if (!explanation) {
        explanation =
          "Warm, dry conditions often push morel windows past peak" +
          regionNote +
          ". Moisture recharge may be needed before new flushes appear.";
      }
    } else if (
      input.temperature === "warming" &&
      (input.rainfall === "moderate" || input.rainfall === "wet") &&
      (input.forest === "mixed" || input.forest === "ash")
    ) {
      timing =
        input.rainfall === "wet" && input.forest === "ash" ? "Prime" : "Improving";
      if (!explanation) {
        explanation =
          "Warming soils with recent moisture align with typical morel timing" +
          regionNote +
          ". Look for south- and east-facing benches with leaf litter and adequate drainage.";
      }
    } else if (input.temperature === "warming" && input.rainfall === "dry") {
      timing = "Improving";
      confidence = "Low";
      if (!explanation) {
        explanation =
          "Temperature is moving favorably" +
          regionNote +
          ", but dry conditions may delay fruiting until rain returns.";
      }
    } else if (input.temperature === "warm") {
      timing = "Late";
      if (!explanation) {
        explanation =
          "Extended warmth suggests the main window may be narrowing" +
          regionNote +
          ". Focus on north-facing slopes and moisture-retaining draws.";
      }
    } else if (!explanation) {
      explanation =
        "Mixed environmental signals" +
        regionNote +
        ". Use this read as context alongside field observation.";
    }

    /* —— Confidence & habitat adjustments —— */
    if (input.forest === "conifer") {
      confidence = "Low";
      if (timing === "Prime") timing = "Improving";
      explanation +=
        " Conifer-heavy forest reduces morel confidence — consider nearby hardwood transitions.";
    } else if (input.forest === "unknown") {
      confidence = confidence === "High" ? "Medium" : "Low";
    } else if (
      (input.forest === "mixed" || input.forest === "ash") &&
      (timing === "Prime" || timing === "Improving")
    ) {
      confidence = "High";
    }

    if (input.elevation === "high" && timing === "Prime") {
      timing = "Improving";
      explanation += " Higher elevation often moderates peak timing.";
    }

    if (input.elevation === "low" && timing === "Early" && input.temperature === "warming") {
      timing = "Improving";
    }

    var ethicalNote =
      "This read is not permission to enter private land or protected areas. Confirm ownership, follow local regulations, identify every specimen with an expert source before consumption, and harvest lightly. " +
      GLOBAL_DISCLAIMER;

    return {
      timing: timing,
      confidence: confidence,
      explanation: explanation,
      ethicalNote: ethicalNote,
      moistureSignal: moistureSignal,
      temperatureSignal: temperatureSignal,
      habitatSignal: habitatSignal,
      elevationNote: elevationNote,
      whyBullets: whyBullets
    };
  }

  function getFormValues(form) {
    return {
      state: form.state.value,
      region: form.region.value.trim(),
      elevation: form.elevation.value,
      rainfall: form.rainfall.value,
      temperature: form.temperature.value,
      forest: form.forest.value
    };
  }

  function setTimingEl(el, timing) {
    el.textContent = timing;
    el.className = TIMING_CLASS[timing] || "";
  }

  function bindManualForm() {
    var form = document.getElementById("manual-form");
    var panel = document.getElementById("manual-result");
    if (!form || !panel) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var read = computeMorelRead(getFormValues(form));
      setTimingEl(document.getElementById("manual-timing"), read.timing);
      document.getElementById("manual-confidence").textContent = read.confidence;
      document.getElementById("manual-explanation").textContent = read.explanation;
      document.getElementById("manual-ethical").textContent = read.ethicalNote;
      panel.classList.add("is-visible");
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function bindWeatherForm() {
    var form = document.getElementById("weather-form");
    var panel = document.getElementById("weather-result");
    if (!form || !panel) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var read = computeMorelRead(getFormValues(form));
      setTimingEl(document.getElementById("weather-timing"), read.timing);
      document.getElementById("weather-confidence").textContent = read.confidence;
      document.getElementById("weather-moisture").textContent = read.moistureSignal;
      document.getElementById("weather-temperature-signal").textContent =
        read.temperatureSignal;
      document.getElementById("weather-habitat").textContent = read.habitatSignal;
      document.getElementById("weather-elevation-note").textContent =
        read.elevationNote;
      document.getElementById("weather-explanation").textContent = read.explanation;
      document.getElementById("weather-ethical").textContent = read.ethicalNote;

      var whyList = document.getElementById("weather-why");
      whyList.innerHTML = "";
      read.whyBullets.forEach(function (bullet) {
        var li = document.createElement("li");
        li.textContent = bullet;
        whyList.appendChild(li);
      });

      panel.classList.add("is-visible");
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  bindWeatherForm();
  bindManualForm();
})();
