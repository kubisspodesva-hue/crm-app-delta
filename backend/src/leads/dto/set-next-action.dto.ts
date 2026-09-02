import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { NextActionType } from '../../common/enums';

// "Další akce" = co má obchodník s leadem udělat dál - odděleně od pole
// "status", které říká, kde obchod je (viz redesign 2026-08). Obojí lze
// zaslat null, čímž se "Další akce" u leadu vymaže (např. po jejím splnění).
export class SetNextActionDto {
  @IsOptional()
  @IsEnum(NextActionType)
  nextAction?: NextActionType | null;

  @IsOptional()
  @IsDateString()
  nextActionDueDate?: string | null;
}
