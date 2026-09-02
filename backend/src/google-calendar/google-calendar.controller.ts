import { Body, Controller, Get, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { GoogleCalendarService } from './google-calendar.service';

@Controller('calendar/google')
export class GoogleCalendarController {
  constructor(private googleCalendarService: GoogleCalendarService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('connect')
  connect(@CurrentUser() user: CurrentUserPayload) {
    // state nese userId admina, který inicioval propojení - Google nám ho
    // vrátí zpět v callbacku, takže tam nepotřebujeme platnou JWT session
    return { url: this.googleCalendarService.getAuthUrl(user.userId) };
  }

  // Google redirect callback - bez JWT guardu, protože sem přistupuje přímo
  // prohlížeč po přesměrování z Google (nemusí nést naši auth cookie)
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const adminUserId = state;
    await this.googleCalendarService.handleOAuthCallback(code, adminUserId);
    res.redirect(`${process.env.FRONTEND_URL}/settings?calendar=connected`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.AGENT)
  @Get('slots')
  getSlots(@Query('date') date: string) {
    return this.googleCalendarService.getAvailableSlots(date);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('status')
  status() {
    return this.googleCalendarService.getStatus();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('working-hours')
  updateWorkingHours(
    @Body() body: { workingHourStart: number; workingHourEnd: number; slotDurationMin: number },
  ) {
    return this.googleCalendarService.updateWorkingHours(body);
  }
}
