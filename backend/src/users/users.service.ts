import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // User lookup (used internally by AuthService)
  // ---------------------------------------------------------------------------

  async create(data: Prisma.UserCreateInput): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
    return this.prisma.user.create({ data });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // ---------------------------------------------------------------------------
  // Address Management
  // ---------------------------------------------------------------------------

  /**
   * Returns all addresses belonging to the authenticated customer.
   * Ordered by creation date so the most recently added appears last.
   */
  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Creates a new address and associates it with the authenticated user.
   * The userId is injected server-side from the JWT — clients never send it.
   */
  async createAddress(userId: string, dto: CreateAddressDto) {
    return this.prisma.address.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  /**
   * Updates an address.
   *
   * Ownership check: verifies the address belongs to the requesting user
   * before applying any update. Returns 403 (not 404) if ownership fails —
   * a 404 would reveal whether the address ID exists at all.
   */
  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException(`Address with id "${addressId}" not found`);
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this address');
    }

    return this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });
  }

  /**
   * Deletes an address (hard delete — no referential integrity concern here
   * because Order.addressId retains the snapshot at time of placement).
   *
   * Same ownership-first pattern as updateAddress.
   */
  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException(`Address with id "${addressId}" not found`);
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this address');
    }

    await this.prisma.address.delete({ where: { id: addressId } });
  }
}
