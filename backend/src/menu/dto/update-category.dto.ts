import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto';

/**
 * All fields become optional, but validators on each field are still applied
 * when the field IS provided — no need to duplicate any annotations.
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
