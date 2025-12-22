import {
  exchangeNpssoForAccessCode,
  exchangeAccessCodeForAuthTokens,
  getPurchasedGames,
} from "psn-api";

const myNpsso = process.env.NPSSO!;

(async () => {
  const accessCode = await exchangeNpssoForAccessCode(myNpsso);

  const authorization = await exchangeAccessCodeForAuthTokens(accessCode);

  const purchasedGames = await getPurchasedGames(authorization, {
    platform: ["ps4", "ps5"],
    size: 50,
    sortBy: "ACTIVE_DATE",
    sortDirection: "desc",
  });

  console.log(JSON.stringify(purchasedGames));
})();
