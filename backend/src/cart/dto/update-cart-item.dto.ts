import { IsInt, Max, Min } from 'class-validator';

export class UpdateCartItemDto {
  /**
   * The new desired quantity for this line item.
   * To remove an item entirely, use DELETE /cart/items/:menuItemId instead.
   */
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}
