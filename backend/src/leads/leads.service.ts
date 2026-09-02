import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddNoteDto,
  ChangeStatusDto,
  CreateLeadDto,
  ImportLeadItemDto,
  QueryLeadsDto,
  ReassignLeadDto,
  SetNextActionDto,
  UpdateLeadDto,
} from './dto';
import {
  ALLOWED_STATUS_TRANSITIONS,
  LeadHistoryAction,
  LeadStatus,
  LeadStatusLabels,
  NextActionLabels,
  Role,
} from '../common/enums';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { startOfDay } from '../common/utils/date-range.util';
import { OWNER_EMAIL } from '../common/constants';

const LEAD_INCLUDE = {
  assignedAgent: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  meetings: { orderBy: { startTime: 'desc' as const } },
  history: {
    orderBy: { createdAt: 'desc' as const },
    include: { actor: { select: { firstName: true, lastName: true } } },
  },
};

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private assertAccess(
    lead: { assignedAgentId: string | null; isPrivate?: boolean },
    actor: CurrentUserPayload,
  ) {
    // Soukromý kontakt je neviditelný pro kohokoliv jiného než majitele účtu -
    // tváříme se, že neexistuje, ať nic neprozradíme ani chybovou hláškou.
    if (lead.isPrivate && actor.email !== OWNER_EMAIL) {
      throw new NotFoundException('Lead nenalezen');
    }
    if (actor.role !== Role.ADMIN && lead.assignedAgentId !== actor.userId) {
      throw new ForbiddenException('Nemáte přístup k tomuto leadu');
    }
  }

  async create(dto: CreateLeadDto, actor: CurrentUserPayload) {
    // Soukromý kontakt smí založit jen majitel účtu a nikdy se nepřiřazuje
    // obchodníkovi - jinak by o něm musel vědět, čímž by přestal být soukromý.
    const isPrivate = dto.isPrivate === true && actor.email === OWNER_EMAIL;

    if (isPrivate) {
      const lead = await this.prisma.lead.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          email: dto.email,
          company: dto.company,
          notes: dto.notes,
          oldWebsiteUrl: dto.oldWebsiteUrl,
          // Přiřazeno majiteli samotnému (ne null) - jde tak filtrovat přes
          // "Obchodník" filtr na /leads stejně jako u ostatních obchodníků,
          // isPrivate ho pořád skryje před kýmkoliv jiným.
          assignedAgentId: actor.userId,
          isPrivate: true,
        },
      });

      await this.prisma.leadHistory.create({
        data: {
          leadId: lead.id,
          actorId: actor.userId,
          action: LeadHistoryAction.CREATED,
          note: 'Soukromý kontakt vytvořen (viditelný jen pro majitele účtu)',
        },
      });

      return lead;
    }

    if (!dto.assignedAgentId) {
      throw new BadRequestException('Musí být vybrán obchodník');
    }

    const agent = await this.prisma.user.findUnique({ where: { id: dto.assignedAgentId } });
    if (!agent || !agent.isActive) {
      throw new BadRequestException('Vybraný obchodník neexistuje nebo je neaktivní');
    }

    return this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          email: dto.email,
          company: dto.company,
          notes: dto.notes,
          oldWebsiteUrl: dto.oldWebsiteUrl,
          assignedAgentId: dto.assignedAgentId,
        },
      });

      await tx.leadHistory.create({
        data: {
          leadId: lead.id,
          actorId: actor.userId,
          action: LeadHistoryAction.CREATED,
          note: `Lead vytvořen a přiřazen obchodníkovi ${agent.firstName} ${agent.lastName}`,
        },
      });

      return lead;
    }).then(async (lead) => {
      await this.notifications.notifyLeadAssigned(
        lead.id,
        dto.assignedAgentId as string,
        `${lead.firstName} ${lead.lastName}`,
      );
      return lead;
    });
  }

  async findAll(query: QueryLeadsDto, actor: CurrentUserPayload) {
    const {
      search,
      agentId,
      status,
      dateFrom,
      dateTo,
      page = 1,
      pageSize = 25,
      sortBy = 'createdAt',
      sortDir = 'desc',
    } = query;

    const where: Prisma.LeadWhereInput = {};

    // Agent vidí jen své leady, i kdyby v query poslal jiné agentId
    if (actor.role !== Role.ADMIN) {
      where.assignedAgentId = actor.userId;
    } else if (agentId) {
      where.assignedAgentId = agentId;
    }

    // Soukromé kontakty vidí jen majitel účtu - i kdyby v budoucnu existoval
    // další ADMIN účet, tenhle filtr je pořád skryje.
    if (actor.email !== OWNER_EMAIL) {
      where.isPrivate = false;
    }

    if (status) where.status = status;

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        {
          assignedAgent: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const allowedSortFields = ['createdAt', 'lastContactedAt', 'status', 'firstName', 'lastName'];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [total, items] = await this.prisma.$transaction([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        include: {
          assignedAgent: { select: { id: true, firstName: true, lastName: true } },
          meetings: { orderBy: { startTime: 'desc' }, take: 1 },
        },
        orderBy: { [orderField]: sortDir === 'asc' ? 'asc' : 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // Stable sequence numbers: rank in the full user-scoped list ordered by createdAt ASC,
    // independent of the current filter/sort/page.
    const scopeWhere: Prisma.LeadWhereInput =
      actor.role !== Role.ADMIN ? { assignedAgentId: actor.userId } : {};
    const allIds = await this.prisma.lead.findMany({
      where: scopeWhere,
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    const seqMap = new Map<string, number>();
    allIds.forEach((l, idx) => seqMap.set(l.id, idx + 1));

    const itemsWithSeq = items.map((item) => ({
      ...item,
      sequenceNumber: seqMap.get(item.id) ?? null,
    }));

    return { items: itemsWithSeq, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string, actor: CurrentUserPayload) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, include: LEAD_INCLUDE });
    if (!lead) throw new NotFoundException('Lead nenalezen');
    this.assertAccess(lead, actor);
    return lead;
  }

  async update(id: string, dto: UpdateLeadDto, actor: CurrentUserPayload) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead nenalezen');
    this.assertAccess(lead, actor);

    const changedFields = Object.keys(dto).filter(
      (key) => (dto as any)[key] !== undefined && (dto as any)[key] !== (lead as any)[key],
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({ where: { id }, data: dto });

      if (changedFields.length > 0) {
        await tx.leadHistory.create({
          data: {
            leadId: id,
            actorId: actor.userId,
            action: LeadHistoryAction.FIELD_UPDATED,
            note: `Upraveno: ${changedFields.join(', ')}`,
          },
        });
      }

      return updated;
    });
  }

  async changeStatus(id: string, dto: ChangeStatusDto, actor: CurrentUserPayload) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead nenalezen');
    this.assertAccess(lead, actor);

    const currentStatus = lead.status as LeadStatus;
    const nextStatus = dto.status;

    if (currentStatus === nextStatus) return lead;

    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Přechod ze stavu "${currentStatus}" do "${nextStatus}" není povolen`,
      );
    }

    // WON je nová hodnota pipeline (dřív SOLD) - obě se řídí stejným pravidlem.
    const isWinning = nextStatus === LeadStatus.WON || nextStatus === LeadStatus.SOLD;
    const isLosing = nextStatus === LeadStatus.LOST || nextStatus === LeadStatus.REJECTED;

    if (isWinning && dto.dealValue === undefined) {
      throw new BadRequestException('Při označení jako "Prodáno" je nutné zadat hodnotu obchodu');
    }

    return this.prisma.$transaction(async (tx) => {
      // Ruční změna stavu je sama o sobě forma kontaktu s klientem (telefonát,
      // schůzka, rozhodnutí...) - proto se zároveň zaznamená jako "Poslední
      // kontakt", ať se lead nejeví jako "zapomenutý" jen kvůli chybějícímu
      // samostatnému kliknutí na "Zaznamenat kontakt".
      const data: Prisma.LeadUpdateInput = { status: nextStatus, lastContactedAt: new Date() };
      if (isWinning) {
        data.soldAt = new Date();
        data.dealValue = dto.dealValue;
      }
      if (isLosing) {
        data.rejectedAt = new Date();
      }

      const updated = await tx.lead.update({ where: { id }, data });

      await tx.leadHistory.create({
        data: {
          leadId: id,
          actorId: actor.userId,
          action: LeadHistoryAction.STATUS_CHANGED,
          fromValue: currentStatus,
          toValue: nextStatus,
        },
      });

      return updated;
    });
  }

  /**
   * Interní metoda volaná MeetingsService po úspěšné rezervaci termínu -
   * atomicky posune stav leadu na "Jednání" (NEGOTIATION - domluvená schůzka
   * = pokročilá fáze obchodu v novém pipeline, dřív "Domluvená schůzka") a
   * zapíše historii. Pokud je lead ve finálním stavu (WON/LOST/SOLD/REJECTED),
   * stav se nemění - schůzka se přesto zaznamená, jen se nepřepisuje výsledek.
   */
  async markMeetingScheduled(id: string, actorId: string, tx: Prisma.TransactionClient) {
    const lead = await tx.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead nenalezen');

    const currentStatus = lead.status as LeadStatus;
    const finalStatuses = [LeadStatus.WON, LeadStatus.LOST, LeadStatus.SOLD, LeadStatus.REJECTED];
    if (currentStatus === LeadStatus.NEGOTIATION || finalStatuses.includes(currentStatus)) {
      return lead;
    }

    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(LeadStatus.NEGOTIATION)) {
      throw new BadRequestException(
        `Přechod ze stavu "${currentStatus}" do "Jednání" není povolen`,
      );
    }

    const updated = await tx.lead.update({
      where: { id },
      data: { status: LeadStatus.NEGOTIATION, lastContactedAt: new Date() },
    });

    await tx.leadHistory.create({
      data: {
        leadId: id,
        actorId,
        action: LeadHistoryAction.STATUS_CHANGED,
        fromValue: currentStatus,
        toValue: LeadStatus.NEGOTIATION,
        note: 'Automaticky nastaveno po rezervaci schůzky',
      },
    });

    return updated;
  }

  async addNote(id: string, dto: AddNoteDto, actor: CurrentUserPayload) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead nenalezen');
    this.assertAccess(lead, actor);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id },
        data: { notes: dto.note },
      });

      await tx.leadHistory.create({
        data: {
          leadId: id,
          actorId: actor.userId,
          action: LeadHistoryAction.NOTE_ADDED,
          note: dto.note,
        },
      });

      return updated;
    });
  }

  /**
   * Nastaví/vymaže "Další akci" u leadu - co má obchodník udělat dál, odděleně
   * od stavu obchodu (status). Volitelný termín (nextActionDueDate) pohání
   * filtr "Dnes k vyřízení" na frontendu.
   */
  async setNextAction(id: string, dto: SetNextActionDto, actor: CurrentUserPayload) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead nenalezen');
    this.assertAccess(lead, actor);

    const nextAction = dto.nextAction ?? null;
    const nextActionDueDate = dto.nextActionDueDate ? new Date(dto.nextActionDueDate) : null;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id },
        data: { nextAction, nextActionDueDate },
      });

      await tx.leadHistory.create({
        data: {
          leadId: id,
          actorId: actor.userId,
          action: LeadHistoryAction.NEXT_ACTION_SET,
          toValue: nextAction ?? undefined,
          note: nextAction
            ? `Další akce: ${NextActionLabels[nextAction]}${
                nextActionDueDate ? ` (do ${nextActionDueDate.toLocaleDateString('cs-CZ')})` : ''
              }`
            : 'Další akce zrušena',
        },
      });

      return updated;
    });
  }

  async markContacted(id: string, actor: CurrentUserPayload) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead nenalezen');
    this.assertAccess(lead, actor);

    if (lead.lastContactedAt && lead.lastContactedAt >= startOfDay(new Date())) {
      throw new BadRequestException('Tento lead byl dnes už kontaktován');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id },
        data: { lastContactedAt: new Date() },
      });

      await tx.leadHistory.create({
        data: {
          leadId: id,
          actorId: actor.userId,
          action: LeadHistoryAction.CONTACTED,
        },
      });

      return updated;
    });
  }

  async reassign(id: string, dto: ReassignLeadDto, actor: CurrentUserPayload) {
    // Přeřazení smí jen ADMIN
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Pouze administrátor může přeřadit lead');
    }
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead nenalezen');

    let newAgent: { firstName: string; lastName: string; email: string } | null = null;
    if (dto.agentId) {
      const agent = await this.prisma.user.findUnique({ where: { id: dto.agentId } });
      if (!agent || !agent.isActive) {
        throw new BadRequestException('Vybraný obchodník neexistuje nebo je neaktivní');
      }
      newAgent = agent;
    }

    // Přiřazení leadu skutečnému obchodníkovi ho automaticky "odsoukromí" - jinak
    // by zůstal pro obchodníka neviditelný, i když je mu formálně přiřazen.
    // Přiřazení zpět na majitele účtu (sám sobě) isPrivate nemění.
    const shouldUnprivate = !!newAgent && newAgent.email !== OWNER_EMAIL;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id },
        data: { assignedAgentId: dto.agentId ?? null, ...(shouldUnprivate ? { isPrivate: false } : {}) },
      });

      await tx.leadHistory.create({
        data: {
          leadId: id,
          actorId: actor.userId,
          action: LeadHistoryAction.ASSIGNED,
          fromValue: lead.assignedAgentId,
          toValue: dto.agentId ?? null,
          note: newAgent
            ? `Přeřazeno na ${newAgent.firstName} ${newAgent.lastName}`
            : 'Zrušeno přiřazení obchodníka',
        },
      });

      return updated;
    });
  }

  /** Hromadné přeřazení více leadů na jednoho obchodníka (nebo zrušení přiřazení) najednou */
  async reassignMany(ids: string[], agentId: string | null, actor: CurrentUserPayload) {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Pouze administrátor může přeřadit leady');
    }

    let newAgent: { firstName: string; lastName: string; email: string } | null = null;
    if (agentId) {
      const agent = await this.prisma.user.findUnique({ where: { id: agentId } });
      if (!agent || !agent.isActive) {
        throw new BadRequestException('Vybraný obchodník neexistuje nebo je neaktivní');
      }
      newAgent = agent;
    }

    const shouldUnprivate = !!newAgent && newAgent.email !== OWNER_EMAIL;

    const leads = await this.prisma.lead.findMany({ where: { id: { in: ids } } });

    return this.prisma.$transaction(async (tx) => {
      await tx.lead.updateMany({
        where: { id: { in: ids } },
        data: { assignedAgentId: agentId ?? null, ...(shouldUnprivate ? { isPrivate: false } : {}) },
      });

      await tx.leadHistory.createMany({
        data: leads.map((lead) => ({
          leadId: lead.id,
          actorId: actor.userId,
          action: LeadHistoryAction.ASSIGNED,
          fromValue: lead.assignedAgentId,
          toValue: agentId ?? null,
          note: newAgent
            ? `Hromadně přeřazeno na ${newAgent.firstName} ${newAgent.lastName}`
            : 'Hromadně zrušeno přiřazení obchodníka',
        })),
      });

      return { success: true, count: leads.length };
    });
  }

  async remove(id: string, actor: CurrentUserPayload) {
    if (actor.email !== OWNER_EMAIL) {
      throw new ForbiddenException('Mazání leadů je vyhrazeno pouze majiteli účtu');
    }
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead nenalezen');
    await this.prisma.lead.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Vstupní bod pro externí automatizace (např. noční scraping kontaktů) -
   * autentizace přes API klíč (ApiKeyGuard), ne přes JWT login. Leady bez
   * assignedAgentId spadnou do "Nepřiřazeno" a obchodník/admin si je přiřadí.
   */
  async importLeads(items: ImportLeadItemDto[]) {
    let count = 0;
    for (const item of items) {
      const lead = await this.prisma.lead.create({
        data: {
          firstName: item.firstName,
          lastName: item.lastName,
          phone: item.phone,
          email: item.email,
          company: item.company,
          notes: item.notes,
          oldWebsiteUrl: item.oldWebsiteUrl,
          assignedAgentId: item.assignedAgentId ?? null,
          autoImported: true,
        },
      });

      await this.prisma.leadHistory.create({
        data: {
          leadId: lead.id,
          actorId: null,
          action: LeadHistoryAction.CREATED,
          note: 'Naimportováno automaticky (noční automatizace)',
        },
      });

      count += 1;
    }
    return { success: true, count };
  }

  /**
   * Lehký výpis existujících leadů pro dedupe kontrolu z externí automatizace
   * (přes LeadsImportController / ApiKeyGuard) - jen jména, firma a starý web,
   * ať automatizace nenavrhuje duplicitní kandidáty.
   */
  async getImportDedupeList() {
    return this.prisma.lead.findMany({
      select: {
        firstName: true,
        lastName: true,
        company: true,
        oldWebsiteUrl: true,
        phone: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Hromadné smazání více leadů najednou - vyhrazeno pouze majiteli účtu */
  async removeMany(ids: string[], actor: CurrentUserPayload) {
    if (actor.email !== OWNER_EMAIL) {
      throw new ForbiddenException('Mazání leadů je vyhrazeno pouze majiteli účtu');
    }
    const result = await this.prisma.lead.deleteMany({ where: { id: { in: ids } } });
    return { success: true, count: result.count };
  }

  /** Export všech leadů do CSV - jen pro administrátora (bod 14 zadání) */
  async exportToCsv(actor: CurrentUserPayload): Promise<string> {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Export dat je dostupný pouze administrátorovi');
    }

    const leads = await this.prisma.lead.findMany({
      where: actor.email !== OWNER_EMAIL ? { isPrivate: false } : undefined,
      include: { assignedAgent: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const header = [
      'Jméno',
      'Příjmení',
      'Telefon',
      'Email',
      'Firma',
      'Odkaz na starý web',
      'Stav',
      'Obchodník',
      'Hodnota obchodu',
      'Vytvořeno',
      'Poslední kontakt',
    ];

    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

    const rows = leads.map((l) =>
      [
        l.firstName,
        l.lastName,
        l.phone,
        l.email ?? '',
        l.company ?? '',
        l.oldWebsiteUrl ?? '',
        LeadStatusLabels[l.status as LeadStatus] ?? l.status,
        l.assignedAgent ? `${l.assignedAgent.firstName} ${l.assignedAgent.lastName}` : '',
        l.dealValue?.toString() ?? '',
        l.createdAt.toISOString(),
        l.lastContactedAt?.toISOString() ?? '',
      ]
        .map((v) => escape(String(v)))
        .join(','),
    );

    return [header.map(escape).join(','), ...rows].join('\n');
  }

  /** Počty leadů v jednotlivých stavech - pro dashboard */
  async countByStatus(actor: CurrentUserPayload) {
    const where: Prisma.LeadWhereInput =
      actor.role === Role.ADMIN ? {} : { assignedAgentId: actor.userId };

    if (actor.email !== OWNER_EMAIL) {
      where.isPrivate = false;
    }

    const grouped = await this.prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const result: Record<string, number> = {
      NEW: 0,
      TO_CONTACT: 0,
      CONTACTED: 0,
      INTERESTED: 0,
      PROPOSAL: 0,
      NEGOTIATION: 0,
      WON: 0,
      LOST: 0,
      // deprecated - dokud doběhne migrace, ať se staré hodnoty nezobrazí jako "undefined"
      IN_PROGRESS: 0,
      MEETING_SCHEDULED: 0,
      SOLD: 0,
      REJECTED: 0,
    };
    grouped.forEach((g) => {
      result[g.status] = g._count;
    });
    return result;
  }
}
