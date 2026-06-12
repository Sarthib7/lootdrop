import { describe, expect, it } from "vitest";
import { MockBitrefillClient } from "./mock.js";

describe("MockBitrefillClient", () => {
  it("hides test products unless include_test_products", async () => {
    const c = new MockBitrefillClient();
    expect(await c.searchProducts({})).toEqual([]);
    const found = await c.searchProducts({ includeTestProducts: true });
    expect(found.map((p) => p.id)).toContain("test-gift-card-code");
  });

  it("filters by category and max price", async () => {
    const c = new MockBitrefillClient();
    const gaming = await c.searchProducts({
      includeTestProducts: true,
      category: "gaming",
      maxPriceCents: 10_00,
    });
    expect(gaming.every((p) => p.category === "gaming")).toBe(true);
    expect(gaming.every((p) => p.priceCents <= 10_00)).toBe(true);
  });

  it("fulfills code product and re-fetches redemption repeatedly (ADR 0002)", async () => {
    const c = new MockBitrefillClient();
    const inv = await c.createInvoice({
      productId: "test-gift-card-code",
      claimId: "claim_x",
    });
    expect(inv.status).toBe("complete");
    const first = await c.getOrder(inv.orderId);
    const second = await c.getOrder(inv.orderId);
    expect(first.status).toBe("delivered");
    expect(first.redemption?.code).toBeTruthy();
    expect(second.redemption?.code).toBe(first.redemption?.code);
  });

  it("fail variant: invoice completes but order fails", async () => {
    const c = new MockBitrefillClient();
    const inv = await c.createInvoice({
      productId: "test-gift-card-code-fail",
      claimId: "claim_y",
    });
    expect(inv.status).toBe("complete");
    const order = await c.getOrder(inv.orderId);
    expect(order.status).toBe("failed");
    expect(order.redemption).toBeUndefined();
  });
});
