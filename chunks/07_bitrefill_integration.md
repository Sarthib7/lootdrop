---
chunk_id: 07_bitrefill_integration
title: Bitrefill Integration
read_when: Building product search, fulfillment, or webhooks
dependencies: [10_security_compliance]
related_tasks: [M3]
sources:
  - https://docs.bitrefill.com/docs/api-overview
  - https://docs.bitrefill.com/docs/searching-products
  - https://docs.bitrefill.com/docs/gift-cards
  - https://docs.bitrefill.com/docs/test-products
  - https://docs.bitrefill.com/docs/webhooks
---

# 07 — Bitrefill Integration

## API capabilities to use

```txt
product search/listing
invoice creation
order retrieval
redemption info retrieval
test products
webhooks or polling
```

## Test products

Use these first:

```txt
test-gift-card-code
test-gift-card-link
test-gift-card-code-fail
test-gift-card-link-fail
```

## Search

```txt
GET /products/search?q=steam
GET /products?country=US&type=gift_card
GET /products?include_test_products=true
```

## Invoice

```txt
POST /invoices
products=[product_id + package_id or value]
payment_method=balance
auto_pay=true
webhook_url=https://...
```

## Redemption fields

Handle all shapes:

```txt
code
link
pin
instructions
```

## Value matching

Products are fixed packages in local currencies; claim value rarely matches exactly. MVP rule: show only products/packages priced <= remaining claim value; recipient picks one; remainder forfeited and shown before confirmation ("uses $9.50 of your $10.00 reward"). Prefer flexible-value products in ranking — they consume the claim exactly. No carryover, no multi-product redemption in MVP.

## Demo transport

Use polling for invoice/order status in the hackathon demo (STATUS M3-07, P0) — no public webhook URL needed. Webhooks are P1.

## Delivery rule

Never post redemption data publicly. Deliver only to recipient DM. Never persist codes — fetch from Bitrefill order retrieval on demand for delivery/re-delivery.
