import type { Request } from 'express';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
export declare class CartController {
    private readonly cartService;
    constructor(cartService: CartService);
    getCart(req: Request & {
        user?: any;
    }): Promise<import("./cart.types").CartResponse>;
    addItem(req: Request & {
        user?: any;
    }, dto: AddCartItemDto): Promise<import("./cart.types").CartResponse>;
    updateItem(req: Request & {
        user?: any;
    }, menuItemId: string, dto: UpdateCartItemDto): Promise<import("./cart.types").CartResponse>;
    removeItem(req: Request & {
        user?: any;
    }, menuItemId: string): Promise<import("./cart.types").CartResponse>;
    clearCart(req: Request & {
        user?: any;
    }): Promise<void>;
}
