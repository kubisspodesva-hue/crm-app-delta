import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';
import { CommissionsService } from './commissions.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commissions')
export class CommissionsController {
  constructor(private commissionsService: CommissionsService) {}

  @Roles(Role.ADMIN, Role.AGENT)
  @Get('me')
  getMine(@CurrentUser() user: CurrentUserPayload) {
    return this.commissionsService.getSummary(user.userId, user);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Get(':userId')
  getForUser(@Param('userId') userId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.commissionsService.getSummary(userId, user);
  }
}
