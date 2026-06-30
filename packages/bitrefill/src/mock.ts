import type {
  BitrefillClient,
  InvoiceRequest,
  InvoiceResult,
  OrderResult,
  Product,
  ProductQuery,
} from "./types.js";

/**
 * Mock mode mirrors Bitrefill's documented test products
 * (https://docs.bitrefill.com/docs/test-products). Invoices complete
 * synchronously; *-fail products fail at the order stage, matching the
 * "complete invoice does not guarantee order success" behavior from the docs.
 */
// Categories mirror Bitrefill's real test products: gift cards are "gifts",
// phone refills are "phone" (verified against the live API).
const TEST_PRODUCTS: Product[] = [
  {
    id: "test-gift-card-code",
    name: "Test Gift Card (code)",
    category: "gifts",
    countries: [],
    priceCents: 10_00,
    isTestProduct: true,
  },
  {
    id: "test-gift-card-link",
    name: "Test Gift Card (link)",
    category: "gifts",
    countries: [],
    priceCents: 10_00,
    isTestProduct: true,
  },
  {
    id: "test-phone-refill",
    name: "Test Phone Refill",
    category: "phone",
    countries: [],
    priceCents: 5_00,
    isTestProduct: true,
  },
  {
    id: "test-gift-card-code-fail",
    name: "Test Gift Card (code, always fails)",
    category: "gifts",
    countries: [],
    priceCents: 10_00,
    isTestProduct: true,
  },
  {
    id: "test-gift-card-link-fail",
    name: "Test Gift Card (link, always fails)",
    category: "gifts",
    countries: [],
    priceCents: 10_00,
    isTestProduct: true,
  },
];

export class MockBitrefillClient implements BitrefillClient {
  /** orderId -> productId, so getOrder can rebuild redemption info on every call. */
  private orders = new Map<string, string>();
  private seq = 0;

  async searchProducts(query: ProductQuery): Promise<Product[]> {
    if (!query.includeTestProducts) return [];
    return TEST_PRODUCTS.filter((p) => {
      if (query.category && p.category !== query.category) return false;
      if (
        query.country &&
        p.countries.length > 0 &&
        !p.countries.includes(query.country)
      )
        return false;
      if (
        query.maxPriceCents !== undefined &&
        p.priceCents > query.maxPriceCents
      )
        return false;
      return true;
    });
  }

  async createInvoice(req: InvoiceRequest): Promise<InvoiceResult> {
    const product = TEST_PRODUCTS.find((p) => p.id === req.productId);
    if (!product) throw new Error(`Unknown product: ${req.productId}`);
    this.seq += 1;
    const invoiceId = `mock_inv_${this.seq}_${req.claimId}`;
    const orderId = `mock_ord_${this.seq}_${req.claimId}`;
    this.orders.set(orderId, product.id);
    return { invoiceId, orderId, status: "complete" };
  }

  async getOrder(orderId: string): Promise<OrderResult> {
    const productId = this.orders.get(orderId);
    if (!productId) return { orderId, status: "failed" };
    if (productId.endsWith("-fail")) return { orderId, status: "failed" };
    // Deterministic, repeatable redemption info (fetch-on-demand, ADR 0002).
    if (productId === "test-gift-card-link") {
      return {
        orderId,
        status: "delivered",
        redemption: { link: `https://example.com/redeem/${orderId}` },
      };
    }
    if (productId === "test-phone-refill") {
      return {
        orderId,
        status: "delivered",
        redemption: { instructions: "Top-up applied to your number." },
      };
    }
    return {
      orderId,
      status: "delivered",
      redemption: { code: `TEST-${orderId.slice(-8).toUpperCase()}` },
    };
  }
}
