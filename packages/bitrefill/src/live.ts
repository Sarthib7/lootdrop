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

interface RawProduct {
  id: string;
  name: string;
  country_code?: string;
  packages?: Array<{ price?: number }> | { price?: number };
  range?: { min?: number };
}

interface RawOrder {
  id?: string;
  status?: string;
  delivered_time?: string;
  redemption_info?: string;
}

/**
 * Live Bitrefill API v2 client. Shapes verified against docs.bitrefill.com:
 * products expose `country_code` + `packages`/`range` (no countries/category/
 * is_test fields), `redemption_info` is a STRING, and delivery is asynchronous
 * (poll the order until terminal). We stay on TEST PRODUCTS in production, so no
 * real balance is ever spent. The API key never leaves this process (PRD §21.1).
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

  async searchProducts(query: ProductQuery): Promise<Product[]> {
    const params = new URLSearchParams();
    if (query.country) params.set("country", query.country);
    if (query.category) params.set("category", query.category);
    if (query.includeTestProducts) params.set("include_test_products", "true");
    if (query.query) params.set("q", query.query);
    // /products/search needs a keyword (q); plain listing uses /products.
    const path = query.query ? `/products/search?${params}` : `/products?${params}`;

    const data = (await this.request(path)) as { data?: RawProduct[] };
    return (data.data ?? [])
      .map((p): Product => {
        const pkg = Array.isArray(p.packages) ? p.packages[0] : p.packages;
        const price = pkg?.price ?? p.range?.min ?? 0;
        return {
          id: p.id,
          name: p.name,
          // Products carry no category field — reflect the requested filter
          // (results are already constrained by the `category` query param).
          category: query.category ?? "other",
          countries: p.country_code ? [p.country_code] : [],
          priceCents: Math.round(price * 100),
          isTestProduct: p.id.startsWith("test-"),
        };
      })
      .filter(
        (p) =>
          query.maxPriceCents === undefined || p.priceCents <= query.maxPriceCents,
      );
  }

  async createInvoice(req: InvoiceRequest): Promise<InvoiceResult> {
    const product: Record<string, unknown> = {
      product_id: req.productId,
      quantity: 1,
    };
    // Ranged products (e.g. test-gift-card-code) require an explicit value.
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

  /** Fetch-on-demand; polls because delivery is async even for test products. */
  async getOrder(orderId: string): Promise<OrderResult> {
    for (let attempt = 0; ; attempt++) {
      const order = await this.fetchOrder(orderId);
      if (order.status !== "processing" || attempt >= 15) return order;
      await sleep(Math.min(2000, 250 * 2 ** attempt));
    }
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
    // Real API returns redemption_info as a STRING; map it into our structured
    // RedemptionInfo (as `instructions`) so the mock/UI contract is unchanged.
    const redemption: RedemptionInfo | undefined = order.redemption_info
      ? { instructions: order.redemption_info }
      : undefined;
    return { orderId: order.id ?? orderId, status, redemption };
  }
}
