/**
 * SOTA rule metadata for SignalTerrain (SOTA).
 *
 * The Activation Zone is not a radius. SOTA General Rules v1.21 define it as
 * the closed contour at the association Vertical Distance below the summit.
 * Default Vertical Distance is 25 metres unless an Association Manager files
 * a justified exception with the Management Team.
 *
 * Reviewed 2026-09-04 from the English General Rules PDF linked from
 * https://www.sota.org.uk/Joining-In/General-Rules
 */
(function (global) {
  "use strict";

  var GENERAL_RULES = {
    id: "sota-gr-1.21",
    title: "Summits on the Air General Rules",
    version: "1.21",
    date: "2022-06-01",
    reviewedAt: "2026-09-04",
    url: "https://www.sota.org.uk/Joining-In/General-Rules",
    pdf: "https://storage.sota.org.uk/docs/SOTA-General-Rules-June-2022.pdf",
    documentReference: "S0.1",
    defaultVerticalDistanceM: 25,
    units: "metres",
    definition:
      "The Operating Position must lie within a closed contour line at the permitted maximum Vertical Distance below the summit. The Operating Position is the position of the operator.",
    sections: ["3.5", "3.7.1(4)"],
    vehicle:
      "Operations must not be in, or in the close vicinity of, a motor vehicle. No part of the station may be connected in any way to the motor vehicle. All equipment must be carried to the site and operated from a portable power source.",
    qsoNote:
      "Geographic presence inside the Activation Zone is not a completed activation. SOTA requires radio contacts and other expedition criteria.",
    associationNote:
      "Each Association shall define the Vertical Distance, normally 25 metres. For other than 25 m the Association Manager must provide a justifiable case; the Management Team may review it."
  };

  /**
   * Known association Vertical Distance overrides. Empty unless an ARM
   * exception is independently verified. W2 ARM-W2.pdf v1.3 (2010-05-01) is
   * registered in the SOTA API but was not independently retrieved; W2 uses
   * the General Rules default of 25 m.
   */
  var ASSOCIATION_OVERRIDES = {};

  function associationCodeOf(summit) {
    if (!summit) return null;
    if (summit.associationCode) return String(summit.associationCode);
    var ref = summit.reference || summit.id || "";
    var m = /^([A-Z0-9]+)\/./i.exec(ref);
    return m ? m[1].toUpperCase() : null;
  }

  function ruleForSummit(summit) {
    var code = associationCodeOf(summit);
    if (!GENERAL_RULES || GENERAL_RULES.defaultVerticalDistanceM == null) {
      return {
        status: "unavailable",
        reason: "Applicable SOTA rule metadata is unavailable.",
        associationCode: code,
        verticalDistanceM: null,
        source: null
      };
    }
    var override = code && ASSOCIATION_OVERRIDES[code] ? ASSOCIATION_OVERRIDES[code] : null;
    return {
      status: "ok",
      reason: null,
      associationCode: code,
      verticalDistanceM: override && override.verticalDistanceM != null ? override.verticalDistanceM : GENERAL_RULES.defaultVerticalDistanceM,
      units: "metres",
      source: GENERAL_RULES,
      override: override,
      applicability:
        override && override.reason
          ? override.reason
          : code === "W2"
            ? "W2 (USA — NJ / NY) uses the SOTA General Rules default Vertical Distance of 25 m. ARM-W2.pdf v1.3 (2010-05-01) is registered in the SOTA API but was not independently retrieved; no AM exception for other than 25 m is on file."
            : "Uses the SOTA General Rules default Vertical Distance of 25 m unless an Association Manager exception is recorded."
    };
  }

  function thresholdM(summitElevationM, rule) {
    if (typeof summitElevationM !== "number" || !isFinite(summitElevationM)) return null;
    var vd = rule && typeof rule.verticalDistanceM === "number" ? rule.verticalDistanceM : null;
    if (vd == null) return null;
    return summitElevationM - vd;
  }

  var api = {
    GENERAL_RULES: GENERAL_RULES,
    ASSOCIATION_OVERRIDES: ASSOCIATION_OVERRIDES,
    associationCodeOf: associationCodeOf,
    ruleForSummit: ruleForSummit,
    thresholdM: thresholdM
  };

  global.SignalTerrainSotaRules = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.Rules = api;
})(typeof window !== "undefined" ? window : globalThis);
