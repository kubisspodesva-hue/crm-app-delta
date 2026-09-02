import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Roles(Role.ADMIN, Role.AGENT)
  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.findForUser(user.userId);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markRead(id, user.userId);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Patch('read-all')
  markAllRead(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markAllRead(user.userId);
  }
}
