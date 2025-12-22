import { chromium } from "playwright";

interface GameRating {
  gameName: string;
  tier: string;
  topCriticAverage: string;
  criticsRecommend: string;
  playerRating: string;
  url: string;
}

async function scrapeGameRating(gameName: string): Promise<GameRating | null> {
  console.log(`Searching for: ${gameName}`);
  const browser = await chromium.launch({
    headless: false,
  });
  const page = await browser.newPage();

  try {
    await page.goto("https://opencritic.com/", {
      waitUntil: "networkidle",
      timeout: 90000,
    });

    console.log("waiting for network idle");

    const searchInputSelector = 'input[placeholder="Search"]';
    await page.waitForSelector(searchInputSelector, { timeout: 30000 });
    await page.fill(searchInputSelector, gameName);

    console.log("input complete");

    const searchResultSelector = "ngb-typeahead-window";
    await page.waitForSelector(searchResultSelector, { timeout: 30000 });

    await page.click("ngb-typeahead-window button:first-child");

    console.log("clicked! waiting");

    await page.waitForSelector(".score-orb", { timeout: 60000 });

    const tierElement = await page.$(".tier-img");
    const tier = (await tierElement?.getAttribute("alt")) || "Unknown";

    const topCriticAverageElement = await page.$(".score-orb .score");
    const topCriticAverage =
      (await topCriticAverageElement?.textContent())?.trim() || "0";

    const criticsRecommendElement = await page.$(".recommend-orb .score");
    const criticsRecommend =
      (await criticsRecommendElement?.textContent())?.trim() || "0";

    const playerRatingElement = await page.$(".player-score-orb .score");
    const playerRating =
      (await playerRatingElement?.textContent())?.trim() || "0";

    const url = page.url();

    return {
      gameName,
      tier,
      topCriticAverage,
      criticsRecommend,
      playerRating,
      url,
    };
  } catch (error) {
    console.error(`Error scraping ${gameName}:`, error);
    return null;
  } finally {
    await browser.close();
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

  for (const game of sampleGames) {
    const rating = await scrapeGameRating(game);
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
}

main();
