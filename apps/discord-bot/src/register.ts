import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { env } from "./env.js";

const commands = [
  new SlashCommandBuilder()
    .setName("reward")
    .setDescription("Create a reward claim for a member")
    .addUserOption((o) =>
      o.setName("user").setDescription("Recipient").setRequired(true),
    )
    .addIntegerOption((o) =>
      o
        .setName("amount")
        .setDescription("Whole USD amount, e.g. 10")
        .setRequired(true)
        .setMinValue(1),
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Why they earned it").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("rewards")
    .setDescription("Reward admin commands")
    .addSubcommand((s) =>
      s.setName("pending").setDescription("List claims awaiting approval"),
    )
    .addSubcommand((s) =>
      s.setName("budget").setDescription("Show remaining reward budget"),
    ),
  new SlashCommandBuilder()
    .setName("myrewards")
    .setDescription("Show your reward claims"),
].map((c) => c.toJSON());

const rest = new REST().setToken(env.token);
await rest.put(Routes.applicationGuildCommands(env.clientId, env.guildId), {
  body: commands,
});
console.log(`Registered ${commands.length} guild commands for ${env.guildId}.`);
