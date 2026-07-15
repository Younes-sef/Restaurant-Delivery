import { PartialType } from '@nestjs/mapped-types';
import { CreateAddressDto } from './create-address.dto';

/**
 * UpdateAddressDto inherits all fields from CreateAddressDto and makes
 * every one of them optional — so clients can PATCH only the fields they
 * want to change without having to resend the whole object.
 *
 * PartialType also preserves all class-validator decorators, so field-level
 * validation still runs on any value that IS provided.
 */
export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
