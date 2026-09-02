import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';
import { StatsService } from './stats.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Roles(Role.ADMIN, Role.AGENT)
  @Get('dashboard')
  getDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.statsService.getDashboard(user);
  }

  @Roles(Role.ADMIN)
  @Get('performance')
  getPerformanceTable(@CurrentUser() user: CurrentUserPayload) {
    return this.statsService.getPerformanceTable(user);
  }

  // Žebříček vidí i obchodníci navzájem - schválně bez provize (soukromá mzda)
  @Roles(Role.ADMIN, Role.AGENT)
  @Get('leaderboard')
  getLeaderboard() {
    return this.statsService.getLeaderboard();
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Get('week-comparison/me')
  getMyWeekComparison(@CurrentUser() user: CurrentUserPayload) {
    return this.statsService.getWeekComparison(user.userId);
  }

  @Roles(Role.ADMIN)
  @Get('week-comparison/:userId')
  getWeekComparison(@Param('userId') userId: string) {
    return this.statsService.getWeekComparison(userId);
  }
}
