import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { LeadStatus } from '../../common/enums';

export class ChangeStatusDto {
  @IsEnum(LeadStatus)
  status: LeadStatus;

  // Vyplní se při přechodu do WON (dřív SOLD)
  @IsOptional()
  @IsNumber()
  @Min(0)
  dealValue?: number;
}
