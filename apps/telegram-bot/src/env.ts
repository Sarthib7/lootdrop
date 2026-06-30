function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name} (see .env.example)`);
    process.exit(1);
  }
  return value;
}

function adminIds(): Set<string> {
  return new Set(
    (process.env.TELEGRAM_ADMIN_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export const env = {
  token: required("TELEGRAM_BOT_TOKEN"),
  /** Extra always-allowed admins (numeric user ids), beyond chat creators/admins. */
  adminIds: adminIds(),
  /**
   * Optional override for where public, redacted audit lines are posted. When
   * unset, the audit line goes back to the community chat the reward was created
   * in (claim.communityId).
   */
  logChatId: process.env.TELEGRAM_LOG_CHAT_ID || undefined,
  /** Health server port (Railway injects PORT). */
  port: Number(process.env.PORT) || 3000,
};
