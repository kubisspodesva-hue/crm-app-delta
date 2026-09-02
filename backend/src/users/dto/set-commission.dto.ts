import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { CommissionType } from '../../common/enums';

export class SetCommissionDto {
  @IsEnum(CommissionType)
  type: CommissionType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;
}
