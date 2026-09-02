import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { pragueWallTimeToUtc } from '../common/utils/timezone.util';

export interface TimeSlot {
  start: string; // ISO
  end: string; // ISO
}

const ALGO = 'aes-256-cbc';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  // -- šifrování refresh tokenu uloženého v DB --

  private encrypt(text: string): string {
    const key = crypto.createHash('sha256').update(this.config.get('ENCRYPTION_KEY')!).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decrypt(payload: string): string {
    const [ivHex, dataHex] = payload.split(':');
    const key = crypto.createHash('sha256').update(this.config.get('ENCRYPTION_KEY')!).digest();
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  private getOAuthClient() {
    return new google.auth.OAuth2(
      this.config.get('GOOGLE_CLIENT_ID'),
      this.config.get('GOOGLE_CLIENT_SECRET'),
      this.config.get('GOOGLE_REDIRECT_URI'),
    );
  }

  /** Generuje URL pro OAuth consent screen (admin propojuje svůj Google účet) */
  getAuthUrl(state: string): string {
    const client = this.getOAuthClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state,
    });
  }

  /** Výměna authorization code za tokeny po redirectu z Google */
  async handleOAuthCallback(code: string, userId: string) {
    const client = this.getOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      throw new InternalServerErrorException(
        'Google nevrátil refresh token. Zkuste propojení znovu s prompt=consent.',
      );
    }

    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data } = await oauth2.userinfo.get();
    const googleEmail = data.email ?? 'unknown@google.com';

    await this.prisma.calendarIntegration.upsert({
      where: { userId },
      create: {
        userId,
        googleEmail,
        refreshToken: this.encrypt(tokens.refresh_token),
        accessToken: tokens.access_token ? this.encrypt(tokens.access_token) : null,
        accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
      update: {
        googleEmail,
        refreshToken: this.encrypt(tokens.refresh_token),
        accessToken: tokens.access_token ? this.encrypt(tokens.access_token) : null,
        accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    return { connected: true };
  }

  /** Stav propojení pro zobrazení v nastavení frontendu */
  async getStatus(): Promise<{
    connected: boolean;
    googleEmail?: string;
    workingHourStart?: number;
    workingHourEnd?: number;
    slotDurationMin?: number;
  }> {
    const integration = await this.prisma.calendarIntegration.findFirst();
    if (!integration) return { connected: false };
    return {
      connected: true,
      googleEmail: integration.googleEmail,
      workingHourStart: integration.workingHourStart,
      workingHourEnd: integration.workingHourEnd,
      slotDurationMin: integration.slotDurationMin,
    };
  }

  /** Admin si může upravit pracovní dobu, ve které appka nabízí volné sloty */
  async updateWorkingHours(params: {
    workingHourStart: number;
    workingHourEnd: number;
    slotDurationMin: number;
  }) {
    const integration = await this.prisma.calendarIntegration.findFirst();
    if (!integration) {
      throw new InternalServerErrorException('Google Kalendář není propojen');
    }
    if (params.workingHourStart < 0 || params.workingHourStart > 23) {
      throw new InternalServerErrorException('Neplatná hodina začátku pracovní doby');
    }
    if (params.workingHourEnd <= params.workingHourStart || params.workingHourEnd > 24) {
      throw new InternalServerErrorException('Konec pracovní doby musí být po jejím začátku');
    }
    if (params.slotDurationMin < 5 || params.slotDurationMin > 240) {
      throw new InternalServerErrorException('Neplatná délka schůzky');
    }
    await this.prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: params,
    });
    return this.getStatus();
  }

  private async getAuthorizedClientForOwner() {
    // V tomto CRM má kalendář vždy jeden vlastník (admin/firma)
    const integration = await this.prisma.calendarIntegration.findFirst();
    if (!integration) {
      throw new InternalServerErrorException('Google Kalendář není propojen');
    }

    const client = this.getOAuthClient();
    client.setCredentials({ refresh_token: this.decrypt(integration.refreshToken) });
    return { client, integration };
  }

  /**
   * Volání Google API bez ošetření chyby dřív probublávalo jako holé 500
   * "Internal server error" - typicky když vyprší/je odvolaný refresh token
   * (časté u OAuth aplikace v "Testing" režimu v Google Cloud Console, kde
   * refresh tokeny platí jen ~7 dní). Tahle obálka to promění na srozumitelnou
   * hlášku, ať admin ví, že má znovu propojit kalendář v Nastavení.
   */
  private async withGoogleErrorHandling<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (err: any) {
      const reason = err?.response?.data?.error ?? err?.code ?? err?.message;
      this.logger.error(`Google Calendar API chyba: ${JSON.stringify(reason ?? err)}`);
      if (reason === 'invalid_grant' || err?.code === 401 || err?.code === 403) {
        throw new ServiceUnavailableException(
          'Propojení s Google Kalendářem vypršelo nebo bylo odvoláno. Přejdi do Nastavení a klikni na "Propojit jiný účet".',
        );
      }
      throw new ServiceUnavailableException(
        'Google Kalendář momentálně nereaguje. Zkuste to prosím za chvíli znovu.',
      );
    }
  }

  /**
   * Spočítá volné sloty pro daný den na základě pracovní doby a freebusy dat z Google.
   * Obsazené sloty se z výsledku odečtou, takže je nelze v UI vůbec vybrat.
   */
  async getAvailableSlots(dateISO: string): Promise<TimeSlot[]> {
    return this.withGoogleErrorHandling(async () => {
      const { client, integration } = await this.getAuthorizedClientForOwner();
      const calendar = google.calendar({ version: 'v3', auth: client });

      // Pracovní doba je zadaná v českém čase (Europe/Prague) - musí se tak i přepočítat
      // na UTC, jinak by na serveru běžícím v UTC vznikl posun (v létě +2 hodiny).
      const dayStart = pragueWallTimeToUtc(dateISO, integration.workingHourStart);
      const dayEnd = pragueWallTimeToUtc(dateISO, integration.workingHourEnd);

      const freebusy = await calendar.freebusy.query({
        requestBody: {
          timeMin: dayStart.toISOString(),
          timeMax: dayEnd.toISOString(),
          items: [{ id: integration.calendarId }],
        },
      });

      const busy = freebusy.data.calendars?.[integration.calendarId]?.busy ?? [];
      const busyRanges = busy.map((b) => ({
        start: new Date(b.start!).getTime(),
        end: new Date(b.end!).getTime(),
      }));

      const slots: TimeSlot[] = [];
      const slotMs = integration.slotDurationMin * 60 * 1000;

      for (let t = dayStart.getTime(); t + slotMs <= dayEnd.getTime(); t += slotMs) {
        const slotStart = t;
        const slotEnd = t + slotMs;
        const overlapsBusy = busyRanges.some(
          (b) => slotStart < b.end && slotEnd > b.start,
        );
        const isPast = slotStart < Date.now();
        if (!overlapsBusy && !isPast) {
          slots.push({
            start: new Date(slotStart).toISOString(),
            end: new Date(slotEnd).toISOString(),
          });
        }
      }

      return slots;
    });
  }

  /** Ověří, že konkrétní slot je stále volný (race-condition guard před zápisem) */
  async isSlotAvailable(startISO: string, endISO: string): Promise<boolean> {
    return this.withGoogleErrorHandling(async () => {
      const { client, integration } = await this.getAuthorizedClientForOwner();
      const calendar = google.calendar({ version: 'v3', auth: client });

      const freebusy = await calendar.freebusy.query({
        requestBody: {
          timeMin: startISO,
          timeMax: endISO,
          items: [{ id: integration.calendarId }],
        },
      });

      const busy = freebusy.data.calendars?.[integration.calendarId]?.busy ?? [];
      return busy.length === 0;
    });
  }

  async createEvent(params: {
    start: string;
    end: string;
    summary: string;
    description: string;
  }): Promise<string> {
    return this.withGoogleErrorHandling(async () => {
      const { client, integration } = await this.getAuthorizedClientForOwner();
      const calendar = google.calendar({ version: 'v3', auth: client });

      const event = await calendar.events.insert({
        calendarId: integration.calendarId,
        requestBody: {
          summary: params.summary,
          description: params.description,
          start: { dateTime: params.start },
          end: { dateTime: params.end },
        },
      });

      return event.data.id!;
    });
  }

  async deleteEvent(googleEventId: string): Promise<void> {
    const { client, integration } = await this.getAuthorizedClientForOwner();
    const calendar = google.calendar({ version: 'v3', auth: client });
    try {
      await calendar.events.delete({ calendarId: integration.calendarId, eventId: googleEventId });
    } catch (err) {
      this.logger.warn(`Nepodařilo se smazat Google event ${googleEventId}: ${err}`);
    }
  }
}
