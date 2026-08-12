(function () {
  "use strict";

  /**
   * Maps ForageCast prediction species to Waypoint Education lessons.
   * Add a species key when new prediction models ship.
   *
   * Lesson paths resolve to /education/{category}/{slug}/
   */
  var EDUCATION_BASE = "../education/";

  var SPECIES_MAP = {
    morel: {
      name: "Morel",
      lessons: [
        {
          slug: "morels-101",
          title: "Morels 101",
          level: "101",
          category: "species"
        },
        {
          slug: "morels-102",
          title: "Morels 102",
          level: "102",
          category: "species"
        },
        {
          slug: "forest-succession-101",
          title: "Forest Succession 101",
          level: "101",
          category: "ecosystems"
        },
        {
          slug: "foraging-safety-101",
          title: "Foraging Safety 101",
          level: "101",
          category: "safety"
        }
      ]
    },
    chanterelle: {
      name: "Chanterelle",
      lessons: [
        {
          slug: "chanterelles-101",
          title: "Chanterelles 101",
          level: "101",
          category: "species"
        },
        {
          slug: "reading-terrain-101",
          title: "Reading Terrain 101",
          level: "101",
          category: "skills"
        },
        {
          slug: "forest-succession-101",
          title: "Forest Succession 101",
          level: "101",
          category: "ecosystems"
        },
        {
          slug: "foraging-safety-101",
          title: "Foraging Safety 101",
          level: "101",
          category: "safety"
        }
      ]
    }
  };

  /** Species used by current MorelCast prediction UI */
  var DEFAULT_SPECIES = "morel";

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function lessonHref(lesson) {
    return EDUCATION_BASE + lesson.category + "/" + lesson.slug + "/";
  }

  function getLessons(speciesId) {
    var entry = SPECIES_MAP[speciesId];
    if (!entry || !entry.lessons) return [];
    return entry.lessons;
  }

  function renderLessonLink(lesson) {
    return (
      '<li class="fc-learn-item">' +
      '<a class="fc-learn-link" href="' +
      escapeHtml(lessonHref(lesson)) +
      '">' +
      '<span class="fc-learn-link-main">' +
      '<span class="fc-learn-level fc-learn-level--' +
      escapeHtml(lesson.level) +
      '">' +
      escapeHtml(lesson.level) +
      "</span>" +
      '<span class="fc-learn-title">' +
      escapeHtml(lesson.title) +
      "</span>" +
      "</span>" +
      '<span class="fc-learn-arrow" aria-hidden="true">→</span>' +
      "</a></li>"
    );
  }

  function render(speciesId, sectionId) {
    var section = document.getElementById(sectionId);
    if (!section) return;

    var list = section.querySelector(".fc-learn-list");
    if (!list) return;

    var entry = SPECIES_MAP[speciesId];
    var lessons = getLessons(speciesId);

    if (!lessons.length) {
      section.hidden = true;
      list.innerHTML = "";
      return;
    }

    var intro = section.querySelector(".fc-learn-intro");
    if (intro && entry) {
      intro.textContent =
        "Related field lessons for " + entry.name + " — read before you head out.";
    }

    list.innerHTML = lessons.map(renderLessonLink).join("");
    section.hidden = false;
  }

  window.ForageCastSpeciesLessons = {
    base: EDUCATION_BASE,
    map: SPECIES_MAP,
    defaultSpecies: DEFAULT_SPECIES,
    getLessons: getLessons,
    lessonHref: lessonHref,
    render: render
  };
})();
