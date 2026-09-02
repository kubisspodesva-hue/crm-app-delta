import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phone: string;

  // Nepovinný - u části kandidátů z automatizace se dohledá jen telefon
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

  // Nepovinné jen pro soukromé kontakty majitele (isPrivate) - jinak je vyžadováno
  // (kontroluje se v LeadsService.create).
  @IsOptional()
  @IsUUID()
  assignedAgentId?: string;

  // true = soukromý kontakt, smí založit jen majitel účtu (OWNER_EMAIL), a nikdy
  // se nesmí přiřadit obchodníkovi - viz LeadsService.create.
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}
