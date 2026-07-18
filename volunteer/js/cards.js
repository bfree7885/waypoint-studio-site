/**
 * Waypoint Volunteer — opportunity card renderer
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function orgName(opp) {
    var org =
      global.VolunteerOrganizations &&
      global.VolunteerOrganizations.get(opp.organizationId);
    return org ? org.name : "Organization";
  }

  function categoryMeta(opp) {
    var cat =
      global.VolunteerCategories && global.VolunteerCategories.get(opp.category);
    return cat || { label: opp.category, color: "#8b9bb8", shortLabel: opp.category };
  }

  function distanceLabel(opp) {
    if (opp.distanceMiles == null) return "Distance unknown";
    if (opp.distanceMiles < 1) return "Under 1 mi";
    return opp.distanceMiles + " mi";
  }

  function boolChip(on, label) {
    if (!on) return "";
    return (
      '<span class="vol-chip vol-chip-soft">' + escapeHtml(label) + "</span>"
    );
  }

  function renderCard(opp, options) {
    var opts = options || {};
    var cat = categoryMeta(opp);
    var planning = global.VolunteerPlanning;
    var saved = planning && planning.isSaved(opp.id);
    var interested = planning && planning.isInterested(opp.id);
    var onList = planning && planning.isOnPersonalList(opp.id);
    var orgBookmarked =
      planning && planning.isOrgBookmarked(opp.organizationId);
    var selected = opts.selectedId === opp.id;
    var expanded = opts.expandedId === opp.id;

    var skills =
      opp.requiredSkills && opp.requiredSkills.length
        ? opp.requiredSkills.join(", ")
        : "None required";
    var clothing =
      opp.suggestedClothing && opp.suggestedClothing.length
        ? opp.suggestedClothing.join(", ")
        : "Everyday clothes are fine";
    var access = opp.accessibility
      ? opp.accessibility.summary +
        (opp.accessibility.notes ? " " + opp.accessibility.notes : "")
      : "Not specified";

    var detailId = "vol-card-detail-" + opp.id;

    return (
      '<article class="vol-card' +
      (selected ? " is-selected" : "") +
      (expanded ? " is-expanded" : "") +
      '" data-opp-id="' +
      escapeHtml(opp.id) +
      '" style="--vol-cat-color:' +
      escapeHtml(cat.color) +
      '">' +
      '<header class="vol-card-head">' +
      '<span class="vol-card-cat" title="' +
      escapeHtml(cat.label) +
      '">' +
      escapeHtml(cat.shortLabel) +
      "</span>" +
      "<h3 class=\"vol-card-title\">" +
      escapeHtml(opp.title) +
      "</h3>" +
      '<p class="vol-card-org">' +
      escapeHtml(orgName(opp)) +
      "</p>" +
      "</header>" +
      '<div class="vol-card-meta" aria-label="Opportunity details">' +
      '<span class="vol-meta-item">' +
      escapeHtml(distanceLabel(opp)) +
      "</span>" +
      '<span class="vol-meta-item">' +
      escapeHtml(opp.estimatedCommitment) +
      "</span>" +
      '<span class="vol-meta-item">' +
      escapeHtml(opp.indoorOutdoor === "indoor" ? "Indoor" : "Outdoor") +
      "</span>" +
      '<span class="vol-meta-item">' +
      escapeHtml(opp.physicalIntensity) +
      "</span>" +
      "</div>" +
      '<div class="vol-card-chips">' +
      boolChip(opp.familyFriendly, "Family friendly") +
      boolChip(opp.petFriendly, "Pet friendly") +
      boolChip(
        opp.accessibility && opp.accessibility.wheelchairAccess,
        "Accessible"
      ) +
      boolChip(opp.weekdayWeekend === "weekend", "Weekend") +
      boolChip(opp.weekdayWeekend === "weekday", "Weekday") +
      "</div>" +
      '<p class="vol-card-desc">' +
      escapeHtml(opp.description) +
      "</p>" +
      '<div class="vol-card-actions" role="group" aria-label="Personal planning">' +
      '<button type="button" class="vol-action' +
      (saved ? " is-on" : "") +
      '" data-action="save" aria-pressed="' +
      (saved ? "true" : "false") +
      '">Save</button>' +
      '<button type="button" class="vol-action' +
      (interested ? " is-on" : "") +
      '" data-action="interested" aria-pressed="' +
      (interested ? "true" : "false") +
      '">Interested</button>' +
      '<button type="button" class="vol-action' +
      (onList ? " is-on" : "") +
      '" data-action="list" aria-pressed="' +
      (onList ? "true" : "false") +
      '">My list</button>' +
      '<button type="button" class="vol-action" data-action="hide">Hide</button>' +
      '<button type="button" class="vol-action' +
      (orgBookmarked ? " is-on" : "") +
      '" data-action="org" aria-pressed="' +
      (orgBookmarked ? "true" : "false") +
      '">Bookmark org</button>' +
      "</div>" +
      '<button type="button" class="vol-card-more" data-action="toggle-detail" aria-expanded="' +
      (expanded ? "true" : "false") +
      '" aria-controls="' +
      detailId +
      '">' +
      (expanded ? "Hide details" : "More details") +
      "</button>" +
      '<div class="vol-card-detail" id="' +
      detailId +
      '"' +
      (expanded ? "" : " hidden") +
      ">" +
      "<dl class=\"vol-detail-dl\">" +
      "<div><dt>Accessibility</dt><dd>" +
      escapeHtml(access) +
      "</dd></div>" +
      "<div><dt>Skills</dt><dd>" +
      escapeHtml(skills) +
      "</dd></div>" +
      "<div><dt>Suggested clothing</dt><dd>" +
      escapeHtml(clothing) +
      "</dd></div>" +
      "<div><dt>Seasonality</dt><dd>" +
      escapeHtml((opp.seasonality || []).join(", ") || "Year-round") +
      "</dd></div>" +
      "<div><dt>Schedule</dt><dd>" +
      escapeHtml(opp.scheduleHint || "See organization") +
      "</dd></div>" +
      "<div><dt>Location</dt><dd>" +
      escapeHtml(opp.locationLabel || "") +
      "</dd></div>" +
      "</dl>" +
      '<div class="vol-card-links">' +
      (opp.officialWebsite
        ? '<a class="vol-link" href="' +
          escapeHtml(opp.officialWebsite) +
          '" target="_blank" rel="noopener noreferrer">Official website</a>'
        : "") +
      (opp.applicationLink
        ? '<a class="vol-link vol-link-accent" href="' +
          escapeHtml(opp.applicationLink) +
          '" target="_blank" rel="noopener noreferrer">Application / signup</a>'
        : "") +
      '<button type="button" class="vol-link" data-action="focus-map">Show on map</button>' +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function renderList(opportunities, options) {
    if (!opportunities || !opportunities.length) {
      return (
        '<div class="vol-empty" role="status">' +
        "<h3>Nothing matches right now</h3>" +
        "<p>Try widening distance, clearing a filter, or checking your personal list later. There’s still good to do — just not in this slice.</p>" +
        "</div>"
      );
    }
    return opportunities
      .map(function (opp) {
        return renderCard(opp, options);
      })
      .join("");
  }

  global.VolunteerCards = {
    renderCard: renderCard,
    renderList: renderList,
    escapeHtml: escapeHtml
  };
})(typeof window !== "undefined" ? window : this);
