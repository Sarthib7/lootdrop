import type {
  BitrefillClient,
  InvoiceRequest,
  InvoiceResult,
  OrderResult,
  Product,
  ProductQuery,
} from "./types.js";

/**
 * Thin live client (M3 "shell"). Endpoint shapes follow
 * https://docs.bitrefill.com/docs — verify field names against real responses
 * on day 1 before trusting this beyond test products. The API key never leaves
 * this process (PRD §21.1).
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
    if (query.includeTestProducts) params.set("include_test_products", "true");
    const data = (await this.request(`/products?${params}`)) as {
      data?: Array<{
        id: string;
        name: string;
        category?: string;
        countries?: string[];
        packages?: Array<{ price?: number }>;
        is_test?: boolean;
      }>;
    };
    return (data.data ?? [])
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category ?? "other",
        countries: p.countries ?? [],
        priceCents: Math.round((p.packages?.[0]?.price ?? 0) * 100),
        isTestProduct: p.is_test ?? p.id.startsWith("test-"),
      }))
      .filter((p) => {
        if (query.category && p.category !== query.category) return false;
        if (
          query.maxPriceCents !== undefined &&
          p.priceCents > query.maxPriceCents
        )
          return false;
        return true;
      });
  }

  async createInvoice(req: InvoiceRequest): Promise<InvoiceResult> {
    const data = (await this.request(`/invoices`, {
      method: "POST",
      body: JSON.stringify({
        products: [{ product_id: req.productId, quantity: 1 }],
        payment_method: "balance",
        auto_pay: true,
      }),
    })) as {
      data?: {
        id: string;
        status: string;
        orders?: Array<{ id: string }>;
      };
    };
    const inv = data.data;
    if (!inv) throw new Error("Bitrefill invoice: empty response");
    return {
      invoiceId: inv.id,
      orderId: inv.orders?.[0]?.id ?? "",
      status: inv.status === "complete" ? "complete" : "payment_error",
    };
  }

  async getOrder(orderId: string): Promise<OrderResult> {
    const data = (await this.request(`/orders/${orderId}`)) as {
      data?: {
        id: string;
        status?: string;
        redemption_info?: {
          code?: string;
          link?: string;
          pin?: string;
          instructions?: string;
        };
      };
    };
    const order = data.data;
    if (!order) return { orderId, status: "failed" };
    const delivered = order.status === "delivered" || !!order.redemption_info;
    return {
      orderId: order.id,
      status: delivered ? "delivered" : order.status === "failed" ? "failed" : "processing",
      redemption: order.redemption_info,
    };
  }
}
