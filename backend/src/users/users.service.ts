import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, SetCommissionDto, SetTargetDto, UpdateUserDto } from './dto';
import { AuthService } from '../auth/auth.service';
import { Role } from '../common/enums';
import { OWNER_EMAIL } from '../common/constants';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';

const AGENT_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  isActive: true,
  avatarUrl: true,
  createdAt: true,
  commissionConfig: true,
  targets: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Uživatel s tímto e-mailem již existuje');
    }

    const passwordHash = await AuthService.hashPassword(dto.password);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
        isActive: dto.isActive ?? true,
      },
      select: AGENT_SELECT,
    });
  }

  async findAll(role?: Role) {
    return this.prisma.user.findMany({
      where: role ? { role } : undefined,
      select: AGENT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: AGENT_SELECT,
    });
    if (!user) throw new NotFoundException('Uživatel nenalezen');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: AGENT_SELECT,
    });
  }

  async setActive(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: AGENT_SELECT,
    });
  }

  async remove(id: string, actor: CurrentUserPayload) {
    if (actor.email !== OWNER_EMAIL) {
      throw new ForbiddenException('Mazání obchodníků je vyhrazeno pouze majiteli účtu');
    }
    await this.findOne(id);
    // Leady, historie a schůzky obchodníka zůstávají zachovány - díky onDelete: SetNull
    // v Prisma schématu se jim po smazání obchodníka jen zruší přiřazení ("Nepřiřazeno").
    const assignedLeadsCount = await this.prisma.lead.count({
      where: { assignedAgentId: id },
    });
    await this.prisma.user.delete({ where: { id } });
    return { success: true, unassignedLeadsCount: assignedLeadsCount };
  }

  async setCommission(userId: string, dto: SetCommissionDto) {
    await this.findOne(userId);
    return this.prisma.commissionConfig.upsert({
      where: { userId },
      create: {
        userId,
        type: dto.type,
        fixedAmount: dto.fixedAmount,
        percentage: dto.percentage,
      },
      update: {
        type: dto.type,
        fixedAmount: dto.fixedAmount,
        percentage: dto.percentage,
      },
    });
  }

  async setTarget(userId: string, dto: SetTargetDto) {
    await this.findOne(userId);
    // Nový cíl pro dané období+metriku nahrazuje předchozí aktivní cíl
    await this.prisma.target.deleteMany({
      where: { userId, period: dto.period, metric: dto.metric },
    });
    return this.prisma.target.create({
      data: {
        userId,
        period: dto.period,
        metric: dto.metric,
        value: dto.value,
      },
    });
  }

  async getTargets(userId: string) {
    await this.findOne(userId);
    return this.prisma.target.findMany({ where: { userId } });
  }

  async deleteTarget(userId: string, targetId: string) {
    await this.findOne(userId);
    const target = await this.prisma.target.findUnique({ where: { id: targetId } });
    if (!target || target.userId !== userId) {
      throw new NotFoundException('Cíl nenalezen');
    }
    await this.prisma.target.delete({ where: { id: targetId } });
    return { success: true };
  }
}
