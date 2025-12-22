import { chromium, Page } from "playwright";

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
  page: Page,
): Promise<GameRating | null> {
  console.log(`Searching for: ${gameName}`);

  try {
    const searchInputSelector = 'input[placeholder="Search"]';
    await page.waitForSelector(searchInputSelector, { timeout: 30000 });
    await page.fill(searchInputSelector, "");
    await page.fill(searchInputSelector, gameName);

    const searchResultSelector = "ngb-typeahead-window";
    await page.waitForSelector(searchResultSelector, { timeout: 30000 });

    await page.click("ngb-typeahead-window button:first-child");

    const scores = await page
      .locator("app-score-orb .inner-orb")
      .allTextContents();

    const [topCritic, criticsRec, playerRate] = scores.map((s) => s.trim());

    const tier =
      (await page
        .locator("app-tier-display.mighty-score img")
        .getAttribute("alt")) || "No Tier";

    const url = page.url();

    return {
      gameName,
      tier,
      topCriticAverage: topCritic,
      criticsRecommend: criticsRec,
      playerRating: playerRate,
      url,
    };
  } catch (error) {
    console.error(`Error scraping ${gameName}:`, error);
    return null;
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

  const browser = await chromium.launch({
    headless: false,
  });
  const page = await browser.newPage();

  await page.goto("https://opencritic.com/", {
    waitUntil: "networkidle",
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
