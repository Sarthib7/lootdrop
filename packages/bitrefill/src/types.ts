/**
 * Product as LootDrop sees it. Prices are USD cents — USD-only MVP; we compare
 * against whatever price Bitrefill's API reports (their conversion, not ours).
 */
export interface Product {
  id: string;
  name: string;
  category: string;
  countries: string[]; // ISO codes; empty = global
  priceCents: number;
  isTestProduct: boolean;
}

export interface ProductQuery {
  country?: string;
  category?: string;
  maxPriceCents?: number;
  includeTestProducts?: boolean;
  /** Free-text keyword for the live `/products/search?q=` endpoint. */
  query?: string;
}

export interface InvoiceRequest {
  productId: string;
  /** Idempotency: one claim -> at most one invoice. */
  claimId: string;
  /** Denomination to buy in USD cents -> sent as `value` (dollars) to the live API. */
  valueCents?: number;
}

export interface InvoiceResult {
  invoiceId: string;
  orderId: string;
  status: "complete" | "denied" | "payment_error";
}

/**
 * Redemption info has multiple shapes (code, link, pin, instructions) — not
 * every product has every field. NEVER persisted (ADR 0002); fetched on demand.
 */
export interface RedemptionInfo {
  code?: string;
  link?: string;
  pin?: string;
  instructions?: string;
}

export interface OrderResult {
  orderId: string;
  status: "delivered" | "failed" | "processing";
  redemption?: RedemptionInfo;
}

export interface BitrefillClient {
  searchProducts(query: ProductQuery): Promise<Product[]>;
  /** Creates and pays an invoice (payment_method=balance, auto_pay). */
  createInvoice(req: InvoiceRequest): Promise<InvoiceResult>;
  /** Fetch-on-demand redemption info; must be repeatable for re-delivery. */
  getOrder(orderId: string): Promise<OrderResult>;
}
