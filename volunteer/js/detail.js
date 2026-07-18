/**
 * Waypoint Volunteer — opportunity + organization detail renderers
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

  function typeLabel(opp) {
    var t =
      global.VolunteerModel &&
      global.VolunteerModel.byId.opportunityTypes[opp.opportunityType];
    return t ? t.label : opp.opportunityType || "Opportunity";
  }

  function demandLabel(opp) {
    var d =
      global.VolunteerModel &&
      global.VolunteerModel.byId.physicalDemand[
        opp.physicalDemand || opp.physicalIntensity
      ];
    return d ? d.label : opp.physicalDemand || "Moderate";
  }

  function weatherLabel(opp) {
    var w =
      global.VolunteerModel &&
      global.VolunteerModel.byId.weatherSensitivity[opp.weatherSensitivity];
    return w ? w.label : "See details";
  }

  function durationLabel(opp) {
    if (opp.estimatedCommitment) return opp.estimatedCommitment;
    if (opp.durationMinutes) {
      if (opp.durationMinutes < 60) return opp.durationMinutes + " minutes";
      var h = Math.round((opp.durationMinutes / 60) * 10) / 10;
      return h + " hour" + (h === 1 ? "" : "s");
    }
    return "Varies";
  }

  function renderOpportunityPage(opp, options) {
    var opts = options || {};
    var org =
      global.VolunteerOrganizations &&
      global.VolunteerOrganizations.get(opp.organizationId);
    var planning = global.VolunteerPlanning;
    var base = opts.linkBase || "";
    var cat =
      global.VolunteerCategories && global.VolunteerCategories.get(opp.category);
    var program =
      opp.citizenScienceProgram &&
      global.VolunteerModel &&
      global.VolunteerModel.byId.citizenSciencePrograms[opp.citizenScienceProgram];

    var access = opp.accessibility
      ? escapeHtml(opp.accessibility.summary) +
        (opp.accessibility.notes
          ? " " + escapeHtml(opp.accessibility.notes)
          : "")
      : "Not specified — contact the organization.";

    var equipment =
      opp.equipment && opp.equipment.length
        ? opp.equipment.map(escapeHtml).join(", ")
        : "None required beyond everyday clothes.";

    var skills =
      opp.skills && opp.skills.length
        ? opp.skills
            .map(function (s) {
              var meta =
                global.VolunteerModel && global.VolunteerModel.byId.skills[s];
              return escapeHtml(meta ? meta.label : s);
            })
            .join(", ")
        : "None required.";

    var saved = planning && planning.isSaved(opp.id);
    var completed = planning && planning.isCompleted(opp.id);
    var note = planning ? planning.getNote(opp.id) : "";

    return (
      '<article class="vol-detail" style="--vol-cat-color:' +
      escapeHtml((cat && cat.color) || "#8b9bb8") +
      '">' +
      '<p class="vol-detail-kicker">' +
      escapeHtml(typeLabel(opp)) +
      (opp.isCitizenScience ? " · Citizen science" : "") +
      "</p>" +
      "<h1>" +
      escapeHtml(opp.title) +
      "</h1>" +
      '<p class="vol-detail-org">' +
      (org
        ? '<a href="' +
          escapeHtml(base + "organization/?id=" + org.id) +
          '">' +
          escapeHtml(org.name) +
          "</a>"
        : "Organization") +
      "</p>" +
      (program
        ? '<p class="muted">Program: ' + escapeHtml(program.label) + "</p>"
        : "") +
      '<section class="vol-detail-section" aria-labelledby="vol-what">' +
      '<h2 id="vol-what">What you’ll do</h2>' +
      "<p>" +
      escapeHtml(opp.whatYoullDo || opp.description) +
      "</p>" +
      "</section>" +
      '<section class="vol-detail-section" aria-labelledby="vol-why">' +
      '<h2 id="vol-why">Why it matters</h2>' +
      "<p>" +
      escapeHtml(opp.whyItMatters) +
      "</p>" +
      '<p class="muted">We describe impact honestly — never exaggerated.</p>' +
      "</section>" +
      '<section class="vol-detail-section" aria-labelledby="vol-who">' +
      '<h2 id="vol-who">Who benefits</h2>' +
      "<p>" +
      escapeHtml(opp.whoBenefits) +
      "</p>" +
      "</section>" +
      '<section class="vol-detail-section" aria-labelledby="vol-facts">' +
      '<h2 id="vol-facts">Practical details</h2>' +
      '<dl class="vol-detail-dl">' +
      "<div><dt>Expected time</dt><dd>" +
      escapeHtml(durationLabel(opp)) +
      "</dd></div>" +
      "<div><dt>Difficulty / physical demand</dt><dd>" +
      escapeHtml(demandLabel(opp)) +
      "</dd></div>" +
      "<div><dt>Setting</dt><dd>" +
      escapeHtml(
        opp.remote
          ? "Remote"
          : opp.indoorOutdoor === "indoor"
            ? "Indoors"
            : "Outdoors"
      ) +
      "</dd></div>" +
      "<div><dt>Accessibility</dt><dd>" +
      access +
      "</dd></div>" +
      "<div><dt>Age</dt><dd>" +
      escapeHtml(
        (opp.ageRequirements && opp.ageRequirements.summary) || "See organization"
      ) +
      "</dd></div>" +
      "<div><dt>Skills</dt><dd>" +
      skills +
      "</dd></div>" +
      "<div><dt>Equipment</dt><dd>" +
      equipment +
      "</dd></div>" +
      "<div><dt>Weather</dt><dd>" +
      escapeHtml(weatherLabel(opp)) +
      "</dd></div>" +
      "<div><dt>Schedule</dt><dd>" +
      escapeHtml(
        (opp.schedule && opp.schedule.hint) || opp.scheduleHint || "See organization"
      ) +
      "</dd></div>" +
      "<div><dt>Location</dt><dd>" +
      escapeHtml(opp.locationLabel || "See organization") +
      "</dd></div>" +
      "<div><dt>Registration</dt><dd>" +
      escapeHtml(
        opp.registrationRequired
          ? "Required" +
              (opp.registrationNotes ? " — " + opp.registrationNotes : "")
          : "Not required" +
              (opp.registrationNotes ? " — " + opp.registrationNotes : "")
      ) +
      "</dd></div>" +
      "<div><dt>Verification</dt><dd>" +
      escapeHtml(opp.verificationStatus || "demo") +
      " (demo catalog)</dd></div>" +
      "</dl>" +
      "</section>" +
      '<section class="vol-detail-section" aria-labelledby="vol-links">' +
      '<h2 id="vol-links">Organization links</h2>' +
      '<div class="vol-card-links">' +
      (opp.officialWebsite
        ? '<a class="vol-link" href="' +
          escapeHtml(opp.officialWebsite) +
          '" target="_blank" rel="noopener noreferrer">Official website</a>'
        : "") +
      (opp.applicationLink
        ? '<a class="vol-link vol-link-accent" href="' +
          escapeHtml(opp.applicationLink) +
          '" target="_blank" rel="noopener noreferrer">Registration / signup</a>'
        : "") +
      (org
        ? '<a class="vol-link" href="' +
          escapeHtml(base + "organization/?id=" + org.id) +
          '">Organization profile</a>'
        : "") +
      "</div>" +
      "</section>" +
      '<section class="vol-detail-section" aria-labelledby="vol-private">' +
      '<h2 id="vol-private">Your private notes</h2>' +
      '<p class="muted">Saved only in this browser. Never shared publicly.</p>' +
      '<div class="vol-card-actions" id="vol-detail-actions">' +
      '<button type="button" class="vol-action' +
      (saved ? " is-on" : "") +
      '" data-action="save" data-opp-id="' +
      escapeHtml(opp.id) +
      '" aria-pressed="' +
      (saved ? "true" : "false") +
      '">Save for later</button>' +
      '<button type="button" class="vol-action' +
      (completed ? " is-on" : "") +
      '" data-action="completed" data-opp-id="' +
      escapeHtml(opp.id) +
      '" aria-pressed="' +
      (completed ? "true" : "false") +
      '">Mark completed (private)</button>' +
      '<button type="button" class="vol-action" data-action="list" data-opp-id="' +
      escapeHtml(opp.id) +
      '">Add to my list</button>' +
      "</div>" +
      '<label class="vol-field" for="vol-note-input">Personal note</label>' +
      '<textarea id="vol-note-input" class="vol-note" rows="4" maxlength="2000" data-opp-id="' +
      escapeHtml(opp.id) +
      '">' +
      escapeHtml(note) +
      "</textarea>" +
      '<button type="button" class="vol-text-btn" id="vol-note-save" data-opp-id="' +
      escapeHtml(opp.id) +
      '">Save note</button>' +
      '<p class="vol-gps-status" id="vol-note-status" aria-live="polite"></p>' +
      "</section>" +
      "</article>"
    );
  }

  function renderOrganizationPage(org, opportunities, options) {
    var opts = options || {};
    var base = opts.linkBase || "";
    var planning = global.VolunteerPlanning;
    var bookmarked = planning && planning.isOrgBookmarked(org.id);
    var opps = opportunities || [];

    var oppList = opps.length
      ? '<ul class="vol-org-opp-list">' +
        opps
          .map(function (opp) {
            return (
              "<li><a href=\"" +
              escapeHtml(base + "opportunity/?id=" + opp.id) +
              '">' +
              escapeHtml(opp.title) +
              "</a>" +
              '<span class="muted"> · ' +
              escapeHtml(opp.estimatedCommitment || "") +
              "</span></li>"
            );
          })
          .join("") +
        "</ul>"
      : '<p class="muted">No demo opportunities linked yet.</p>';

    return (
      '<article class="vol-detail">' +
      '<p class="vol-detail-kicker">Organization</p>' +
      "<h1>" +
      escapeHtml(org.name) +
      "</h1>" +
      "<p>" +
      escapeHtml(org.mission) +
      "</p>" +
      '<p class="muted">No ratings. No popularity metrics.</p>' +
      '<section class="vol-detail-section"><h2>Location &amp; service area</h2>' +
      "<p>" +
      escapeHtml((org.location && org.location.label) || "") +
      "</p>" +
      "<p>" +
      escapeHtml(org.serviceArea || "") +
      "</p></section>" +
      '<section class="vol-detail-section"><h2>Supported causes</h2>' +
      "<p>" +
      escapeHtml((org.supportedCauses || []).join(" · ") || "See opportunities") +
      "</p></section>" +
      '<section class="vol-detail-section"><h2>Accessibility</h2>' +
      "<p>" +
      escapeHtml(
        (org.accessibility && org.accessibility.summary) ||
          "Contact the organization."
      ) +
      "</p>" +
      (org.accessibility && org.accessibility.notes
        ? "<p class=\"muted\">" + escapeHtml(org.accessibility.notes) + "</p>"
        : "") +
      "</section>" +
      '<section class="vol-detail-section"><h2>Recurring events</h2>' +
      "<p>" +
      escapeHtml((org.recurringEvents || []).join(" · ") || "See opportunity list") +
      "</p></section>" +
      '<section class="vol-detail-section"><h2>Seasonal work</h2>' +
      "<p>" +
      escapeHtml((org.seasonalWork || []).join(" · ") || "Varies by season") +
      "</p></section>" +
      '<section class="vol-detail-section"><h2>Volunteer opportunities</h2>' +
      oppList +
      "</section>" +
      '<section class="vol-detail-section"><h2>Contact &amp; web</h2>' +
      '<div class="vol-card-links">' +
      (org.website
        ? '<a class="vol-link" href="' +
          escapeHtml(org.website) +
          '" target="_blank" rel="noopener noreferrer">Website</a>'
        : "") +
      (org.volunteerUrl
        ? '<a class="vol-link vol-link-accent" href="' +
          escapeHtml(org.volunteerUrl) +
          '" target="_blank" rel="noopener noreferrer">Volunteer page</a>'
        : "") +
      (org.contact && org.contact.email
        ? '<a class="vol-link" href="mailto:' +
          escapeHtml(org.contact.email) +
          '">Email</a>'
        : "") +
      "</div></section>" +
      '<div class="vol-card-actions">' +
      '<button type="button" class="vol-action' +
      (bookmarked ? " is-on" : "") +
      '" data-action="org" data-org-id="' +
      escapeHtml(org.id) +
      '" aria-pressed="' +
      (bookmarked ? "true" : "false") +
      '">Bookmark organization</button>' +
      "</div>" +
      "</article>"
    );
  }

  global.VolunteerDetail = {
    escapeHtml: escapeHtml,
    renderOpportunityPage: renderOpportunityPage,
    renderOrganizationPage: renderOrganizationPage,
    durationLabel: durationLabel,
    typeLabel: typeLabel
  };
})(typeof window !== "undefined" ? window : this);
