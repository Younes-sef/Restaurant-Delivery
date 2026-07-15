import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  Max,
  Min,
  IsDecimal,
} from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  /**
   * Price is sent as a number from the client (e.g., 10.99).
   * We validate a max of 2 decimal places to avoid floating-point
   * issues before it reaches Prisma's Decimal field.
   *
   * Prisma stores this as an exact Decimal — no precision is lost.
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999.99)
  price: number;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  ingredients?: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;
}
