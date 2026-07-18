/**
 * Waypoint Volunteer — saved opportunities page
 */
(function () {
  "use strict";

  var esc = window.VolunteerDetail.escapeHtml;

  function oppLink(id) {
    var opp = window.VolunteerOpportunities.get(id);
    if (!opp) return "<li class=\"muted\">Unknown listing</li>";
    var note = window.VolunteerPlanning.getNote(id);
    var done = window.VolunteerPlanning.isCompleted(id);
    return (
      "<li class=\"vol-saved-item\">" +
      '<a href="../opportunity/?id=' +
      encodeURIComponent(id) +
      '">' +
      esc(opp.title) +
      "</a>" +
      (done ? ' <span class="vol-chip">Completed</span>' : "") +
      (note
        ? '<p class="vol-saved-note">' + esc(note) + "</p>"
        : "") +
      '<div class="vol-card-actions">' +
      '<button type="button" class="vol-action" data-unsave="' +
      esc(id) +
      '">Remove save</button>' +
      '<button type="button" class="vol-action" data-toggle-done="' +
      esc(id) +
      '">' +
      (done ? "Undo completed" : "Mark completed") +
      "</button>" +
      "</div></li>"
    );
  }

  function renderIds(ids, emptyMsg) {
    if (!ids.length) return '<p class="muted">' + esc(emptyMsg) + "</p>";
    return "<ul class=\"vol-org-opp-list\">" + ids.map(oppLink).join("") + "</ul>";
  }

  function render() {
    var state = window.VolunteerPlanning.getState();
    document.getElementById("vol-saved-list").innerHTML = renderIds(
      state.savedOpportunities,
      "Nothing saved yet — browse discovery and tap Save."
    );
    document.getElementById("vol-completed-list").innerHTML = renderIds(
      state.completedOpportunities,
      "No privately completed items yet."
    );

    var orgHost = document.getElementById("vol-org-list");
    if (!state.bookmarkedOrganizations.length) {
      orgHost.innerHTML = '<p class="muted">No bookmarked organizations yet.</p>';
    } else {
      orgHost.innerHTML =
        '<ul class="vol-org-opp-list">' +
        state.bookmarkedOrganizations
          .map(function (id) {
            var org = window.VolunteerOrganizations.get(id);
            if (!org) return "";
            return (
              "<li><a href=\"../organization/?id=" +
              encodeURIComponent(id) +
              '">' +
              esc(org.name) +
              "</a></li>"
            );
          })
          .join("") +
        "</ul>";
    }

    var listsHost = document.getElementById("vol-lists");
    var lists = window.VolunteerPlanning.getLists();
    if (!lists.length) {
      listsHost.innerHTML = '<p class="muted">Create a list to group ideas privately.</p>';
    } else {
      listsHost.innerHTML = lists
        .map(function (list) {
          return (
            '<article class="vol-custom-list">' +
            "<h3>" +
            esc(list.name) +
            "</h3>" +
            renderIds(list.opportunityIds, "Empty list") +
            '<button type="button" class="vol-text-btn" data-delete-list="' +
            esc(list.id) +
            '">Delete list</button>' +
            "</article>"
          );
        })
        .join("");
    }
  }

  document.getElementById("vol-new-list").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = document.getElementById("vol-list-name");
    window.VolunteerPlanning.createList(input.value);
    input.value = "";
    render();
  });

  document.body.addEventListener("click", function (e) {
    var t = e.target;
    if (t.matches("[data-unsave]")) {
      window.VolunteerPlanning.toggleSaved(t.getAttribute("data-unsave"));
      render();
    }
    if (t.matches("[data-toggle-done]")) {
      window.VolunteerPlanning.toggleCompleted(t.getAttribute("data-toggle-done"));
      render();
    }
    if (t.matches("[data-delete-list]")) {
      window.VolunteerPlanning.deleteList(t.getAttribute("data-delete-list"));
      render();
    }
  });

  render();
})();
