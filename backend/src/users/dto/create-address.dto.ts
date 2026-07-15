import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  /**
   * A human-readable label for this address.
   * Examples: "Home", "Office", "Mum's house"
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  label: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  street: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  zipCode: string;

  /**
   * Decimal degrees — optional, stored for future GPS / routing features.
   * @IsLatitude validates range [-90, 90].
   */
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsLatitude()
  @IsOptional()
  latitude?: number;

  /**
   * Decimal degrees — optional.
   * @IsLongitude validates range [-180, 180].
   */
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsLongitude()
  @IsOptional()
  longitude?: number;
}
