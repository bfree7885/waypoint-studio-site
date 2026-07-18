/**
 * Minimal accessible dialog helper for Waypoint Studio static apps.
 * - Escape to close
 * - Focus move to dialog on open / restore on close
 * - Simple focus trap within [role=dialog]
 */
(function (global) {
  "use strict";

  function focusable(root) {
    if (!root) return [];
    return Array.prototype.slice.call(
      root.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(function (el) {
      return !el.hasAttribute("disabled") && el.offsetParent !== null;
    });
  }

  function bindDialog(options) {
    var dialog = options.dialog;
    var openBtn = options.openBtn;
    var closeBtn = options.closeBtn;
    var backdrop = options.backdrop;
    var lastFocus = null;
    var onKey = null;

    function isOpen() {
      return dialog && !dialog.hidden;
    }

    function open() {
      if (!dialog) return;
      lastFocus = document.activeElement;
      dialog.hidden = false;
      if (openBtn) openBtn.setAttribute("aria-expanded", "true");
      var focusTarget = closeBtn || dialog.querySelector("[data-dialog-close]");
      if (focusTarget) focusTarget.focus();
      onKey = function (e) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeDialog();
          return;
        }
        if (e.key !== "Tab") return;
        var nodes = focusable(dialog);
        if (!nodes.length) return;
        var first = nodes[0];
        var last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      document.addEventListener("keydown", onKey);
    }

    function closeDialog() {
      if (!dialog) return;
      dialog.hidden = true;
      if (openBtn) openBtn.setAttribute("aria-expanded", "false");
      if (onKey) {
        document.removeEventListener("keydown", onKey);
        onKey = null;
      }
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      } else if (openBtn) {
        openBtn.focus();
      }
    }

    if (openBtn) {
      openBtn.addEventListener("click", function () {
        open();
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        closeDialog();
      });
    }
    if (backdrop) {
      backdrop.addEventListener("click", function () {
        closeDialog();
      });
    }

    return { open: open, close: closeDialog, isOpen: isOpen };
  }

  global.WaypointA11y = {
    bindDialog: bindDialog,
    focusable: focusable
  };
})(typeof window !== "undefined" ? window : this);
