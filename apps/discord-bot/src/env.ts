function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name} (see .env.example)`);
    process.exit(1);
  }
  return value;
}

export const env = {
  token: required("DISCORD_TOKEN"),
  clientId: required("DISCORD_CLIENT_ID"),
  guildId: required("DISCORD_GUILD_ID"),
  logChannelId: required("DISCORD_LOG_CHANNEL_ID"),
  adminRoleId: required("DISCORD_ADMIN_ROLE_ID"),
};
