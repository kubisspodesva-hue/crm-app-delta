import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';
import { LeadsService } from './leads.service';
import {
  AddNoteDto,
  BulkAssignLeadsDto,
  BulkDeleteLeadsDto,
  ChangeStatusDto,
  CreateLeadDto,
  QueryLeadsDto,
  ReassignLeadDto,
  SetNextActionDto,
  UpdateLeadDto,
} from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Roles(Role.ADMIN, Role.AGENT)
  @Post()
  create(@Body() dto: CreateLeadDto, @CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.create(dto, user);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Get()
  findAll(@Query() query: QueryLeadsDto, @CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.findAll(query, user);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Get('stats/by-status')
  countByStatus(@CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.countByStatus(user);
  }

  // Musí být deklarováno před @Get(':id'), jinak by Nest "export" bral jako :id
  @Roles(Role.ADMIN)
  @Get('export/csv')
  async exportCsv(@CurrentUser() user: CurrentUserPayload, @Res() res: Response) {
    const csv = await this.leadsService.exportToCsv(user);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="leady-export.csv"`);
    res.send(csv);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.findOne(id, user);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.leadsService.update(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Patch(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.leadsService.changeStatus(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Patch(':id/next-action')
  setNextAction(
    @Param('id') id: string,
    @Body() dto: SetNextActionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.leadsService.setNextAction(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body() dto: AddNoteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.leadsService.addNote(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Post(':id/contacted')
  markContacted(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.markContacted(id, user);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/reassign')
  reassign(
    @Param('id') id: string,
    @Body() dto: ReassignLeadDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.leadsService.reassign(id, dto, user);
  }

  @Roles(Role.ADMIN)
  @Post('bulk-delete')
  removeMany(@Body() dto: BulkDeleteLeadsDto, @CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.removeMany(dto.ids, user);
  }

  @Roles(Role.ADMIN)
  @Post('bulk-reassign')
  reassignMany(@Body() dto: BulkAssignLeadsDto, @CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.reassignMany(dto.ids, dto.agentId, user);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.remove(id, user);
  }
}
