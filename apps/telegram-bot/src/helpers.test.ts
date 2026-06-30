import { describe, expect, it } from "vitest";
import { parseRewardArgs, resolveRecipient } from "./parse.js";
import { CALLBACK_LIMIT, decode, encode } from "./callbacks.js";
import { clearSelection, getSelection, setSelection } from "./session.js";

describe("parseRewardArgs", () => {
  it("parses amount + reason", () => {
    const r = parseRewardArgs("10 great bug report");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.amount).toBe(10);
      expect(r.value.reason).toBe("great bug report");
    }
  });

  it("drops a leading @username (recipient comes from the reply)", () => {
    const r = parseRewardArgs("@alice 5 nice work");
    expect(r.ok && r.value.amount).toBe(5);
    expect(r.ok && r.value.reason).toBe("nice work");
  });

  it("rejects a non-numeric amount", () => {
    expect(parseRewardArgs("ten bucks").ok).toBe(false);
  });

  it("rejects amount < 1", () => {
    expect(parseRewardArgs("0 nope").ok).toBe(false);
  });

  it("requires a reason of >= 3 chars", () => {
    expect(parseRewardArgs("10 ab").ok).toBe(false);
    expect(parseRewardArgs("10").ok).toBe(false);
  });
});

describe("resolveRecipient", () => {
  it("uses reply_to_message.from", () => {
    expect(
      resolveRecipient({ reply_to_message: { from: { id: 42, username: "al" } } })?.id,
    ).toBe("42");
  });

  it("ignores replies authored by a bot", () => {
    expect(
      resolveRecipient({ reply_to_message: { from: { id: 42, is_bot: true } } }),
    ).toBeUndefined();
  });

  it("uses a text_mention entity's user id", () => {
    expect(
      resolveRecipient({ entities: [{ type: "text_mention", user: { id: 7 } }] })?.id,
    ).toBe("7");
  });

  it("returns undefined for a plain @mention (carries no id)", () => {
    expect(resolveRecipient({ entities: [{ type: "mention" }] })).toBeUndefined();
  });
});

describe("callback codec", () => {
  it("round-trips action/claimId/arg", () => {
    expect(decode(encode("confirm", "ckxyz123", 3))).toEqual({
      action: "confirm",
      claimId: "ckxyz123",
      arg: "3",
    });
  });

  it("stays within 64 bytes for a full cuid + product index", () => {
    const data = encode("confirm", "clp9z8q7w0001abcd1234efgh", 4);
    expect(Buffer.byteLength(data, "utf8")).toBeLessThanOrEqual(CALLBACK_LIMIT);
  });

  it("throws if the encoded data would exceed the byte limit", () => {
    expect(() => encode("confirm", "x".repeat(70))).toThrow();
  });

  it("ignores callback data from another namespace", () => {
    expect(decode("other|ap|id")).toBeUndefined();
  });
});

describe("selection session", () => {
  it("stores and retrieves", () => {
    setSelection("c1", { country: "US" });
    expect(getSelection("c1")?.country).toBe("US");
  });

  it("merges successive patches", () => {
    setSelection("c2", { country: "DE" });
    setSelection("c2", { category: "gaming" });
    const s = getSelection("c2");
    expect(s?.country).toBe("DE");
    expect(s?.category).toBe("gaming");
  });

  it("clears", () => {
    setSelection("c3", { country: "IN" });
    clearSelection("c3");
    expect(getSelection("c3")).toBeUndefined();
  });
});
