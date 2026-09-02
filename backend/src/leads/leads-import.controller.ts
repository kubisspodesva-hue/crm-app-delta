import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { LeadsService } from './leads.service';
import { ImportLeadsDto } from './dto';

// Samostatný controller mimo LeadsController záměrně - LeadsController má
// class-level JwtAuthGuard (lidský login), tenhle endpoint je pro
// server-to-server automatizace a autentizuje se jen přes X-Api-Key hlavičku.
@Controller('leads-import')
export class LeadsImportController {
  constructor(private leadsService: LeadsService) {}

  // Lehký seznam existujících leadů (jméno/firma/starý web/telefon) - noční
  // automatizace si podle něj ověří, že nenavrhuje duplicitního kandidáta.
  @UseGuards(ApiKeyGuard)
  @Get()
  listExisting() {
    return this.leadsService.getImportDedupeList();
  }

  @UseGuards(ApiKeyGuard)
  @Post()
  import(@Body() dto: ImportLeadsDto) {
    return this.leadsService.importLeads(dto.items);
  }
}
