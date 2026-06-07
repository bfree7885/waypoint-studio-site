/**
 * ForageCast — Formspree (static-site form backend)
 *
 * SETUP (~5 minutes):
 *   1. Go to https://formspree.io and sign up (Google with bfree7885@gmail.com is fastest).
 *   2. Click "+ New Form" → name it "ForageCast Beta".
 *   3. Set the notification email to bfree7885@gmail.com
 *      (temporary until hello@waypointstudio.org domain email is configured).
 *   4. Open the form → Integration → copy the endpoint URL
 *      (looks like https://formspree.io/f/xxxxxxxx).
 *   5. Paste that URL into FORMSPREE_ENDPOINT below.
 *   6. Commit, push, and wait for GitHub Pages to deploy.
 *
 * View signups: https://formspree.io → Forms → ForageCast Beta → Submissions
 * Email copies also go to bfree7885@gmail.com when configured.
 */
var FORMSPREE_ENDPOINT = "https://formspree.io/f/mzdqrprw";

window.ForageCastForms = {
  provider: "formspree",
  endpoint: FORMSPREE_ENDPOINT,
  debug: false
};
