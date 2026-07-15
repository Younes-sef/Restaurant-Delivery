import { PartialType } from '@nestjs/mapped-types';
import { CreateMenuItemDto } from './create-menu-item.dto';

/**
 * All fields become optional, but validators on each field are still applied
 * when the field IS provided — no need to duplicate any annotations.
 */
export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {}
