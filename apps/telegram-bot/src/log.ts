import { GrammyError, HttpError } from "grammy";

/**
 * Log an error WITHOUT ever serializing a raw GrammyError — its `.payload` is an
 * enumerable own property that, for a failed sendMessage/editMessageText, holds
 * the full message `text`. That text can contain a live redemption secret
 * (code/link/pin), so dumping the whole error object would leak it to the logs
 * (violating ADR 0002 / the redaction invariant). Log only safe fields.
 */
export function logBotError(context: string, error: unknown): void {
  if (error instanceof GrammyError) {
    console.error(
      `${context}: Telegram API ${error.error_code} on ${error.method}: ${error.description}`,
    );
  } else if (error instanceof HttpError) {
    console.error(`${context}: network error contacting Telegram`);
  } else if (error instanceof Error) {
    console.error(`${context}: ${error.message}`);
  } else {
    console.error(`${context}: unknown error`);
  }
}
