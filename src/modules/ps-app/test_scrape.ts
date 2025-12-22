import puppeteer, { Page } from "puppeteer";

interface GameRating {
  gameName: string;
  tier: string;
  topCriticAverage: string;
  criticsRecommend: string;
  playerRating: string;
  url: string;
}

async function scrapeGameRating(
  gameName: string,
  page: Page
): Promise<GameRating | null> {
  console.log(`Searching for: ${gameName}`);

  try {
    const searchInputSelector = 'input[placeholder="Search"]';
    await page.waitForSelector(searchInputSelector, { timeout: 10000 });

    // Clear and type using Puppeteer
    const searchInput = await page.$(searchInputSelector);
    await searchInput?.click({ clickCount: 3 });
    await searchInput?.type(gameName);

    const searchResultSelector = "ngb-typeahead-window";
    await page.waitForSelector(searchResultSelector, { timeout: 10000 });

    await page.click("ngb-typeahead-window button:first-child");

    // Wait for URL to change to a game page
    await page.waitForFunction(() => window.location.href.includes("/game/"), {
      timeout: 10000,
    });

    await page.waitForSelector("app-score-orb .inner-orb", { timeout: 10000 });

    const scores = await page.$$eval("app-score-orb .inner-orb", (elements) =>
      elements.map((el) => el.textContent?.trim() || "")
    );

    const [topCritic, criticsRec, playerRate] = scores;

    const tier = await page
      .$eval("app-tier-display.mighty-score img", (el) =>
        el.getAttribute("alt")
      )
      .catch(() => "No Tier");

    const url = page.url();

    return {
      gameName,
      tier: tier || "No Tier",
      topCriticAverage: topCritic,
      criticsRecommend: criticsRec,
      playerRating: playerRate,
      url,
    };
  } catch (error) {
    console.error(`Error scraping ${gameName}:`, error);
    return null;
  } finally {
    await page.goto("https://opencritic.com/", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
  }
}

async function main() {
  const sampleGames = [
    "God of War Ragnarök",
    "The Last of Us Part II",
    "Spider-Man 2",
    "Horizon Forbidden West",
    "Ghost of Tsushima",
  ];

  const results: GameRating[] = [];

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1512, height: 982 },
    args: ["--window-size=1512,982"],
  });
  const page = await browser.newPage();

  await page.goto("https://opencritic.com/", {
    waitUntil: "networkidle0",
    timeout: 90000,
  });

  for (const game of sampleGames) {
    const rating = await scrapeGameRating(game, page);
    if (rating) {
      results.push(rating);
    }
  }

  console.log("\n========== GAME RATINGS ==========\n");
  for (const result of results) {
    console.log(`Game: ${result.gameName}`);
    console.log(`  Tier: ${result.tier}`);
    console.log(`  Top Critic Average: ${result.topCriticAverage}`);
    console.log(`  Critics Recommend: ${result.criticsRecommend}`);
    console.log(`  Player Rating: ${result.playerRating}`);
    console.log(`  URL: ${result.url}`);
    console.log("");
  }

  await browser.close();
}

main();
