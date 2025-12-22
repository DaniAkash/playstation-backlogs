import "dotenv/config";
import {
  exchangeNpssoForAccessCode,
  exchangeAccessCodeForAuthTokens,
  getPurchasedGames,
  type PurchasedGame,
} from "psn-api";
import { db } from "@/db";
import { purchasedGames } from "@/db/schema";

const myNpsso = process.env.NPSSO!;

(async () => {
  if (!myNpsso) {
    console.error("NPSSO environment variable is not set.");
    process.exit(1);
  }

  console.log("Authenticating...");
  const accessCode = await exchangeNpssoForAccessCode(myNpsso);
  const authorization = await exchangeAccessCodeForAuthTokens(accessCode);
  console.log("Authenticated.");

  let allGames: PurchasedGame[] = [];
  let start = 0;
  const size = 100; // Max size per request
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching games starting at ${start}...`);
    try {
      const response = await getPurchasedGames(authorization, {
        platform: ["ps4", "ps5"],
        size: size,
        start: start,
        sortBy: "ACTIVE_DATE",
        sortDirection: "desc",
      });

      const games = response.data.purchasedTitlesRetrieve.games;
      if (!games || games.length === 0) {
        hasMore = false;
      } else {
        allGames = allGames.concat(games);
        start += games.length;
        if (games.length < size) {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error("Error fetching games:", error);
      hasMore = false;
    }
  }

  console.log(`Fetched ${allGames.length} games.`);

  console.log("Saving to database...");

  for (const game of allGames) {
    await db.insert(purchasedGames).values({
      conceptId: game.conceptId,
      entitlementId: game.entitlementId,
      imageUrl: game.image.url,
      isActive: game.isActive,
      isDownloadable: game.isDownloadable,
      isPreOrder: game.isPreOrder,
      membership: String(game.membership),
      name: game.name,
      platform: String(game.platform),
      productId: game.productId,
      titleId: game.titleId,
    }).onConflictDoUpdate({
      target: purchasedGames.entitlementId,
      set: {
        conceptId: game.conceptId,
        imageUrl: game.image.url,
        isActive: game.isActive,
        isDownloadable: game.isDownloadable,
        isPreOrder: game.isPreOrder,
        membership: String(game.membership),
        name: game.name,
        platform: String(game.platform),
        productId: game.productId,
        titleId: game.titleId,
        updatedAt: new Date(),
      }
    });
  }

  console.log("Done.");
})();