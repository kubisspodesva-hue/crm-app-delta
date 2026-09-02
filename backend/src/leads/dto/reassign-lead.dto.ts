import { IsOptional, IsUUID } from 'class-validator';

export class ReassignLeadDto {
  // null = zrušit přiřazení (lead bude "Nepřiřazeno")
  @IsOptional()
  @IsUUID()
  agentId: string | null;
}
