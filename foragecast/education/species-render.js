(function () {
  "use strict";

  var registry = window.ForageCastSpecies;

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderList(items) {
    if (!items || !items.length) return "<p class=\"muted\">Coming soon.</p>";
    return (
      "<ul class=\"fc-species-list\">" +
      items
        .map(function (item) {
          return "<li>" + escapeHtml(item) + "</li>";
        })
        .join("") +
      "</ul>"
    );
  }

  function renderCard(species) {
    return (
      '<article class="fc-species-card">' +
      '<a class="fc-species-card-link" href="' +
      escapeHtml(species.slug) +
      '/">' +
      '<div class="fc-species-card-img fc-species-hero-img fc-species-hero-img--' +
      escapeHtml(species.slug) +
      '" aria-hidden="true">' +
      '<span class="fc-species-img-label">' +
      escapeHtml(species.commonName) +
      "</span>" +
      "</div>" +
      '<div class="fc-species-card-body">' +
      "<h2>" +
      escapeHtml(species.commonName) +
      "</h2>" +
      '<p class="fc-species-scientific">' +
      escapeHtml(species.scientificName) +
      "</p>" +
      '<p class="fc-species-card-meta">' +
      '<span class="fc-species-tag">' +
      escapeHtml(species.category) +
      "</span>" +
      "<span>" +
      escapeHtml(species.season) +
      "</span>" +
      "</p>" +
      "</div>" +
      "</a>" +
      "</article>"
    );
  }

  function renderIndex(grid) {
    if (!registry) return;
    grid.innerHTML = registry.all.map(renderCard).join("");
  }

  function renderProfile(slug, container) {
    if (!registry) return;
    var species = registry.get(slug);
    if (!species) {
      container.innerHTML =
        '<section class="fc-species-empty">' +
        "<h1>Species not found</h1>" +
        '<p class="muted">That profile is not in the catalog yet.</p>' +
        '<p><a class="btn-secondary" href="../">Back to species index</a></p>' +
        "</section>";
      document.title = "Species not found | ForageCast Education";
      return;
    }

    document.title = species.commonName + " | ForageCast Education";

    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Learn about " +
          species.commonName +
          " (" +
          species.scientificName +
          ") — habitat, season, identification, and beginner notes."
      );
    }

    container.innerHTML =
      '<article class="fc-species-profile">' +
      '<header class="fc-species-hero">' +
      '<div class="fc-species-hero-img fc-species-hero-img--' +
      escapeHtml(species.slug) +
      '">' +
      '<span class="fc-species-img-label">' +
      escapeHtml(species.heroLabel) +
      "</span>" +
      "</div>" +
      '<div class="fc-species-hero-text">' +
      '<p class="fc-species-kicker">' +
      escapeHtml(species.category) +
      "</p>" +
      "<h1>" +
      escapeHtml(species.commonName) +
      "</h1>" +
      '<p class="fc-species-scientific fc-species-scientific--hero">' +
      escapeHtml(species.scientificName) +
      "</p>" +
      "</div>" +
      "</header>" +
      '<div class="fc-species-grid">' +
      '<section class="fc-species-section">' +
      "<h2>Habitat</h2>" +
      "<p>" +
      escapeHtml(species.habitat) +
      "</p>" +
      "</section>" +
      '<section class="fc-species-section">' +
      "<h2>Season</h2>" +
      "<p>" +
      escapeHtml(species.season) +
      "</p>" +
      "</section>" +
      '<section class="fc-species-section">' +
      "<h2>Associated trees &amp; plants</h2>" +
      renderList(species.associatedPlants) +
      "</section>" +
      '<section class="fc-species-section">' +
      "<h2>Identification tips</h2>" +
      renderList(species.identificationTips) +
      "</section>" +
      '<section class="fc-species-section fc-species-section--warn">' +
      "<h2>Lookalikes &amp; warnings</h2>" +
      renderList(species.lookalikes) +
      "</section>" +
      '<section class="fc-species-section">' +
      "<h2>Range &amp; distribution</h2>" +
      "<p>" +
      escapeHtml(species.range) +
      "</p>" +
      "</section>" +
      '<section class="fc-species-section fc-species-section--note">' +
      "<h2>Beginner notes</h2>" +
      "<p>" +
      escapeHtml(species.beginnerNotes) +
      "</p>" +
      "</section>" +
      "</div>" +
      '<footer class="fc-species-profile-foot">' +
      '<p class="global-disclaimer">' +
      "Educational overview only — not a substitute for expert identification, safety review, or local regulations." +
      "</p>" +
      '<a class="btn-secondary" href="../">All species</a>' +
      "</footer>" +
      "</article>";
  }

  function init() {
    var grid = document.getElementById("species-grid");
    if (grid) renderIndex(grid);

    var profile = document.getElementById("species-profile");
    if (profile) {
      var slug = document.body.getAttribute("data-species");
      if (slug) renderProfile(slug, profile);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
