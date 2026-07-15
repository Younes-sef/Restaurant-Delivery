/**
 * Represents a single enriched line item in the cart response.
 * Prices are serialized as strings to avoid floating-point precision issues
 * in JSON — the same convention used by the Menu module.
 */
export interface CartLineItem {
  menuItemId: string;
  name: string;
  imageUrl: string | null;
  unitPrice: string;  // Decimal serialized as string, e.g. "10.99"
  quantity: number;
  lineTotal: string;  // unitPrice * quantity, e.g. "21.98"
}

/**
 * The full cart response returned by GET /api/v1/cart.
 * Totals are computed live at read time from current menu prices,
 * ensuring the customer always sees accurate values even if prices
 * changed since they last updated their cart.
 */
export interface CartResponse {
  items: CartLineItem[];
  subtotal: string;   // Sum of all lineTotals
  itemCount: number;  // Total number of individual units across all line items
}
