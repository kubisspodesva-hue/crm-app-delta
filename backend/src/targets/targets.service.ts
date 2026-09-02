import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { LeadHistoryAction, Role, TargetMetric, TargetPeriod } from '../common/enums';
import { thisMonth, thisWeek, DateRange } from '../common/utils/date-range.util';

@Injectable()
export class TargetsService {
  constructor(private prisma: PrismaService) {}

  private assertAccess(userId: string, actor: CurrentUserPayload) {
    if (actor.role !== Role.ADMIN && actor.userId !== userId) {
      throw new ForbiddenException('Nemáte přístup k cílům jiného obchodníka');
    }
  }

  private rangeFor(period: TargetPeriod): DateRange {
    return period === TargetPeriod.WEEKLY ? thisWeek() : thisMonth();
  }

  private async countMetric(
    userId: string,
    metric: TargetMetric,
    range: DateRange,
  ): Promise<number> {
    switch (metric) {
      case TargetMetric.CONTACTS:
        // Počítáme podle toho, komu je lead přiřazen, ne kdo akci technicky provedl
        // (např. když kontakt zaznamená admin za obchodníka).
        return this.prisma.leadHistory.count({
          where: {
            action: LeadHistoryAction.CONTACTED,
            createdAt: { gte: range.start, lte: range.end },
            lead: { assignedAgentId: userId },
          },
        });
      case TargetMetric.MEETINGS:
        return this.prisma.meeting.count({
          where: {
            agentId: userId,
            startTime: { gte: range.start, lte: range.end },
          },
        });
      case TargetMetric.SALES:
        return this.prisma.lead.count({
          where: {
            assignedAgentId: userId,
            status: { in: ['SOLD', 'WON'] },
            soldAt: { gte: range.start, lte: range.end },
          },
        });
    }
  }

  /** Průběžné plnění všech nastavených cílů obchodníka (např. "72 / 100 hovorů", 72 %) */
  async getProgress(userId: string, actor: CurrentUserPayload) {
    this.assertAccess(userId, actor);

    const targets = await this.prisma.target.findMany({ where: { userId } });

    const progress = await Promise.all(
      targets.map(async (target) => {
        const range = this.rangeFor(target.period as TargetPeriod);
        const current = await this.countMetric(userId, target.metric as TargetMetric, range);
        const percentage = target.value > 0 ? Math.round((current / target.value) * 1000) / 10 : 0;

        return {
          id: target.id,
          period: target.period,
          metric: target.metric,
          target: target.value,
          current,
          percentage: Math.min(percentage, 999),
          rangeStart: range.start,
          rangeEnd: range.end,
        };
      }),
    );

    return progress;
  }

  /**
   * Predikce potřebného počtu kontaktů:
   * neededContacts = zbývající_prodeje / úspěšnost
   * úspěšnost = celkový počet prodejů / celkový počet kontaktů (historicky)
   */
  async getPrediction(userId: string, actor: CurrentUserPayload) {
    this.assertAccess(userId, actor);

    const salesTarget = await this.prisma.target.findFirst({
      where: { userId, metric: TargetMetric.SALES },
      orderBy: { createdAt: 'desc' },
    });

    if (!salesTarget) {
      return {
        hasSalesTarget: false,
        message: 'Obchodníkovi není nastaven cíl počtu prodejů',
      };
    }

    const range = this.rangeFor(salesTarget.period as TargetPeriod);

    const [currentSales, totalContacts, totalSales] = await Promise.all([
      this.countMetric(userId, TargetMetric.SALES, range),
      this.prisma.leadHistory.count({
        where: { action: LeadHistoryAction.CONTACTED, lead: { assignedAgentId: userId } },
      }),
      this.prisma.lead.count({ where: { assignedAgentId: userId, status: { in: ['SOLD', 'WON'] } } }),
    ]);

    const successRate = totalContacts > 0 ? totalSales / totalContacts : 0;
    const remainingSales = Math.max(salesTarget.value - currentSales, 0);

    const neededContacts =
      successRate > 0 ? Math.ceil(remainingSales / successRate) : null;

    return {
      hasSalesTarget: true,
      period: salesTarget.period,
      salesTarget: salesTarget.value,
      currentSales,
      remainingSales,
      successRatePercent: Math.round(successRate * 1000) / 10,
      neededContacts,
      note:
        successRate === 0
          ? 'Zatím není dostatek historických dat (kontakty/prodeje) pro spolehlivý odhad'
          : null,
    };
  }
}
