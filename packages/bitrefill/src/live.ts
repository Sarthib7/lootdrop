import type {
  BitrefillClient,
  InvoiceRequest,
  InvoiceResult,
  OrderResult,
  Product,
  ProductQuery,
  RedemptionInfo,
} from "./types.js";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface RawPackage {
  value?: string;
  amount?: number;
  price?: number; // settlement-currency units (e.g. sats), NOT USD — ignore for face
}
interface RawProduct {
  id: string;
  name: string;
  country_code?: string;
  currency?: string;
  categories?: string[];
  packages?: RawPackage[] | RawPackage;
  range?: { min?: number };
}

interface RawRedemption {
  code?: string;
  link?: string;
  pin?: string;
  instructions?: string;
  other?: string;
}
interface RawOrder {
  id?: string;
  status?: string;
  delivered_time?: string;
  // Verified live: usually an object {code,instructions,other,...}; can be a
  // plain string for some products.
  redemption_info?: string | RawRedemption;
}

/**
 * Known Bitrefill TEST products (verified live: free, no balance deducted).
 * They are NOT returned by the catalog search/listing endpoints — only
 * reachable by id — so we surface them from this known list and fulfill them
 * through the real API. All are ranged USD products ($10–$100, $10 step); the
 * recipient's claim value chooses the denomination. (test-gift-card-link is a
 * fixed/named package and is intentionally omitted.)
 */
const TEST_PRODUCTS: Array<{ id: string; name: string; category: string }> = [
  { id: "test-gift-card-code", name: "Test Gift Card (code)", category: "gifts" },
  { id: "test-phone-refill", name: "Test Phone Refill", category: "phone" },
  { id: "test-gift-card-code-fail", name: "Test Gift Card (always fails)", category: "gifts" },
];

/**
 * Live Bitrefill API v2 client. Shapes verified against the real API:
 * products are priced per-product `currency` with the USD face in
 * `range`/`packages[].amount` (the `price` field is settlement units like sats,
 * NOT USD); `categories` is an array; `redemption_info` is a STRING; and
 * delivery is asynchronous (poll the order until terminal). Production stays on
 * TEST PRODUCTS, so no real balance is ever spent. The API key never leaves this
 * process (PRD §21.1).
 */
export class LiveBitrefillClient implements BitrefillClient {
  constructor(
    private apiKey: string,
    private baseUrl: string = "https://api.bitrefill.com/v2",
  ) {}

  private async request(path: string, init?: RequestInit): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`Bitrefill ${path} failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  /** Test products at the largest $10-step denomination that fits the claim. */
  private testProducts(query: ProductQuery): Product[] {
    const max = query.maxPriceCents ?? 100_00;
    const denom = Math.min(100_00, Math.floor(max / 10_00) * 10_00);
    if (denom < 10_00) return []; // claim below the $10 minimum
    return TEST_PRODUCTS.filter(
      (t) => !query.category || t.category === query.category,
    ).map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      countries: [], // test products are global
      priceCents: denom,
      isTestProduct: true,
    }));
  }

  async searchProducts(query: ProductQuery): Promise<Product[]> {
    // Test products are not discoverable via the catalog — serve the known list.
    if (query.includeTestProducts) return this.testProducts(query);

    const params = new URLSearchParams();
    if (query.country) params.set("country", query.country);
    if (query.query) params.set("q", query.query);
    const path = query.query ? `/products/search?${params}` : `/products?${params}`;

    const data = (await this.request(path)) as { data?: RawProduct[] };
    return (data.data ?? [])
      // USD-only MVP: ignore products priced in other currencies.
      .filter((p) => (p.currency ?? "USD") === "USD")
      .map((p): Product => {
        const pkg = Array.isArray(p.packages) ? p.packages[0] : p.packages;
        const faceUsd = Number(pkg?.amount ?? pkg?.value ?? p.range?.min ?? 0);
        return {
          id: p.id,
          name: p.name,
          category: p.categories?.[0] ?? "other",
          countries: p.country_code ? [p.country_code] : [],
          priceCents: Math.round((Number.isFinite(faceUsd) ? faceUsd : 0) * 100),
          isTestProduct: p.id.startsWith("test-"),
        };
      })
      .filter((p) => {
        if (query.category && p.category !== query.category) return false;
        if (query.maxPriceCents !== undefined && p.priceCents > query.maxPriceCents)
          return false;
        return true;
      });
  }

  async createInvoice(req: InvoiceRequest): Promise<InvoiceResult> {
    const product: Record<string, unknown> = {
      product_id: req.productId,
      quantity: 1,
    };
    // Ranged products (the test products are $10–$100) require an explicit value.
    if (req.valueCents !== undefined) product.value = req.valueCents / 100;

    const data = (await this.request(`/invoices`, {
      method: "POST",
      body: JSON.stringify({
        products: [product],
        payment_method: "balance",
        auto_pay: true,
      }),
    })) as {
      data?: { id: string; status: string; orders?: Array<{ id: string }> };
    };
    const inv = data.data;
    if (!inv) throw new Error("Bitrefill invoice: empty response");
    // Invoice status enum: not_delivered | complete | denied | payment_error.
    // `not_delivered` is the normal in-flight state, not a failure.
    const status: InvoiceResult["status"] =
      inv.status === "denied"
        ? "denied"
        : inv.status === "payment_error"
          ? "payment_error"
          : "complete";
    return { invoiceId: inv.id, orderId: inv.orders?.[0]?.id ?? "", status };
  }

  /**
   * Fetch-on-demand; polls because delivery is async. Successful test products
   * deliver instantly; the cap keeps a stuck/failed order from blocking the
   * recipient's chat too long (≈12s worst case before reporting failure).
   */
  async getOrder(orderId: string): Promise<OrderResult> {
    for (let attempt = 0; ; attempt++) {
      const order = await this.fetchOrder(orderId);
      if (order.status !== "processing" || attempt >= 8) return order;
      await sleep(Math.min(2000, 250 * 2 ** attempt));
    }
  }

  /** Map Bitrefill's redemption_info (object or string) to our structured shape. */
  private mapRedemption(
    ri: string | RawRedemption | undefined,
  ): RedemptionInfo | undefined {
    if (!ri) return undefined;
    if (typeof ri === "string") return { instructions: ri };
    const out: RedemptionInfo = {};
    if (ri.code) out.code = ri.code;
    if (ri.link) out.link = ri.link;
    if (ri.pin) out.pin = ri.pin;
    const instructions = [ri.instructions, ri.other].filter(Boolean).join("\n");
    if (instructions) out.instructions = instructions;
    return Object.keys(out).length ? out : undefined;
  }

  private async fetchOrder(orderId: string): Promise<OrderResult> {
    const data = (await this.request(`/orders/${orderId}`)) as { data?: RawOrder };
    const order = data.data;
    if (!order) return { orderId, status: "failed" };
    const delivered = order.status === "delivered" || !!order.delivered_time;
    const failed = order.status === "failed" || order.status === "refunded";
    const status: OrderResult["status"] = delivered
      ? "delivered"
      : failed
        ? "failed"
        : "processing"; // `created` and anything non-terminal
    return {
      orderId: order.id ?? orderId,
      status,
      redemption: this.mapRedemption(order.redemption_info),
    };
  }
}
