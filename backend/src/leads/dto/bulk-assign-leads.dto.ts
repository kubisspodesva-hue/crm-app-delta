import { ArrayNotEmpty, IsArray, IsOptional, IsUUID } from 'class-validator';

export class BulkAssignLeadsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids: string[];

  // null = zrušit přiřazení (vybrané leady budou "Nepřiřazeno")
  @IsOptional()
  @IsUUID()
  agentId: string | null;
}
