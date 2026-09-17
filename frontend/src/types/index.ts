export type Role = 'ADMIN' | 'AGENT';

// Nový 8stavový obchodní pipeline (2026-08). "Stav" = kde obchod je,
// odděleně od "Další akce" (nextAction) = co má obchodník udělat dál.
// Staré 4 hodnoty jsou dočasně ponechané, dokud neproběhne migrace dat.
export type LeadStatus =
  | 'NEW'
  | 'TO_CONTACT'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  // deprecated - jen po dobu přechodu
  | 'IN_PROGRESS'
  | 'MEETING_SCHEDULED'
  | 'SOLD'
  | 'REJECTED';

export const LeadStatusLabels: Record<LeadStatus, string> = {
  NEW: 'Nový',
  TO_CONTACT: 'Kontaktovat',
  CONTACTED: 'Kontaktováno',
  INTERESTED: 'Zájem',
  PROPOSAL: 'Nabídka',
  NEGOTIATION: 'Jednání',
  WON: 'Prodáno',
  LOST: 'Nemá zájem',
  IN_PROGRESS: 'V procesu (starý)',
  MEETING_SCHEDULED: 'Domluvená schůzka (starý)',
  SOLD: 'Prodáno (starý)',
  REJECTED: 'Odmítnuto (starý)',
};

// Pořadí pro select/pipeline UI - zjednodušený pipeline (2026-09): jen Zájem
// -> Jednání (otevírá booking schůzky, viz LeadStatusSelect) -> Prodáno/Nemá
// zájem. TO_CONTACT/CONTACTED/PROPOSAL zůstávají v LeadStatus jen kvůli
// zpětné kompatibilitě starých leadů (zobrazí se u nich jako "deprecated"
// hodnota, viz LeadStatusSelect), v selectu už nejsou nabízené.
export const LEAD_STATUS_PIPELINE: LeadStatus[] = [
  'NEW',
  'INTERESTED',
  'NEGOTIATION',
  'WON',
  'LOST',
];

export const WON_STATUSES: LeadStatus[] = ['WON', 'SOLD'];
export const LOST_STATUSES: LeadStatus[] = ['LOST', 'REJECTED'];

export type NextActionType =
  | 'CALL'
  | 'EMAIL'
  | 'FOLLOW_UP'
  | 'SEND_PROPOSAL'
  | 'MEETING'
  | 'WAITING';

export const NextActionLabels: Record<NextActionType, string> = {
  CALL: 'Zavolat',
  EMAIL: 'Poslat e-mail',
  FOLLOW_UP: 'Follow-up',
  SEND_PROPOSAL: 'Připravit nabídku',
  MEETING: 'Schůzka',
  WAITING: 'Čekám na odpověď',
};

export const NextActionEmojis: Record<NextActionType, string> = {
  CALL: '📞',
  EMAIL: '✉️',
  FOLLOW_UP: '🔄',
  SEND_PROPOSAL: '📄',
  MEETING: '🤝',
  WAITING: '⏳',
};

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: Role;
  isActive: boolean;
  avatarUrl?: string | null;
  commissionConfig?: CommissionConfig | null;
  targets?: Target[];
}

export interface CommissionConfig {
  id: string;
  type: 'FIXED_PER_SALE' | 'PERCENTAGE';
  fixedAmount?: string | null;
  percentage?: string | null;
}

export interface Target {
  id: string;
  period: 'WEEKLY' | 'MONTHLY';
  metric: 'CONTACTS' | 'MEETINGS' | 'SALES';
  value: number;
}

export interface Lead {
  id: string;
  sequenceNumber?: number | null;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null; // nepovinný - automatizace u části kandidátů dohledá jen telefon
  company?: string | null;
  notes?: string | null;
  oldWebsiteUrl?: string | null;
  autoImported?: boolean;
  isPrivate?: boolean;
  status: LeadStatus;
  dealValue?: string | null;
  nextAction?: NextActionType | null;
  nextActionDueDate?: string | null;
  createdAt: string;
  lastContactedAt?: string | null;
  soldAt?: string | null;
  rejectedAt?: string | null;
  assignedAgent?: { id: string; firstName: string; lastName: string; email?: string };
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  meetings?: Meeting[];
  history?: LeadHistoryItem[];
}

export interface LeadHistoryItem {
  id: string;
  action: string;
  fromValue?: string | null;
  toValue?: string | null;
  note?: string | null;
  createdAt: string;
  actor?: { firstName: string; lastName: string } | null;
}

export interface Meeting {
  id: string;
  leadId: string;
  agentId: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string | null;
  lead?: { id: string; firstName: string; lastName: string; phone: string; email?: string | null };
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface AgentStats {
  userId: string;
  contactedCount: number;
  inProgressCount: number;
  meetingsCount: number;
  soldCount: number;
  rejectedCount: number;
  totalAssigned: number;
  conversionRate: number;
  successRate: number;
  revenue: number;
  commission: number;
  careerLevel?: string;
  careerLevelEmoji?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  firstName: string;
  lastName: string;
  contactedCount: number;
  meetingsCount: number;
  soldCount: number;
  conversionRate: number;
  revenue: number;
  careerLevel: string;
  careerLevelEmoji: string;
  nextLevelTitle: string | null;
  salesToNextLevel: number | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedLeadId?: string | null;
  createdAt: string;
}
