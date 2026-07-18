/**
 * Waypoint Volunteer — catalog builder
 * Merges base opportunities + enrichment + model normalization.
 */
(function (global) {
  "use strict";

  function build() {
    var raw =
      (global.VolunteerOpportunities && global.VolunteerOpportunities.list) ||
      [];
    var enrich =
      (global.VolunteerOpportunityEnrichment &&
        global.VolunteerOpportunityEnrichment.byId) ||
      {};
    var normalize =
      (global.VolunteerModel && global.VolunteerModel.normalizeOpportunity) ||
      function (o) {
        return o;
      };

    var byId = {};
    var list = [];

    raw.forEach(function (item) {
      var merged = Object.assign({}, item, enrich[item.id] || {});
      var norm = normalize(merged);
      byId[norm.id] = norm;
      list.push(norm);
    });

    Object.keys(enrich).forEach(function (id) {
      if (byId[id]) return;
      var extra = enrich[id];
      if (!extra || !extra.title) return;
      var standalone = Object.assign({ id: id }, extra);
      var norm = normalize(standalone);
      byId[norm.id] = norm;
      list.push(norm);
    });

    global.VolunteerOpportunities = {
      list: list,
      byId: byId,
      get: function (id) {
        return byId[id] || null;
      },
      citizenScience: function () {
        return list.filter(function (o) {
          return o.isCitizenScience;
        });
      },
      byOrganization: function (orgId) {
        return list.filter(function (o) {
          return o.organizationId === orgId;
        });
      },
      byType: function (typeId) {
        return list.filter(function (o) {
          return o.opportunityType === typeId;
        });
      }
    };
  }

  build();
  global.VolunteerCatalog = { rebuild: build };
})(typeof window !== "undefined" ? window : this);
