import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';
import { TargetsService } from './targets.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('targets')
export class TargetsController {
  constructor(private targetsService: TargetsService) {}

  @Roles(Role.ADMIN, Role.AGENT)
  @Get('me/progress')
  getMyProgress(@CurrentUser() user: CurrentUserPayload) {
    return this.targetsService.getProgress(user.userId, user);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Get('me/prediction')
  getMyPrediction(@CurrentUser() user: CurrentUserPayload) {
    return this.targetsService.getPrediction(user.userId, user);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Get(':userId/progress')
  getProgress(@Param('userId') userId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.targetsService.getProgress(userId, user);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Get(':userId/prediction')
  getPrediction(@Param('userId') userId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.targetsService.getPrediction(userId, user);
  }
}
