const { chromium } = require("/tmp/pw/package");
const path = require("path");
const fs = require("fs");

(async () => {
  const out = path.join(
    "/home/bryan/Projects/waypoint-studio-site/docs/assets/sheds-polish-sprint-1"
  );
  fs.mkdirSync(out, { recursive: true });
  const executablePath =
    "/tmp/cursor-sandbox-cache/f9d33e55bd65c2401565ca6d2147df66/playwright/chromium-1148/chrome-linux/chrome";
  const browser = await chromium.launch({
    headless: true,
    executablePath
  });
  const errors = [];

  async function shot(name, width, height, setup) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push("console:" + msg.text());
    });
    await page.goto("http://127.0.0.1:8765/sheds/", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
    });
    if (setup) await setup(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, name), fullPage: false });
    await page.close();
  }

  await shot("after-desktop.png", 1280, 800);
  await shot("after-mobile.png", 390, 844);
  await shot("education-mode.png", 1280, 800, async (page) => {
    await page.click("#sheds-edu-btn");
  });
  await shot("zones-off.png", 1280, 800, async (page) => {
    await page.click("#sheds-zones-btn");
  });
  await shot("about-dialog.png", 1280, 800, async (page) => {
    await page.click("#sheds-about-btn");
  });
  await shot("mobile-sheet-open.png", 390, 844, async (page) => {
    await page.click("#sheds-sheet-toggle");
  });

  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = function (_ok, err) {
        err({ code: 1, message: "denied" });
      };
    });
    await page.goto("http://127.0.0.1:8765/sheds/", {
      waitUntil: "domcontentloaded"
    });
    await page.waitForTimeout(1500);
    await page.click("#sheds-locate-btn");
    await page.waitForTimeout(600);
    const status = await page.textContent("#sheds-gps-status");
    await page.screenshot({
      path: path.join(out, "gps-denied.png"),
      fullPage: false
    });
    console.log("gps-denied-status:", status);
    await page.close();
  }

  await browser.close();
  console.log("errors:", JSON.stringify(errors, null, 2));
  console.log("shots:", fs.readdirSync(out).join(", "));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
