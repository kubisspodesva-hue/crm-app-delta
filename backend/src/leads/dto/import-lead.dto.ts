import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class ImportLeadItemDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phone: string;

  // Nepovinný - automatizace u části kandidátů dohledá jen telefon (bez e-mailu),
  // dřív se kvůli tomu jinak validní kandidáti zbytečně zahazovali.
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  oldWebsiteUrl?: string;

  // Nepovinné - když se nevyplní, lead spadne do "Nepřiřazeno" a obchodník/admin
  // si ho přiřadí ručně.
  @IsOptional()
  @IsUUID()
  assignedAgentId?: string;
}

export class ImportLeadsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ImportLeadItemDto)
  items: ImportLeadItemDto[];
}
