import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMeetingDto {
  @IsUUID()
  leadId: string;

  @IsISO8601()
  start: string;

  @IsISO8601()
  end: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
