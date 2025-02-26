// server/src/browser.ts
import { chromium, Browser, Page } from "playwright";
import { setupRecordingEventListeners } from "./setupRecordingEventListeners";

let _browser: Browser;
let _page: Page;

export const page = () => _page;

async function initializeBrowser() {
  _browser = await chromium.launch({ headless: false });
  _page = await _browser.newPage();
  _page.setDefaultTimeout(5000);
  await _page.setViewportSize({ width: 1000, height: 600 });
}

export const resetBrowser = async () => {
  if (_browser) {
    await _browser.close();
  }
  await initializeBrowser();
  //await setupRecordingEventListeners(_page, (message) => console.log("\x1b[32m%s\x1b[0m", message));
  //await _page.goto("https://inputtypes.com");
};

resetBrowser();
