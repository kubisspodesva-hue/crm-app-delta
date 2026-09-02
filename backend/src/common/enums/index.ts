export enum Role {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
}

// 8stavový obchodní pipeline (2026-08). "Stav" = kde obchod je, odděleně od
// pole nextAction ("Další akce" = co má obchodník udělat). WON řídí provize
// a kariérní úrovně obchodníků (viz stats.service.ts, commissions.service.ts).
export enum LeadStatus {
  NEW = 'NEW',
  TO_CONTACT = 'TO_CONTACT',
  CONTACTED = 'CONTACTED',
  INTERESTED = 'INTERESTED',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  WON = 'WON',
  LOST = 'LOST',

  // DEPRECATED - staré 4 hodnoty, ponechané dočasně kvůli bezpečné dvoufázové
  // migraci (viz backend/prisma/migrate-lead-status-pipeline.ts). Po úspěšné
  // migraci na produkci se v samostatném commitu odstraní.
  IN_PROGRESS = 'IN_PROGRESS',
  MEETING_SCHEDULED = 'MEETING_SCHEDULED',
  SOLD = 'SOLD',
  REJECTED = 'REJECTED',
}

export const LeadStatusLabels: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: 'Nový',
  [LeadStatus.TO_CONTACT]: 'Kontaktovat',
  [LeadStatus.CONTACTED]: 'Kontaktováno',
  [LeadStatus.INTERESTED]: 'Zájem',
  [LeadStatus.PROPOSAL]: 'Nabídka',
  [LeadStatus.NEGOTIATION]: 'Jednání',
  [LeadStatus.WON]: 'Prodáno',
  [LeadStatus.LOST]: 'Nemá zájem',
  // deprecated - jen pro dobu přechodu
  [LeadStatus.IN_PROGRESS]: 'V procesu (starý)',
  [LeadStatus.MEETING_SCHEDULED]: 'Domluvená schůzka (starý)',
  [LeadStatus.SOLD]: 'Prodáno (starý)',
  [LeadStatus.REJECTED]: 'Odmítnuto (starý)',
};

export enum NextActionType {
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  FOLLOW_UP = 'FOLLOW_UP',
  SEND_PROPOSAL = 'SEND_PROPOSAL',
  MEETING = 'MEETING',
  WAITING = 'WAITING',
}

export const NextActionLabels: Record<NextActionType, string> = {
  [NextActionType.CALL]: 'Zavolat',
  [NextActionType.EMAIL]: 'Poslat e-mail',
  [NextActionType.FOLLOW_UP]: 'Follow-up',
  [NextActionType.SEND_PROPOSAL]: 'Připravit nabídku',
  [NextActionType.MEETING]: 'Schůzka',
  [NextActionType.WAITING]: 'Čekám na odpověď',
};

export enum CommissionType {
  FIXED_PER_SALE = 'FIXED_PER_SALE',
  PERCENTAGE = 'PERCENTAGE',
}

export enum TargetPeriod {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum TargetMetric {
  CONTACTS = 'CONTACTS',
  MEETINGS = 'MEETINGS',
  SALES = 'SALES',
}

export enum MeetingStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum NotificationType {
  MEETING_TODAY = 'MEETING_TODAY',
  MEETING_TOMORROW = 'MEETING_TOMORROW',
  LEAD_STALE = 'LEAD_STALE',
  LEAD_ASSIGNED = 'LEAD_ASSIGNED',
  TARGET_AT_RISK = 'TARGET_AT_RISK',
}

export enum LeadHistoryAction {
  CREATED = 'CREATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ASSIGNED = 'ASSIGNED',
  NOTE_ADDED = 'NOTE_ADDED',
  CONTACTED = 'CONTACTED',
  MEETING_BOOKED = 'MEETING_BOOKED',
  MEETING_CANCELLED = 'MEETING_CANCELLED',
  FIELD_UPDATED = 'FIELD_UPDATED',
  NEXT_ACTION_SET = 'NEXT_ACTION_SET',
}

// Povolené přechody stavu leadu - vynucuje se v LeadsService.
// Záměrně bez omezení: obchodník může z libovolného stavu přejít do
// libovolného jiného (např. i domluvit schůzku z "Prohráno"). Každá změna
// se i tak zaznamená do LeadHistory, takže historie zůstává dohledatelná.
// Staré (deprecated) hodnoty se v UI už nenabízí, ale gate je tu ponechaná
// funkční i pro ně po dobu přechodového období.
const ALL_STATUSES = [
  LeadStatus.NEW,
  LeadStatus.TO_CONTACT,
  LeadStatus.CONTACTED,
  LeadStatus.INTERESTED,
  LeadStatus.PROPOSAL,
  LeadStatus.NEGOTIATION,
  LeadStatus.WON,
  LeadStatus.LOST,
  LeadStatus.IN_PROGRESS,
  LeadStatus.MEETING_SCHEDULED,
  LeadStatus.SOLD,
  LeadStatus.REJECTED,
];

export const ALLOWED_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = Object.fromEntries(
  ALL_STATUSES.map((s) => [s, ALL_STATUSES.filter((other) => other !== s)]),
) as Record<LeadStatus, LeadStatus[]>;
