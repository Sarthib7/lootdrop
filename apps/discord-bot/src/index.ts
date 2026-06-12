import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import { env } from "./env.js";
import {
  handleMyRewards,
  handleReward,
  handleRewardsBudget,
  handleRewardsPending,
} from "./commands.js";
import {
  handleApprovalButton,
  handleCategorySelect,
  handleConfirmButton,
  handleCountrySelect,
  handleProductSelect,
  handleRetryButton,
} from "./flow.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel], // DM component interactions
});

client.once(Events.ClientReady, (c) => {
  console.log(`LootDrop bot ready as ${c.user.tag} (mode: ${process.env.BITREFILL_MODE ?? "mock"})`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      switch (interaction.commandName) {
        case "reward":
          return await handleReward(interaction);
        case "rewards": {
          const sub = interaction.options.getSubcommand();
          if (sub === "pending") return await handleRewardsPending(interaction);
          if (sub === "budget") return await handleRewardsBudget(interaction);
          return;
        }
        case "myrewards":
          return await handleMyRewards(interaction);
      }
      return;
    }

    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      const [ns, action, claimId, country, productId] =
        interaction.customId.split("|");
      if (ns !== "ld") return;

      if (interaction.isButton()) {
        if (action === "approve" || action === "deny")
          return await handleApprovalButton(interaction, action, claimId);
        if (action === "confirm")
          return await handleConfirmButton(interaction, claimId, country, productId);
        if (action === "retry") return await handleRetryButton(interaction, claimId);
      }
      if (interaction.isStringSelectMenu()) {
        if (action === "country")
          return await handleCountrySelect(interaction, claimId);
        if (action === "category")
          return await handleCategorySelect(interaction, claimId, country);
        if (action === "product")
          return await handleProductSelect(interaction, claimId, country);
      }
    }
  } catch (err) {
    console.error("interaction error:", err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction
        .reply({ content: "Something went wrong.", ephemeral: true })
        .catch(() => undefined);
    }
  }
});

await client.login(env.token);
