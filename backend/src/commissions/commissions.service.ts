import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CommissionType, Role } from '../common/enums';
import { today, thisWeek, thisMonth, DateRange } from '../common/utils/date-range.util';

export interface CommissionBreakdown {
  soldCount: number;
  revenue: number;
  commission: number;
}

@Injectable()
export class CommissionsService {
  constructor(private prisma: PrismaService) {}

  private assertAccess(userId: string, actor: CurrentUserPayload) {
    if (actor.role !== Role.ADMIN && actor.userId !== userId) {
      throw new ForbiddenException('Nemáte přístup k provizím jiného obchodníka');
    }
  }

  private async computeForRange(userId: string, range: DateRange): Promise<CommissionBreakdown> {
    const config = await this.prisma.commissionConfig.findUnique({ where: { userId } });

    const soldLeads = await this.prisma.lead.findMany({
      where: {
        assignedAgentId: userId,
        status: { in: ['SOLD', 'WON'] },
        soldAt: { gte: range.start, lte: range.end },
      },
      select: { dealValue: true },
    });

    const soldCount = soldLeads.length;
    const revenue = soldLeads.reduce((sum, l) => sum + Number(l.dealValue ?? 0), 0);

    if (!config) {
      return { soldCount, revenue, commission: 0 };
    }

    let commission = 0;
    if (config.type === CommissionType.FIXED_PER_SALE) {
      commission = soldCount * Number(config.fixedAmount ?? 0);
    } else {
      commission = revenue * (Number(config.percentage ?? 0) / 100);
    }

    return { soldCount, revenue, commission: Math.round(commission * 100) / 100 };
  }

  async getSummary(userId: string, actor: CurrentUserPayload) {
    this.assertAccess(userId, actor);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Obchodník nenalezen');

    const config = await this.prisma.commissionConfig.findUnique({ where: { userId } });

    const [day, week, month, allTime] = await Promise.all([
      this.computeForRange(userId, today()),
      this.computeForRange(userId, thisWeek()),
      this.computeForRange(userId, thisMonth()),
      this.computeForRange(userId, { start: new Date(0), end: new Date('2100-01-01') }),
    ]);

    return {
      config,
      day,
      week,
      month,
      total: allTime,
    };
  }
}
