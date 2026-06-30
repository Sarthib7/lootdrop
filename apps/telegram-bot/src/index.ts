import { createServer } from "node:http";
import { Bot, GrammyError } from "grammy";
import { ClaimError } from "@lootdrop/core";
import { env } from "./env.js";
import { decode } from "./callbacks.js";
import { logBotError } from "./log.js";
import {
  handleMyRewards,
  handleReward,
  handleRewardsBudget,
  handleRewardsPending,
  handleStart,
  handleWhoami,
} from "./commands.js";
import {
  handleApproval,
  handleCategory,
  handleConfirm,
  handleCountry,
  handleProduct,
  handleRetry,
  handleRewardCancel,
  handleRewardConfirm,
} from "./flow.js";
import { recordUser } from "./roster.js";

const bot = new Bot(env.token);

// Learn group members from the messages we see (Telegram bots can't list them),
// so admins can later reward someone by name. Fire-and-forget; never blocks.
bot.use(async (ctx, next) => {
  const chat = ctx.chat;
  const from = ctx.from;
  if (from && (chat?.type === "group" || chat?.type === "supergroup")) {
    void recordUser(String(chat.id), from).catch(() => undefined);
  }
  await next();
});

bot.command("start", handleStart);
bot.command("reward", handleReward);
bot.command("rewards_pending", handleRewardsPending);
bot.command("rewards_budget", handleRewardsBudget);
bot.command("myrewards", handleMyRewards);
bot.command("whoami", handleWhoami);

// Single inline-button router. Every branch ends by answering the callback query
// so the client's loading spinner always clears; domain errors become a toast.
bot.on("callback_query:data", async (ctx) => {
  const decoded = decode(ctx.callbackQuery.data);
  if (!decoded) {
    await ctx.answerCallbackQuery().catch(() => undefined);
    return;
  }
  const { action, claimId, arg } = decoded;
  try {
    switch (action) {
      case "approve":
        await handleApproval(ctx, "approve", claimId);
        break;
      case "deny":
        await handleApproval(ctx, "deny", claimId);
        break;
      case "country":
        await handleCountry(ctx, claimId, arg ?? "");
        break;
      case "category":
        await handleCategory(ctx, claimId, Number(arg));
        break;
      case "product":
        await handleProduct(ctx, claimId, Number(arg));
        break;
      case "confirm":
        await handleConfirm(ctx, claimId, Number(arg));
        break;
      case "retry":
        await handleRetry(ctx, claimId);
        break;
      case "reward_confirm":
        await handleRewardConfirm(ctx, claimId);
        break;
      case "reward_cancel":
        await handleRewardCancel(ctx, claimId);
        break;
    }
    await ctx.answerCallbackQuery().catch(() => undefined);
  } catch (err) {
    // Re-tapping a button that re-renders identical content is harmless.
    if (
      err instanceof GrammyError &&
      err.description.includes("message is not modified")
    ) {
      await ctx.answerCallbackQuery().catch(() => undefined);
      return;
    }
    const text = err instanceof ClaimError ? err.message : "Something went wrong.";
    await ctx.answerCallbackQuery({ text, show_alert: true }).catch(() => undefined);
    // Never log the raw error: a GrammyError payload can carry the redemption
    // secret in its message text (logBotError strips it).
    if (!(err instanceof ClaimError)) logBotError("callback error", err);
  }
});

bot.catch((err) => logBotError("bot", err.error));

// A long-polling bot opens no TCP port; Railway is happiest with one bound.
const health = createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
  } else {
    res.writeHead(404);
    res.end();
  }
});
health.listen(env.port, "0.0.0.0", () =>
  console.log(`health server listening on :${env.port}`),
);

async function main(): Promise<void> {
  await bot.api.setMyCommands([
    { command: "reward", description: "Reward a member (reply, then /reward <amount> <reason>)" },
    { command: "rewards_pending", description: "List claims awaiting approval (admins)" },
    { command: "rewards_budget", description: "Show remaining reward budget" },
    { command: "myrewards", description: "Show your reward claims" },
    { command: "whoami", description: "Show your Telegram id and this chat id" },
    { command: "start", description: "Start the bot / claim a reward" },
  ]);
  // Make sure no webhook is set, or getUpdates long polling 409s.
  await bot.api.deleteWebhook({ drop_pending_updates: true });
  console.log(
    `LootDrop Telegram bot starting (Bitrefill mode: ${process.env.BITREFILL_MODE ?? "mock"})`,
  );
  await bot.start({ onStart: (info) => console.log(`@${info.username} is live`) });
}

const shutdown = async (signal: string): Promise<void> => {
  console.log(`${signal} received — shutting down`);
  health.close();
  await bot.stop();
};
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

main().catch((err) => {
  console.error("fatal startup error:", err);
  process.exit(1);
});
