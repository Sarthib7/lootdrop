/**
 * Live Bitrefill API validation harness — run BEFORE flipping production to
 * BITREFILL_MODE=live. Exercises the LiveBitrefillClient against the REAL v2 API
 * using TEST PRODUCTS only (free, no balance deducted), and prints exactly what
 * the API returns so we can confirm the client's parsing matches reality.
 *
 *   BITREFILL_API_KEY=<your Personal API key> \
 *     pnpm --filter @lootdrop/bitrefill verify
 *
 * A Personal API key is free (bitrefill.com → Account → Developers). Test
 * products do not require a funded balance.
 */
import { LiveBitrefillClient } from "./live.js";

const key = process.env.BITREFILL_API_KEY;
if (!key) {
  console.error("Set BITREFILL_API_KEY to a Bitrefill Personal API key.");
  process.exit(1);
}

const client = new LiveBitrefillClient(key, process.env.BITREFILL_API_BASE);

const SEED_CATEGORIES = ["gaming", "food", "shopping", "mobile_topup"];

function section(title: string): void {
  console.log(`\n${"=".repeat(60)}\n${title}\n${"=".repeat(60)}`);
}

async function main(): Promise<void> {
  // 1. Do the real test products surface, and what shape do they have?
  section("1. List test products (include_test_products=true, no filters)");
  const all = await client.searchProducts({ includeTestProducts: true });
  console.log(`Returned ${all.length} product(s).`);
  for (const p of all.slice(0, 25)) {
    console.log(
      `  ${p.id.padEnd(28)} cat=${String(p.category).padEnd(12)} ` +
        `countries=[${p.countries.join(",")}] price=$${(p.priceCents / 100).toFixed(2)} test=${p.isTestProduct}`,
    );
  }
  const testIds = all.filter((p) => p.isTestProduct).map((p) => p.id);
  console.log(`\nTest product ids seen: ${testIds.join(", ") || "(none!)"}`);

  // 2. CRITICAL: does the bot's category filter hide test products?
  section("2. Category-filter probe (the bot searches by category)");
  for (const cat of SEED_CATEGORIES) {
    const r = await client.searchProducts({ includeTestProducts: true, category: cat });
    const tests = r.filter((p) => p.isTestProduct);
    console.log(
      `  category="${cat}" -> ${r.length} total, ${tests.length} test product(s)` +
        (tests.length ? ` [${tests.map((p) => p.id).join(", ")}]` : "  <-- EMPTY: bot would show no rewards here"),
    );
  }

  // 3. Full redemption of a known SUCCESS test product.
  section("3. Redeem test-gift-card-code (ranged, value $10) end-to-end");
  try {
    const invoice = await client.createInvoice({
      productId: "test-gift-card-code",
      claimId: "verify-success",
      valueCents: 1000,
    });
    console.log("invoice:", invoice);
    const order = await client.getOrder(invoice.orderId);
    console.log("order status:", order.status);
    console.log("redemption:", JSON.stringify(order.redemption));
    console.log(order.status === "delivered" ? "  ✅ delivered" : "  ⚠️ not delivered");
  } catch (err) {
    console.error("  ❌ failed:", err instanceof Error ? err.message : err);
  }

  // 4. Confirm a known FAIL test product is handled as a failure.
  section("4. Redeem test-gift-card-code-fail (should fail cleanly)");
  try {
    const invoice = await client.createInvoice({
      productId: "test-gift-card-code-fail",
      claimId: "verify-fail",
      valueCents: 1000,
    });
    console.log("invoice:", invoice);
    const order = await client.getOrder(invoice.orderId);
    console.log("order status:", order.status, order.status === "failed" ? "  ✅ failed as expected" : "  ⚠️ unexpected");
  } catch (err) {
    console.error("  (threw):", err instanceof Error ? err.message : err);
  }

  section("Done — compare the above against the bot's expectations");
  console.log(
    "If section 2 shows EMPTY categories, the live client needs a test-product\n" +
      "fallback so the recipient flow can surface them. Tell me and I'll patch it.",
  );
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
