import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { LeadHistoryAction, LeadStatus, Role } from '../common/enums';
import {
  lastMonth,
  lastNWeeks,
  lastWeek,
  percentChange,
  thisMonth,
  thisWeek,
  today,
} from '../common/utils/date-range.util';
import { getCareerLevel } from '../common/utils/career-level.util';

// Nový 8stavový pipeline (WON/LOST) i staré hodnoty (SOLD/REJECTED) se počítají
// společně, dokud neproběhne data-migrace všech starých leadů (viz
// backend/prisma/migrate-lead-status-pipeline.ts) - jinak by statistiky,
// provize a cíle po nasazení najednou "spadly na nulu".
const WON_STATUSES = [LeadStatus.WON, LeadStatus.SOLD];
const LOST_STATUSES = [LeadStatus.LOST, LeadStatus.REJECTED];
// "Rozpracováno" = cokoliv, co ještě není vyhrané ani prohrané
const ACTIVE_STATUSES = [
  LeadStatus.NEW,
  LeadStatus.TO_CONTACT,
  LeadStatus.CONTACTED,
  LeadStatus.INTERESTED,
  LeadStatus.PROPOSAL,
  LeadStatus.NEGOTIATION,
  LeadStatus.IN_PROGRESS,
  LeadStatus.MEETING_SCHEDULED,
];

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  private assertAccess(userId: string, actor: CurrentUserPayload) {
    if (actor.role !== Role.ADMIN && actor.userId !== userId) {
      throw new ForbiddenException('Nemáte přístup k datům jiného obchodníka');
    }
  }

  /** Statistiky konkrétního obchodníka (dashboard obchodníka i řádek v tabulce admina) */
  async getAgentStats(userId: string) {
    const [
      contactedCount,
      inProgressCount,
      meetingsCount,
      soldLeads,
      rejectedCount,
      totalAssigned,
    ] = await Promise.all([
      this.prisma.leadHistory.count({
        where: { action: LeadHistoryAction.CONTACTED, lead: { assignedAgentId: userId } },
      }),
      this.prisma.lead.count({
        where: { assignedAgentId: userId, status: { in: ACTIVE_STATUSES } },
      }),
      this.prisma.lead.count({
        where: {
          assignedAgentId: userId,
          status: { in: [LeadStatus.NEGOTIATION, LeadStatus.MEETING_SCHEDULED] },
        },
      }),
      this.prisma.lead.findMany({
        where: { assignedAgentId: userId, status: { in: WON_STATUSES } },
        select: { dealValue: true },
      }),
      this.prisma.lead.count({
        where: { assignedAgentId: userId, status: { in: LOST_STATUSES } },
      }),
      this.prisma.lead.count({ where: { assignedAgentId: userId } }),
    ]);

    const soldCount = soldLeads.length;
    const revenue = soldLeads.reduce((s, l) => s + Number(l.dealValue ?? 0), 0);

    const conversionRate = totalAssigned > 0 ? (soldCount / totalAssigned) * 100 : 0;
    const successRate = soldCount + rejectedCount > 0
      ? (soldCount / (soldCount + rejectedCount)) * 100
      : 0;

    const config = await this.prisma.commissionConfig.findUnique({ where: { userId } });
    let commission = 0;
    if (config) {
      commission =
        config.type === 'FIXED_PER_SALE'
          ? soldCount * Number(config.fixedAmount ?? 0)
          : revenue * (Number(config.percentage ?? 0) / 100);
    }

    const careerLevel = getCareerLevel(soldCount);

    return {
      userId,
      contactedCount,
      inProgressCount,
      meetingsCount,
      soldCount,
      rejectedCount,
      totalAssigned,
      conversionRate: Math.round(conversionRate * 10) / 10,
      successRate: Math.round(successRate * 10) / 10,
      revenue: Math.round(revenue * 100) / 100,
      commission: Math.round(commission * 100) / 100,
      careerLevel: careerLevel.title,
      careerLevelEmoji: careerLevel.emoji,
      careerLevelMinSales: careerLevel.minSales,
      nextLevelTitle: careerLevel.nextTitle,
      salesToNextLevel: careerLevel.salesToNextLevel,
    };
  }

  /** Dashboard po přihlášení - liší se podle role */
  async getDashboard(actor: CurrentUserPayload) {
    if (actor.role === Role.ADMIN) {
      return this.getAdminDashboard();
    }
    return this.getAgentDashboard(actor.userId);
  }

  private async getAgentDashboard(userId: string) {
    const stats = await this.getAgentStats(userId);
    const weekCmp = await this.getWeekComparison(userId);
    const monthCmp = await this.getMonthComparison(userId);
    return { role: Role.AGENT, ...stats, weekComparison: weekCmp, monthComparison: monthCmp };
  }

  private async getAdminDashboard() {
    const [
      newLeadsToday,
      meetingsToday,
      meetingsThisWeek,
      salesTotal,
      inProgressTotal,
      agents,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { createdAt: { gte: today().start, lte: today().end } } }),
      this.prisma.meeting.count({
        where: { startTime: { gte: today().start, lte: today().end } },
      }),
      this.prisma.meeting.count({
        where: { startTime: { gte: thisWeek().start, lte: thisWeek().end } },
      }),
      this.prisma.lead.count({ where: { status: { in: WON_STATUSES } } }),
      this.prisma.lead.count({ where: { status: { in: ACTIVE_STATUSES } } }),
      this.prisma.user.findMany({ where: { role: Role.AGENT, isActive: true } }),
    ]);

    const performance = await Promise.all(agents.map((a) => this.getAgentStats(a.id)));
    const withNames = performance.map((p, i) => ({
      ...p,
      firstName: agents[i].firstName,
      lastName: agents[i].lastName,
    }));

    const topAgents = [...withNames].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const chartWeeks = lastNWeeks(8);
    const salesChart = await Promise.all(
      chartWeeks.map(async (range, idx) => ({
        week: `T-${chartWeeks.length - 1 - idx}`,
        sales: await this.prisma.lead.count({
          where: { status: { in: WON_STATUSES }, soldAt: { gte: range.start, lte: range.end } },
        }),
        contacts: await this.prisma.leadHistory.count({
          where: {
            action: LeadHistoryAction.CONTACTED,
            createdAt: { gte: range.start, lte: range.end },
          },
        }),
        meetings: await this.prisma.meeting.count({
          where: { createdAt: { gte: range.start, lte: range.end } },
        }),
      })),
    );

    const teamMonthComparison = await this.getTeamMonthComparison();

    return {
      role: Role.ADMIN,
      newLeadsToday,
      meetingsToday,
      meetingsThisWeek,
      salesTotal,
      inProgressTotal,
      teamPerformance: withNames,
      topAgents,
      salesChart,
      teamMonthComparison,
    };
  }

  /** Tabulka výkonu všech obchodníků pro admina (řaditelná na frontendu podle libovolného sloupce) */
  async getPerformanceTable(actor: CurrentUserPayload) {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Pouze administrátor má přístup k přehledu výkonu');
    }
    const agents = await this.prisma.user.findMany({ where: { role: Role.AGENT } });
    const rows = await Promise.all(
      agents.map(async (a) => ({
        ...(await this.getAgentStats(a.id)),
        firstName: a.firstName,
        lastName: a.lastName,
        isActive: a.isActive,
      })),
    );
    return rows;
  }

  /**
   * Žebříček pro obchodníky navzájem - úmyslně BEZ provize (to je soukromá
   * mzdová informace), jen výkonnostní čísla, na kterých se dá soutěžit.
   */
  async getLeaderboard() {
    const agents = await this.prisma.user.findMany({
      where: { role: Role.AGENT, isActive: true },
    });
    const rows = await Promise.all(
      agents.map(async (a) => {
        const stats = await this.getAgentStats(a.id);
        return {
          userId: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          contactedCount: stats.contactedCount,
          meetingsCount: stats.meetingsCount,
          soldCount: stats.soldCount,
          conversionRate: stats.conversionRate,
          revenue: stats.revenue,
          careerLevel: stats.careerLevel,
          careerLevelEmoji: stats.careerLevelEmoji,
          nextLevelTitle: stats.nextLevelTitle,
          salesToNextLevel: stats.salesToNextLevel,
        };
      }),
    );
    return rows.sort((a, b) => b.revenue - a.revenue);
  }

  /** Srovnání s minulým týdnem - kontakty i prodeje, s % změnou */
  async getWeekComparison(userId: string) {
    const [contactsThisWeek, contactsLastWeek, salesThisWeek, salesLastWeek] = await Promise.all([
      this.prisma.leadHistory.count({
        where: {
          action: LeadHistoryAction.CONTACTED,
          lead: { assignedAgentId: userId },
          createdAt: { gte: thisWeek().start, lte: thisWeek().end },
        },
      }),
      this.prisma.leadHistory.count({
        where: {
          action: LeadHistoryAction.CONTACTED,
          lead: { assignedAgentId: userId },
          createdAt: { gte: lastWeek().start, lte: lastWeek().end },
        },
      }),
      this.prisma.lead.count({
        where: {
          assignedAgentId: userId,
          status: { in: WON_STATUSES },
          soldAt: { gte: thisWeek().start, lte: thisWeek().end },
        },
      }),
      this.prisma.lead.count({
        where: {
          assignedAgentId: userId,
          status: { in: WON_STATUSES },
          soldAt: { gte: lastWeek().start, lte: lastWeek().end },
        },
      }),
    ]);

    const trend = await Promise.all(
      lastNWeeks(8).map(async (range, idx, arr) => ({
        week: `T-${arr.length - 1 - idx}`,
        contacts: await this.prisma.leadHistory.count({
          where: {
            action: LeadHistoryAction.CONTACTED,
            lead: { assignedAgentId: userId },
            createdAt: { gte: range.start, lte: range.end },
          },
        }),
        sales: await this.prisma.lead.count({
          where: {
            assignedAgentId: userId,
            status: { in: WON_STATUSES },
            soldAt: { gte: range.start, lte: range.end },
          },
        }),
        meetings: await this.prisma.meeting.count({
          where: { agentId: userId, createdAt: { gte: range.start, lte: range.end } },
        }),
      })),
    );

    return {
      contacts: {
        thisWeek: contactsThisWeek,
        lastWeek: contactsLastWeek,
        changePercent: percentChange(contactsThisWeek, contactsLastWeek),
      },
      sales: {
        thisWeek: salesThisWeek,
        lastWeek: salesLastWeek,
        changePercent: percentChange(salesThisWeek, salesLastWeek),
      },
      trend,
    };
  }

  /** Srovnání s minulým měsícem - prodeje, obrat a schůzky, s % změnou */
  async getMonthComparison(userId: string) {
    const [salesThisMonth, salesLastMonth, soldThisMonth, soldLastMonth, meetingsThisMonth, meetingsLastMonth] =
      await Promise.all([
        this.prisma.lead.count({
          where: {
            assignedAgentId: userId,
            status: { in: WON_STATUSES },
            soldAt: { gte: thisMonth().start, lte: thisMonth().end },
          },
        }),
        this.prisma.lead.count({
          where: {
            assignedAgentId: userId,
            status: { in: WON_STATUSES },
            soldAt: { gte: lastMonth().start, lte: lastMonth().end },
          },
        }),
        this.prisma.lead.findMany({
          where: {
            assignedAgentId: userId,
            status: { in: WON_STATUSES },
            soldAt: { gte: thisMonth().start, lte: thisMonth().end },
          },
          select: { dealValue: true },
        }),
        this.prisma.lead.findMany({
          where: {
            assignedAgentId: userId,
            status: { in: WON_STATUSES },
            soldAt: { gte: lastMonth().start, lte: lastMonth().end },
          },
          select: { dealValue: true },
        }),
        this.prisma.meeting.count({
          where: { agentId: userId, createdAt: { gte: thisMonth().start, lte: thisMonth().end } },
        }),
        this.prisma.meeting.count({
          where: { agentId: userId, createdAt: { gte: lastMonth().start, lte: lastMonth().end } },
        }),
      ]);

    const revenueThisMonth = soldThisMonth.reduce((s, l) => s + Number(l.dealValue ?? 0), 0);
    const revenueLastMonth = soldLastMonth.reduce((s, l) => s + Number(l.dealValue ?? 0), 0);

    return {
      sales: {
        thisMonth: salesThisMonth,
        lastMonth: salesLastMonth,
        changePercent: percentChange(salesThisMonth, salesLastMonth),
      },
      revenue: {
        thisMonth: revenueThisMonth,
        lastMonth: revenueLastMonth,
        changePercent: percentChange(revenueThisMonth, revenueLastMonth),
      },
      meetings: {
        thisMonth: meetingsThisMonth,
        lastMonth: meetingsLastMonth,
        changePercent: percentChange(meetingsThisMonth, meetingsLastMonth),
      },
    };
  }

  /** Totéž jako getMonthComparison, ale za celý tým (pro admina) */
  async getTeamMonthComparison() {
    const [salesThisMonth, salesLastMonth, soldThisMonth, soldLastMonth, meetingsThisMonth, meetingsLastMonth] =
      await Promise.all([
        this.prisma.lead.count({
          where: { status: { in: WON_STATUSES }, soldAt: { gte: thisMonth().start, lte: thisMonth().end } },
        }),
        this.prisma.lead.count({
          where: { status: { in: WON_STATUSES }, soldAt: { gte: lastMonth().start, lte: lastMonth().end } },
        }),
        this.prisma.lead.findMany({
          where: { status: { in: WON_STATUSES }, soldAt: { gte: thisMonth().start, lte: thisMonth().end } },
          select: { dealValue: true },
        }),
        this.prisma.lead.findMany({
          where: { status: { in: WON_STATUSES }, soldAt: { gte: lastMonth().start, lte: lastMonth().end } },
          select: { dealValue: true },
        }),
        this.prisma.meeting.count({
          where: { createdAt: { gte: thisMonth().start, lte: thisMonth().end } },
        }),
        this.prisma.meeting.count({
          where: { createdAt: { gte: lastMonth().start, lte: lastMonth().end } },
        }),
      ]);

    const revenueThisMonth = soldThisMonth.reduce((s, l) => s + Number(l.dealValue ?? 0), 0);
    const revenueLastMonth = soldLastMonth.reduce((s, l) => s + Number(l.dealValue ?? 0), 0);

    return {
      sales: {
        thisMonth: salesThisMonth,
        lastMonth: salesLastMonth,
        changePercent: percentChange(salesThisMonth, salesLastMonth),
      },
      revenue: {
        thisMonth: revenueThisMonth,
        lastMonth: revenueLastMonth,
        changePercent: percentChange(revenueThisMonth, revenueLastMonth),
      },
      meetings: {
        thisMonth: meetingsThisMonth,
        lastMonth: meetingsLastMonth,
        changePercent: percentChange(meetingsThisMonth, meetingsLastMonth),
      },
    };
  }
}
