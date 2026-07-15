import type { Request } from 'express';
import { UsersService } from './users.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getAddresses(req: Request & {
        user?: any;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        street: string;
        city: string;
        state: string;
        zipCode: string;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        userId: string;
    }[]>;
    createAddress(req: Request & {
        user?: any;
    }, dto: CreateAddressDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        street: string;
        city: string;
        state: string;
        zipCode: string;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        userId: string;
    }>;
    updateAddress(req: Request & {
        user?: any;
    }, id: string, dto: UpdateAddressDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        street: string;
        city: string;
        state: string;
        zipCode: string;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        userId: string;
    }>;
    deleteAddress(req: Request & {
        user?: any;
    }, id: string): Promise<void>;
}
