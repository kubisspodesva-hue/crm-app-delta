import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LeadStatus, NotificationType, Role } from '../common/enums';
import { endOfDay, startOfDay } from '../common/utils/date-range.util';

const STALE_LEAD_DAYS = 7;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async findForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async notifyLeadAssigned(leadId: string, agentId: string, leadName: string) {
    await this.prisma.notification.create({
      data: {
        userId: agentId,
        type: NotificationType.LEAD_ASSIGNED,
        title: 'Nový přiřazený lead',
        message: `Byl vám přiřazen nový lead: ${leadName}`,
        relatedLeadId: leadId,
      },
    });
  }

  /** Denně v 7:00 - schůzky dnes, zítra a dlouho nekontaktované leady */
  @Cron('0 7 * * *')
  async generateDailyNotifications() {
    this.logger.log('Generuji denní notifikace...');
    await this.notifyTodayMeetings();
    await this.notifyTomorrowMeetings();
    await this.notifyStaleLeads();
  }

  private async notifyTodayMeetings() {
    const now = new Date();
    const meetings = await this.prisma.meeting.findMany({
      where: { startTime: { gte: startOfDay(now), lte: endOfDay(now) }, status: 'SCHEDULED' },
      include: { lead: true },
    });

    for (const meeting of meetings) {
      if (!meeting.agentId) continue;
      await this.prisma.notification.create({
        data: {
          userId: meeting.agentId,
          type: NotificationType.MEETING_TODAY,
          title: 'Dnešní schůzka',
          message: `Dnes v ${meeting.startTime.toLocaleTimeString('cs-CZ', {
            hour: '2-digit',
            minute: '2-digit',
          })} máte schůzku s ${meeting.lead.firstName} ${meeting.lead.lastName}`,
          relatedLeadId: meeting.leadId,
          relatedMeetingId: meeting.id,
        },
      });
    }
  }

  private async notifyTomorrowMeetings() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const meetings = await this.prisma.meeting.findMany({
      where: {
        startTime: { gte: startOfDay(tomorrow), lte: endOfDay(tomorrow) },
        status: 'SCHEDULED',
      },
      include: { lead: true },
    });

    for (const meeting of meetings) {
      if (!meeting.agentId) continue;
      await this.prisma.notification.create({
        data: {
          userId: meeting.agentId,
          type: NotificationType.MEETING_TOMORROW,
          title: 'Zítřejší schůzka',
          message: `Zítra v ${meeting.startTime.toLocaleTimeString('cs-CZ', {
            hour: '2-digit',
            minute: '2-digit',
          })} máte schůzku s ${meeting.lead.firstName} ${meeting.lead.lastName}`,
          relatedLeadId: meeting.leadId,
          relatedMeetingId: meeting.id,
        },
      });
    }
  }

  private async notifyStaleLeads() {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - STALE_LEAD_DAYS);

    // "Rozpracovaný" lead = cokoliv, co ještě není vyhrané ani prohrané (nový
    // 8stavový pipeline i staré hodnoty, dokud neproběhne data-migrace).
    const staleLeads = await this.prisma.lead.findMany({
      where: {
        status: {
          in: [
            LeadStatus.NEW,
            LeadStatus.TO_CONTACT,
            LeadStatus.CONTACTED,
            LeadStatus.INTERESTED,
            LeadStatus.PROPOSAL,
            LeadStatus.NEGOTIATION,
            LeadStatus.IN_PROGRESS,
            LeadStatus.MEETING_SCHEDULED,
          ],
        },
        OR: [
          { lastContactedAt: { lt: threshold } },
          { lastContactedAt: null, createdAt: { lt: threshold } },
        ],
      },
    });

    for (const lead of staleLeads) {
      if (!lead.assignedAgentId) continue;
      await this.prisma.notification.create({
        data: {
          userId: lead.assignedAgentId,
          type: NotificationType.LEAD_STALE,
          title: 'Dlouho nekontaktovaný lead',
          message: `Lead ${lead.firstName} ${lead.lastName} nebyl kontaktován déle než ${STALE_LEAD_DAYS} dní`,
          relatedLeadId: lead.id,
        },
      });
    }
  }
}
