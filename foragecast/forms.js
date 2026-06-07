(function () {
  "use strict";

  var config = window.ForageCastForms || {};
  var STORAGE_BETA = "foragecast_beta_joined";
  var LOG_PREFIX = "[ForageCast Forms]";

  function isDebug() {
    if (config.debug) return true;
    var host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  }

  function log() {
    if (!isDebug()) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift(LOG_PREFIX);
    console.log.apply(console, args);
  }

  function logError() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(LOG_PREFIX);
    console.error.apply(console, args);
  }

  function getEndpoint() {
    if (config.endpoint && config.endpoint.indexOf("formspree.io") !== -1) {
      return config.endpoint.replace(/\/$/, "");
    }
    return null;
  }

  function isConfigured() {
    return Boolean(getEndpoint());
  }

  function showMessage(el, type, text) {
    if (!el) return;
    el.hidden = false;
    el.className = "form-message is-" + type;
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.textContent = text;
  }

  function hideMessage(el) {
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
  }

  function hideSuccessPanel(formType) {
    var successId = formType === "beta" ? "beta-success" : "waitlist-success";
    var panel = document.getElementById(successId);
    if (panel) panel.hidden = true;
  }

  function setSubmitting(form, isSubmitting) {
    var btn = form.querySelector('[type="submit"]');
    if (!btn) return;
    btn.disabled = isSubmitting;
    btn.setAttribute("aria-busy", isSubmitting ? "true" : "false");
    if (isSubmitting) {
      btn.dataset.originalLabel = btn.textContent;
      btn.textContent = "Sending…";
    } else if (btn.dataset.originalLabel) {
      btn.textContent = btn.dataset.originalLabel;
    }
  }

  function payloadFromForm(form, formType) {
    var data = new FormData(form);
    var payload = {
      _subject: "ForageCast — " + formType,
      form_type: formType
    };

    data.forEach(function (value, key) {
      if (key === "_honey" && value) {
        payload._honey = value;
        return;
      }
      if (key !== "_honey") {
        payload[key] = value;
      }
    });

    if (payload.email) {
      payload._replyto = payload.email;
    }

    return payload;
  }

  function parseResponseBody(res) {
    var contentType = res.headers.get("content-type") || "";
    if (contentType.indexOf("application/json") !== -1) {
      return res.json();
    }
    return res.text().then(function (text) {
      return { _raw: text };
    });
  }

  function validateFormspreeResponse(res, data) {
    if (!res.ok) {
      var errMsg = "Server returned " + res.status;
      if (data && data.error) errMsg = data.error;
      if (data && data.errors) {
        errMsg = data.errors.map(function (e) {
          return e.message || String(e);
        }).join("; ");
      }
      throw new Error(errMsg);
    }
    if (data && data.ok !== true) {
      throw new Error(
        (data && data.error) || "Formspree did not confirm this submission."
      );
    }
    return data;
  }

  function submitForm(form, formType, messageEl, onSuccess) {
    hideSuccessPanel(formType);

    if (!isConfigured()) {
      var setupMsg =
        "Signup is temporarily unavailable — the form endpoint is not configured. " +
        "Please email hello@waypointstudio.org to join the beta.";
      logError("Not configured — set ForageCastForms.endpoint in forms.config.js");
      showMessage(messageEl, "error", setupMsg);
      return Promise.resolve();
    }

    var honey = form.querySelector('[name="_honey"]');
    if (honey && honey.value) {
      log("Honeypot triggered — submission blocked");
      return Promise.resolve();
    }

    var endpoint = getEndpoint();
    var payload = payloadFromForm(form, formType);

    hideMessage(messageEl);
    setSubmitting(form, true);

    log("Submitting", formType, "→", endpoint, payload);

    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        log("Response status:", res.status, res.statusText);
        return parseResponseBody(res).then(function (data) {
          log("Response body:", data);
          return validateFormspreeResponse(res, data);
        });
      })
      .then(function (data) {
        log("Submit success:", formType, data);
        form.reset();
        if (onSuccess) onSuccess();
        if (formType === "feedback") {
          showMessage(
            messageEl,
            "success",
            "Thank you — your feedback was received."
          );
        } else {
          showFormSuccess(form, formType);
        }
      })
      .catch(function (err) {
        logError("Submit failed:", formType, err.message || err);
        var userMsg =
          "We could not save your signup. " +
          (err.message ? err.message + ". " : "") +
          "Please try again or email hello@waypointstudio.org directly.";
        showMessage(messageEl, "error", userMsg);
      })
      .finally(function () {
        setSubmitting(form, false);
      });
  }

  function showFormSuccess(form, formType) {
    var successId = formType === "beta" ? "beta-success" : "waitlist-success";
    var successPanel = document.getElementById(successId);
    if (successPanel) {
      successPanel.hidden = false;
    }
    if (form) {
      form.hidden = true;
    }
    var messageEl = document.getElementById(
      formType === "beta" ? "beta-message" : "waitlist-message"
    );
    if (messageEl) {
      messageEl.hidden = true;
    }
    if (successPanel) {
      successPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function bindForm(formId, formType, messageId, onSuccess) {
    var form = document.getElementById(formId);
    var messageEl = document.getElementById(messageId);
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      submitForm(form, formType, messageEl, onSuccess);
    });
  }

  function markBetaJoined() {
    try {
      localStorage.setItem(STORAGE_BETA, "1");
    } catch (err) {
      /* ignore */
    }
    var banner = document.getElementById("beta-status");
    if (banner) {
      banner.classList.add("is-joined");
      var note = banner.querySelector(".beta-status-note");
      if (note) {
        note.textContent =
          "You're registered for beta updates. Try the demos below and send feedback when you're ready.";
      }
    }
  }

  function checkBetaJoined() {
    try {
      if (localStorage.getItem(STORAGE_BETA) === "1") {
        markBetaJoined();
      }
    } catch (err) {
      /* ignore */
    }
  }

  function handleQuerySuccess() {
    var params = new URLSearchParams(window.location.search);
    var submitted = params.get("submitted");
    if (!submitted) return;

    var map = {
      waitlist: ["waitlist-form", "waitlist-message", "waitlist"],
      beta: ["beta-form", "beta-message", "beta"],
      feedback: ["feedback-form", "feedback-status", "feedback"]
    };
    var target = map[submitted];
    if (!target) return;

    var section = document.getElementById(target[2]);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (submitted === "beta") {
      markBetaJoined();
    }
  }

  bindForm("waitlist-form", "waitlist", "waitlist-message");
  bindForm("beta-form", "beta", "beta-message", markBetaJoined);
  bindForm("feedback-form", "feedback", "feedback-status");

  if (isDebug()) {
    log(
      "Debug mode on. Endpoint:",
      getEndpoint() || "(not configured)",
      "Configured:",
      isConfigured()
    );
  }

  if (!isConfigured() && isDebug()) {
    logError(
      "forms.config.js endpoint is empty — add your Formspree URL to enable signups"
    );
  }

  checkBetaJoined();
  handleQuerySuccess();
})();
