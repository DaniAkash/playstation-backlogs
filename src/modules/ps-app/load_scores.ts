import { chromium, Page } from "playwright";
import { db } from "@/db";
import { purchasedGames, gameRatings } from "@/db/schema";
import { eq } from "drizzle-orm";

interface ScrapedRating {
  topCriticAverage: number | null;
  criticsRecommend: number | null;
  playerRating: string | null;
  tier: string | null;
  url: string;
}

async function scrapeGameRating(
  gameName: string,
  page: Page
): Promise<ScrapedRating | null> {
  console.log(`Searching for: ${gameName}`);

  try {
    const searchInputSelector = 'input[placeholder="Search"]';
    await page.waitForSelector(searchInputSelector, { timeout: 10000 });
    await page.fill(searchInputSelector, "");
    await page.fill(searchInputSelector, gameName);

    const searchResultSelector = "ngb-typeahead-window";
    await page.waitForSelector(searchResultSelector, { timeout: 10000 });

    await page.click("ngb-typeahead-window button:first-child");

    await page.waitForSelector("app-score-orb .inner-orb", { timeout: 10000 });

    const scores = await page
      .locator("app-score-orb .inner-orb")
      .allTextContents();

    const [topCritic, criticsRec, playerRate] = scores.map((s) => s.trim());

    const tier =
      (await page
        .locator("app-tier-display.mighty-score img")
        .getAttribute("alt")) || null;

    const url = page.url();

    return {
      topCriticAverage: topCritic ? parseInt(topCritic, 10) : null,
      criticsRecommend: criticsRec ? parseInt(criticsRec, 10) : null,
      playerRating: playerRate || null,
      tier,
      url,
    };
  } catch (error) {
    console.error(`Error scraping ${gameName}:`, error);
    return null;
  }
}

async function main() {
  const games = await db.select().from(purchasedGames);
  console.log(`Found ${games.length} games to process`);

  const browser = await chromium.launch({
    headless: false,
  });
  const page = await browser.newPage();

  await page.goto("https://opencritic.com/", {
    waitUntil: "networkidle",
    timeout: 90000,
  });

  let processed = 0;
  let success = 0;
  let failed = 0;
  const failedGames: string[] = [];

  for (const game of games) {
    processed++;
    console.log(`\n[${processed}/${games.length}] Processing: ${game.name}`);

    const rating = await scrapeGameRating(game.name, page);

    if (rating) {
      await db
        .insert(gameRatings)
        .values({
          entitlementId: game.entitlementId,
          topCriticAverage: rating.topCriticAverage,
          criticsRecommend: rating.criticsRecommend,
          playerRating: rating.playerRating,
          tier: rating.tier,
          url: rating.url,
        })
        .onConflictDoUpdate({
          target: gameRatings.entitlementId,
          set: {
            topCriticAverage: rating.topCriticAverage,
            criticsRecommend: rating.criticsRecommend,
            playerRating: rating.playerRating,
            tier: rating.tier,
            url: rating.url,
            updatedAt: new Date(),
          },
        });

      success++;
      console.log(`  Saved: ${rating.tier} - ${rating.topCriticAverage}/100`);
    } else {
      failed++;
      failedGames.push(game.name);
      console.log(`  Failed to scrape rating`);
    }
  }

  await browser.close();

  console.log("\n========== SUMMARY ==========");
  console.log(`Total games: ${games.length}`);
  console.log(`Successfully scraped: ${success}`);
  console.log(`Failed: ${failed}`);

  if (failedGames.length > 0) {
    console.log("\n========== FAILED GAMES ==========");
    for (const name of failedGames) {
      console.log(`  - ${name}`);
    }
  }
}

main();
