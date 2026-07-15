export interface CartLineItem {
    menuItemId: string;
    name: string;
    imageUrl: string | null;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
}
export interface CartResponse {
    items: CartLineItem[];
    subtotal: string;
    itemCount: number;
}
