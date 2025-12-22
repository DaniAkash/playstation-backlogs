import { chromium, Page } from "playwright";
import { db } from "@/db";
import { purchasedGames, gameRatings } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";

const NUM_TABS = 4;

interface ScrapedRating {
  topCriticAverage: number | null;
  criticsRecommend: number | null;
  playerRating: string | null;
  tier: string | null;
  url: string;
}

function normalizeGameName(name: string): string {
  return name
    // Remove trademark/copyright symbols
    .replace(/[™®©]/g, "")
    // Remove common edition suffixes
    .replace(/\s*[-–:]\s*(Standard|Deluxe|Ultimate|Gold|Premium|Digital|Complete|Game of the Year|GOTY|Remastered|Enhanced|Director'?s?\s*Cut|Launch|Limited|Collector'?s?|Special)\s*Edition/gi, "")
    // Remove platform-specific suffixes
    .replace(/\s*[-–:]\s*(PS4|PS5|PlayStation\s*[45])\s*(Version|Edition)?/gi, "")
    // Remove "Full Game" suffix
    .replace(/\s*[-–:]\s*Full\s*Game/gi, "")
    // Remove trailing special characters and whitespace
    .replace(/\s*[-–:]\s*$/, "")
    .trim();
}

async function scrapeGameRating(
  gameName: string,
  page: Page
): Promise<ScrapedRating | null> {
  const searchName = normalizeGameName(gameName);
  console.log(`Searching for: ${searchName}`);

  try {
    const searchInputSelector = 'input[placeholder="Search"]';
    await page.waitForSelector(searchInputSelector, { timeout: 10000 });
    await page.fill(searchInputSelector, "");
    await page.fill(searchInputSelector, searchName);

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
  } finally {
    await page.goto("https://opencritic.com/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
  }
}

async function main() {
  const games = await db
    .select({
      id: purchasedGames.id,
      name: purchasedGames.name,
      entitlementId: purchasedGames.entitlementId,
    })
    .from(purchasedGames)
    .leftJoin(
      gameRatings,
      eq(purchasedGames.entitlementId, gameRatings.entitlementId)
    )
    .where(isNull(gameRatings.id));

  console.log(`Found ${games.length} games without ratings`);

  if (games.length === 0) {
    console.log("No games to process");
    return;
  }

  const browser = await chromium.launch({
    headless: false,
  });

  // Create multiple pages (tabs)
  const pages: Page[] = [];
  for (let i = 0; i < NUM_TABS; i++) {
    const page = await browser.newPage();
    await page.goto("https://opencritic.com/", {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    pages.push(page);
    console.log(`Tab ${i + 1} ready`);
  }

  let processed = 0;
  let success = 0;
  let failed = 0;
  const failedGames: string[] = [];
  const totalGames = games.length;

  // Worker function for each tab
  async function processGame(
    game: { id: number; name: string; entitlementId: string },
    page: Page,
    tabIndex: number
  ) {
    const currentNum = ++processed;
    console.log(`\n[Tab ${tabIndex + 1}] [${currentNum}/${totalGames}] Processing: ${game.name}`);

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
      console.log(`  [Tab ${tabIndex + 1}] Saved: ${rating.tier} - ${rating.topCriticAverage}/100`);
    } else {
      failed++;
      failedGames.push(game.name);
      console.log(`  [Tab ${tabIndex + 1}] Failed to scrape rating`);
    }
  }

  // Process games in parallel batches
  for (let i = 0; i < games.length; i += NUM_TABS) {
    const batch = games.slice(i, i + NUM_TABS);
    await Promise.all(
      batch.map((game, index) => processGame(game, pages[index], index))
    );
  }

  await browser.close();

  console.log("\n========== SUMMARY ==========");
  console.log(`Total games: ${totalGames}`);
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
