import { MockBitrefillClient } from "./mock.js";
import { LiveBitrefillClient } from "./live.js";
import type { BitrefillClient } from "./types.js";

export * from "./types.js";
export { MockBitrefillClient } from "./mock.js";
export { LiveBitrefillClient } from "./live.js";

let singleton: BitrefillClient | undefined;

/** Mode from env: "mock" (default) or "live" (requires BITREFILL_API_KEY). */
export function getBitrefillClient(): BitrefillClient {
  if (!singleton) {
    if (process.env.BITREFILL_MODE === "live") {
      const key = process.env.BITREFILL_API_KEY;
      if (!key) throw new Error("BITREFILL_MODE=live but BITREFILL_API_KEY is empty");
      singleton = new LiveBitrefillClient(key, process.env.BITREFILL_API_BASE);
    } else {
      singleton = new MockBitrefillClient();
    }
  }
  return singleton;
}
