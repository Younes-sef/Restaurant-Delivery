import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: Prisma.UserCreateInput): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User>;
    getAddresses(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        street: string;
        city: string;
        state: string;
        zipCode: string;
        latitude: Prisma.Decimal | null;
        longitude: Prisma.Decimal | null;
        userId: string;
    }[]>;
    createAddress(userId: string, dto: CreateAddressDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        street: string;
        city: string;
        state: string;
        zipCode: string;
        latitude: Prisma.Decimal | null;
        longitude: Prisma.Decimal | null;
        userId: string;
    }>;
    updateAddress(userId: string, addressId: string, dto: UpdateAddressDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        street: string;
        city: string;
        state: string;
        zipCode: string;
        latitude: Prisma.Decimal | null;
        longitude: Prisma.Decimal | null;
        userId: string;
    }>;
    deleteAddress(userId: string, addressId: string): Promise<void>;
}
