import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class AddCartItemDto {
  /**
   * The ID of the menu item to add to the cart.
   * Must reference an existing, available MenuItem.
   */
  @IsUUID()
  menuItemId: string;

  /**
   * Desired quantity. Min 1, max 99 per line item.
   * Capped at 99 to prevent absurdly large orders and potential DoS
   * via price calculation overhead at checkout.
   */
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}
