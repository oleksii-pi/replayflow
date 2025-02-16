// server/src/browser.ts
import { chromium, Browser, Page } from "playwright";

let _browser: Browser;
let _page: Page;

export const page = () => _page;

async function initializeBrowser() {
  _browser = await chromium.launch({ headless: false });
  _page = await _browser.newPage();
  _page.setDefaultTimeout(5000);
  await _page.setViewportSize({ width: 1000, height: 800 });
}

export const resetBrowser = async () => {
  if (_browser) {
    await _browser.close();
  }
  await initializeBrowser();
  //await _page.goto("https://gmail.com");
};

resetBrowser();
