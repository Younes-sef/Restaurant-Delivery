import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        role: import("@prisma/client").$Enums.Role;
        driverStatus: import("@prisma/client").$Enums.DriverStatus | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    login(dto: LoginDto, res: Response): Promise<{
        message: string;
        access_token: string;
    }>;
    logout(req: Request & {
        token?: string;
    }, res: Response): Promise<{
        message: string;
    }>;
    getProfile(req: Request & {
        user?: any;
    }): any;
}
