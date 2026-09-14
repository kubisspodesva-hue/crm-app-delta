import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  SetCommissionDto,
  SetTargetDto,
  UpdateUserDto,
} from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // --- Správa obchodníků (jen ADMIN) ---

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Roles(Role.ADMIN)
  @Get()
  findAll(@Query('role') role?: Role) {
    return this.usersService.findAll(role);
  }

  // Musí být deklarováno před @Get(':id'), jinak by Nest "me" bral jako :id
  @Roles(Role.ADMIN, Role.AGENT)
  @Get('me')
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findOne(user.userId);
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.usersService.setActive(id, false);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.usersService.setActive(id, true);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.usersService.remove(id, user);
  }

  // --- Provize (jen ADMIN nastavuje) a cíle (ADMIN kohokoliv, AGENT jen svoje) ---

  @Roles(Role.ADMIN)
  @Post(':id/commission')
  setCommission(@Param('id') id: string, @Body() dto: SetCommissionDto) {
    return this.usersService.setCommission(id, dto);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Post(':id/targets')
  setTarget(
    @Param('id') id: string,
    @Body() dto: SetTargetDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (user.role !== Role.ADMIN && user.userId !== id) {
      throw new ForbiddenException('Nemáte přístup k cílům jiného obchodníka');
    }
    return this.usersService.setTarget(id, dto);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Get(':id/targets')
  getTargets(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    if (user.role !== Role.ADMIN && user.userId !== id) {
      throw new ForbiddenException('Nemáte přístup k cílům jiného obchodníka');
    }
    return this.usersService.getTargets(id);
  }

  @Roles(Role.ADMIN, Role.AGENT)
  @Delete(':id/targets/:targetId')
  deleteTarget(
    @Param('id') id: string,
    @Param('targetId') targetId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (user.role !== Role.ADMIN && user.userId !== id) {
      throw new ForbiddenException('Nemáte přístup k cílům jiného obchodníka');
    }
    return this.usersService.deleteTarget(id, targetId);
  }
}
