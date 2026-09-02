import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private meetingsService: MeetingsService) {}

  @Roles(Role.ADMIN, Role.AGENT)
  @Get('available-slots')
  getAvailableSlots(@Query('date') date: string) {
    return this.meetingsService.getAvailableSlots(date);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.findAllForAgent(user);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Post()
  create(@Body() dto: CreateMeetingDto, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.create(dto, user);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Delete(':id')
  cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.cancel(id, user);
  }
}
