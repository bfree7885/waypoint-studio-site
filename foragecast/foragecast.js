(function () {
  "use strict";

  var form = document.getElementById("morelcast-form");
  var resultPanel = document.getElementById("field-read-result");
  if (!form || !resultPanel) return;

  var timingEl = document.getElementById("result-timing");
  var confidenceEl = document.getElementById("result-confidence");
  var explanationEl = document.getElementById("result-explanation");
  var ethicalEl = document.getElementById("result-ethical");

  var TIMING_CLASS = {
    Early: "timing-early",
    Improving: "timing-improving",
    Prime: "timing-prime",
    Late: "timing-late",
    Poor: "timing-poor"
  };

  function getValues() {
    return {
      state: form.state.value,
      region: form.region.value.trim(),
      elevation: form.elevation.value,
      rainfall: form.rainfall.value,
      temperature: form.temperature.value,
      forest: form.forest.value
    };
  }

  function generateFieldRead(input) {
    var timing = "Improving";
    var confidence = "Medium";
    var explanation = "";
    var regionNote = input.region
      ? " for " + input.region + ", " + input.state
      : " in " + input.state;

    if (input.temperature === "cold") {
      timing = "Early";
      explanation =
        "Conditions suggest the season is still opening" +
        regionNote +
        ". Soil warmth is likely limited at this elevation band — watch for several days of sustained warming before expecting meaningful morel activity.";
    } else if (input.temperature === "warm" && input.rainfall === "dry") {
      timing = input.elevation === "high" ? "Poor" : "Late";
      explanation =
        "Warm, dry conditions often push morel windows past peak" +
        regionNote +
        ". Moisture recharge may be needed before new flushes appear, especially on south-facing slopes.";
    } else if (
      input.temperature === "warming" &&
      (input.rainfall === "moderate" || input.rainfall === "wet") &&
      (input.forest === "mixed" || input.forest === "ash")
    ) {
      timing =
        input.rainfall === "wet" && input.forest === "ash" ? "Prime" : "Improving";
      explanation =
        "Warming soils with recent moisture align with typical morel timing" +
        regionNote +
        ". Mixed hardwood and disturbed hardwood edges often respond first — look for south- and east-facing benches with leaf litter and adequate drainage.";
    } else if (input.temperature === "warming" && input.rainfall === "dry") {
      timing = "Improving";
      confidence = "Low";
      explanation =
        "Temperature is moving in the right direction" +
        regionNote +
        ", but dry recent conditions may delay fruiting. Rain within the next week would improve outlook.";
    } else if (input.temperature === "warm") {
      timing = "Late";
      explanation =
        "Extended warmth suggests the main window may be narrowing" +
        regionNote +
        ". Focus on north-facing slopes, draws, and areas that retained moisture.";
    } else {
      timing = "Improving";
      explanation =
        "Mixed signals in current conditions" +
        regionNote +
        ". Field observation and local habitat knowledge remain essential — use this read as context, not certainty.";
    }

    if (input.forest === "conifer") {
      confidence = "Low";
      explanation +=
        " Conifer-heavy forest reduces morel confidence here — consider nearby hardwood transitions or riparian edges.";
      if (timing === "Prime") timing = "Improving";
    } else if (input.forest === "unknown") {
      confidence = confidence === "High" ? "Medium" : "Low";
      explanation +=
        " Forest type is uncertain — habitat clarity would improve this estimate.";
    } else if (
      (input.forest === "mixed" || input.forest === "ash") &&
      (timing === "Prime" || timing === "Improving")
    ) {
      confidence = "High";
    }

    if (input.elevation === "high" && timing === "Prime") {
      timing = "Improving";
      explanation +=
        " Higher elevation bands often lag lowland timing by one to two weeks.";
    }

    var ethicalNote =
      "This read is not permission to enter private land, protected areas, or closed zones. Confirm ownership, follow local regulations, identify every specimen with an expert source before consumption, and harvest lightly.";

    return {
      timing: timing,
      confidence: confidence,
      explanation: explanation,
      ethicalNote: ethicalNote
    };
  }

  function setTimingDisplay(timing) {
    timingEl.textContent = timing;
    timingEl.className = TIMING_CLASS[timing] || "";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var read = generateFieldRead(getValues());
    setTimingDisplay(read.timing);
    confidenceEl.textContent = read.confidence;
    explanationEl.textContent = read.explanation;
    ethicalEl.textContent = read.ethicalNote;
    resultPanel.classList.add("is-visible");
    resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
})();
