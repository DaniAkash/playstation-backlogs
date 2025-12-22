import puppeteer, { Page } from "puppeteer";
import { db } from "@/db";
import { purchasedGames, gameRatings } from "@/db/schema";
import { desc, eq, isNull } from "drizzle-orm";

const NUM_TABS = 4;

interface ScrapedRating {
  topCriticAverage: number | null;
  criticsRecommend: number | null;
  playerRating: string | null;
  tier: string | null;
  url: string;
}

function normalizeGameName(name: string): string {
  return (
    name
      // Remove trademark/copyright symbols
      .replace(/[™®©]/g, "")
      // Remove common edition suffixes
      .replace(
        /\s*[-–:]\s*(Standard|Deluxe|Ultimate|Gold|Premium|Digital|Complete|Game of the Year|GOTY|Remastered|Enhanced|Director'?s?\s*Cut|Launch|Limited|Collector'?s?|Special)\s*Edition/gi,
        "",
      )
      // Remove platform-specific suffixes
      .replace(
        /\s*[-–:]\s*(PS4|PS5|PlayStation\s*[45])\s*(Version|Edition)?/gi,
        "",
      )
      // Remove "Full Game" suffix
      .replace(/\s*[-–:]\s*Full\s*Game/gi, "")
      // Remove trailing special characters and whitespace
      .replace(/\s*[-–:]\s*$/, "")
      .trim()
  );
}

async function scrapeGameRating(
  gameName: string,
  page: Page,
): Promise<ScrapedRating | null> {
  const searchName = normalizeGameName(gameName);
  console.log(`Searching for: ${searchName}`);

  try {
    const searchInputSelector = 'input[placeholder="Search"]';
    await page.waitForSelector(searchInputSelector, { timeout: 10000 });

    // Clear and type using Puppeteer
    const searchInput = await page.$(searchInputSelector);
    await searchInput?.click({ clickCount: 3 });
    await searchInput?.type(searchName);

    const searchResultSelector = "ngb-typeahead-window";
    await page.waitForSelector(searchResultSelector, { timeout: 10000 });

    await page.click("ngb-typeahead-window button:first-child");

    // Wait for URL to change to a game page
    await page.waitForFunction(() => window.location.href.includes("/game/"), {
      timeout: 10000,
    });

    await page.waitForSelector("app-score-orb .inner-orb", { timeout: 10000 });

    const scores = await page.$$eval("app-score-orb .inner-orb", (elements) =>
      elements.map((el) => el.textContent?.trim() || ""),
    );

    const [topCritic, criticsRec, playerRate] = scores;

    const tier = await page
      .$eval("app-tier-display.mighty-score img", (el) =>
        el.getAttribute("alt"),
      )
      .catch(() => null);

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
    try {
      await page.goto("https://opencritic.com/", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForSelector('input[placeholder="Search"]', {
        timeout: 10000,
      });
    } catch (navError) {
      console.error(`Error navigating back to homepage:`, navError);
    }
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
      eq(purchasedGames.entitlementId, gameRatings.entitlementId),
    )
    .where(isNull(gameRatings.id))
    .orderBy(desc(purchasedGames.id));

  console.log(`Found ${games.length} games without ratings`);

  if (games.length === 0) {
    console.log("No games to process");
    return;
  }

  // Launch separate browser instances for true parallelism
  const browsers: puppeteer.Browser[] = [];
  const pages: Page[] = [];

  for (let i = 0; i < NUM_TABS; i++) {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1512, height: 982 },
      args: ["--window-size=1512,982"],
    });
    browsers.push(browser);

    const page = await browser.newPage();
    await page.goto("https://opencritic.com/", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForSelector('input[placeholder="Search"]', {
      timeout: 30000,
    });
    pages.push(page);
    console.log(`Browser ${i + 1} ready`);
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
    tabIndex: number,
  ) {
    const currentNum = ++processed;
    console.log(
      `\n[Browser ${tabIndex + 1}] [${currentNum}/${totalGames}] Processing: ${game.name}`,
    );

    let rating: ScrapedRating | null = null;
    try {
      rating = await scrapeGameRating(game.name, page);
    } catch (error) {
      console.error(`[Browser ${tabIndex + 1}] Unexpected error:`, error);
    }

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
      console.log(`  [Browser ${tabIndex + 1}] Saved:`);
      console.log(`    Tier: ${rating.tier}`);
      console.log(`    Top Critic Average: ${rating.topCriticAverage}`);
      console.log(`    Critics Recommend: ${rating.criticsRecommend}%`);
      console.log(`    Player Rating: ${rating.playerRating}`);
      console.log(`    URL: ${rating.url}`);
    } else {
      failed++;
      failedGames.push(game.name);
      console.log(`  [Browser ${tabIndex + 1}] Failed to scrape rating`);
    }
  }

  // Process games in parallel batches
  for (let i = 0; i < games.length; i += NUM_TABS) {
    const batch = games.slice(i, i + NUM_TABS);
    await Promise.allSettled(
      batch.map((game, index) => processGame(game, pages[index], index)),
    );
  }

  // Close all browsers
  for (const browser of browsers) {
    await browser.close();
  }

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
