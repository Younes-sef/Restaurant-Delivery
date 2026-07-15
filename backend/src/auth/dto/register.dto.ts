import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  /**
   * Password rules:
   *  - At least 8 characters
   *  - At most 72 characters (bcrypt silently truncates above this)
   *  - Must contain at least one uppercase letter, one lowercase letter,
   *    one digit, and one special character.
   */
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(72, { message: 'Password must not exceed 72 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  /**
   * Phone is optional at registration but validated if provided.
   * Accepts international formats: e.g. +44 7911 123456, 07911123456
   */
  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'Phone must be a valid international phone number (7–15 digits)',
  })
  phone?: string;
}
