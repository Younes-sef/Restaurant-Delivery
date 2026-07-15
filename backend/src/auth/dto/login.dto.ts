import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  /**
   * We deliberately avoid repeating password-strength rules here.
   * Login just needs a non-empty string — the bcrypt comparison handles
   * the rest. Overly strict validation here would break legacy passwords
   * if the policy ever changes.
   */
  @IsString()
  @IsNotEmpty()
  password: string;
}
