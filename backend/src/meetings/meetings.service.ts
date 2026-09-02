import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { LeadsService } from '../leads/leads.service';
import { CreateMeetingDto } from './dto';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { MeetingStatus, Role } from '../common/enums';

@Injectable()
export class MeetingsService {
  constructor(
    private prisma: PrismaService,
    private googleCalendar: GoogleCalendarService,
    private leadsService: LeadsService,
  ) {}

  async getAvailableSlots(date: string) {
    if (!date) throw new BadRequestException('Parametr "date" je povinný (YYYY-MM-DD)');
    return this.googleCalendar.getAvailableSlots(date);
  }

  async create(dto: CreateMeetingDto, actor: CurrentUserPayload) {
    const lead = await this.prisma.lead.findUnique({ where: { id: dto.leadId } });
    if (!lead) throw new NotFoundException('Lead nenalezen');
    if (actor.role !== Role.ADMIN && lead.assignedAgentId !== actor.userId) {
      throw new ForbiddenException('Nemáte přístup k tomuto leadu');
    }
    if (!lead.assignedAgentId) {
      throw new BadRequestException('Lead nemá přiřazeného obchodníka - nejprve ho přiřaďte');
    }

    if (new Date(dto.start) >= new Date(dto.end)) {
      throw new BadRequestException('Začátek schůzky musí být před koncem');
    }
    if (new Date(dto.start) < new Date()) {
      throw new BadRequestException('Nelze naplánovat schůzku v minulosti');
    }

    // Race-condition guard - ověříme, že slot mezitím nezabral někdo jiný
    const stillAvailable = await this.googleCalendar.isSlotAvailable(dto.start, dto.end);
    if (!stillAvailable) {
      throw new ConflictException('Zvolený termín je již obsazen, vyberte prosím jiný');
    }

    const googleEventId = await this.googleCalendar.createEvent({
      start: dto.start,
      end: dto.end,
      summary: `Schůzka: ${lead.firstName} ${lead.lastName}`,
      description: [
        `Klient: ${lead.firstName} ${lead.lastName}`,
        `Telefon: ${lead.phone}`,
        lead.email ? `E-mail: ${lead.email}` : null,
        lead.company ? `Firma: ${lead.company}` : null,
        dto.notes ? `Poznámka: ${dto.notes}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    });

    return this.prisma.$transaction(async (tx) => {
      const meeting = await tx.meeting.create({
        data: {
          leadId: dto.leadId,
          agentId: lead.assignedAgentId,
          googleEventId,
          startTime: new Date(dto.start),
          endTime: new Date(dto.end),
          notes: dto.notes,
        },
      });

      await this.leadsService.markMeetingScheduled(dto.leadId, actor.userId, tx);

      return meeting;
    });
  }

  async findAllForAgent(actor: CurrentUserPayload) {
    return this.prisma.meeting.findMany({
      where: actor.role === Role.ADMIN ? {} : { agentId: actor.userId },
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async cancel(id: string, actor: CurrentUserPayload) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Schůzka nenalezena');
    if (actor.role !== Role.ADMIN && meeting.agentId !== actor.userId) {
      throw new ForbiddenException('Nemáte přístup k této schůzce');
    }

    if (meeting.googleEventId) {
      await this.googleCalendar.deleteEvent(meeting.googleEventId);
    }

    return this.prisma.meeting.update({
      where: { id },
      data: { status: MeetingStatus.CANCELLED },
    });
  }
}
