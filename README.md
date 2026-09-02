# CRM pro obchodní tým – Delta

Produkční CRM pro správu leadů, plánování schůzek (Google Calendar), sledování výkonu,
cílů a provizí obchodního týmu. Architektura a technická rozhodnutí jsou popsána v
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Nezávislá instance CRM pro klienta Delta – samostatný kód, databáze i nasazení,
oddělené od ostatních CRM projektů.

```
crm-app-delta/
├── backend/   NestJS API (TypeScript, Prisma, PostgreSQL, JWT, Google Calendar)
├── frontend/  Next.js 14 (App Router, TypeScript, Tailwind, Recharts)
└── docs/      Architektura a poznámky k návrhu
```

## 1. Požadavky

- Node.js 20+
- Docker (pro lokální PostgreSQL) nebo vlastní PostgreSQL 15 instance
- Google Cloud projekt s povoleným **Google Calendar API** a OAuth2 klientem

## 2. Rychlý start (lokálně)

### 2.1 Databáze

```bash
docker compose up -d
```

Spustí PostgreSQL na `localhost:5432` s přihlašovacími údaji z `docker-compose.yml`.

### 2.2 Backend

```bash
cd backend
cp .env.example .env      # doplňte JWT secrety a Google OAuth2 údaje
npm install
npm run prisma:migrate    # vytvoří tabulky podle prisma/schema.prisma
npm run prisma:seed       # vytvoří admina + 2 obchodníky + ukázková data
npm run start:dev         # http://localhost:4000/api
```

Přihlašovací údaje po seedu (heslo je pro všechny stejné):

| Role | E-mail | Heslo |
|---|---|---|
| Admin | admin@crm.cz | Heslo123! |
| Obchodník | petr.svoboda@crm.cz | Heslo123! |
| Obchodník | lucie.kralova@crm.cz | Heslo123! |

### 2.3 Frontend

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL
npm install
npm run dev                  # http://localhost:3000
```

## 3. Propojení Google Kalendáře

1. V [Google Cloud Console](https://console.cloud.google.com/) vytvořte OAuth2 Client ID
   (typ „Web application“), povolte **Google Calendar API**.
2. Jako „Authorized redirect URI“ nastavte `GOOGLE_REDIRECT_URI` z `backend/.env`
   (výchozí `http://localhost:4000/api/calendar/google/callback`).
3. Doplňte `GOOGLE_CLIENT_ID` a `GOOGLE_CLIENT_SECRET` do `backend/.env`.
4. Přihlaste se jako administrátor a zavolejte `GET /api/calendar/google/connect`
   (v produkci bude toto tlačítko v sekci Nastavení frontendu) – otevře se Google
   souhlasová obrazovka, po potvrzení se refresh token uloží (zašifrovaně) do
   `CalendarIntegration`.
5. Od této chvíle `GET /api/meetings/available-slots?date=YYYY-MM-DD` vrací reálné
   volné termíny z připojeného kalendáře a rezervace se zapisují jako Google Calendar
   eventy.

## 4. Klíčové byznysové toky

- **Stavy leadu**: V procesu → Domluvená schůzka / Prodáno / Odmítnuto. Přechody jsou
  vynucené na backendu (`ALLOWED_STATUS_TRANSITIONS` v `common/enums`), takže je nelze
  obejít ani chybným voláním API.
- **Automatické plánování schůzky**: změna stavu na „Domluvená schůzka“ ve frontendu
  otevře booking modal → volné sloty se natahují z Google Calendar API → po potvrzení
  backend atomicky vytvoří Google event, záznam schůzky i historii leadu.
- **Historie**: každá mutace leadu (vytvoření, změna stavu, poznámka, kontakt,
  přeřazení) se zapisuje do `LeadHistory` ve stejné DB transakci jako samotná změna.
- **Provize a cíle**: počítají se on-the-fly ze skutečných dat (leady, schůzky,
  historie kontaktů), nikdy se needukují do samostatné "cache" tabulky – nemůže tak
  dojít k rozjetí čísel.
- **Predikce kontaktů**: `needed = zbývající_prodeje / úspěšnost`, kde úspěšnost =
  historický poměr prodejů ku kontaktům. Přepočítává se při každém načtení stránky
  Cíle a predikce.

## 5. Nasazení do produkce

| Komponenta | Doporučení |
|---|---|
| Frontend | Vercel – nastavte `NEXT_PUBLIC_API_URL` na produkční URL backendu |
| Backend | Railway nebo Render – nastavte všechny proměnné z `backend/.env.example` |
| Databáze | Railway/Render managed PostgreSQL, nebo Supabase/Neon |
| Migrace | V CI/CD pipeline spustit `npm run prisma:migrate:deploy` před restartem backendu |

Před nasazením do produkce:
- vygenerujte silné, náhodné hodnoty pro `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  a `ENCRYPTION_KEY` (32 znaků),
- v `GOOGLE_REDIRECT_URI` a CORS (`FRONTEND_URL`) použijte produkční domény,
- zapněte `secure: true` na cookies (děje se automaticky při `NODE_ENV=production`).

## 6. Instalace jako appka na telefon (PWA)

Frontend je nakonfigurovaný jako Progressive Web App (`public/manifest.json`,
`public/sw.js`) - funguje na iOS i Androidu, zdarma a bez app store, appka
nikdy nevyprší.

**Podmínka**: frontend musí běžet na HTTPS (Vercel to zajišťuje automaticky;
`next dev` na `localhost` funguje pro PWA taky, ale service worker se
neregistruje mimo produkční build - viz `ServiceWorkerRegistration.tsx`).

Postup pro obchodníka:

1. **Android (Chrome)**: otevřít URL appky → v pravém horním rohu menu (⋮) →
   „Přidat na plochu" / „Nainstalovat aplikaci". Ikona se objeví na ploše a
   appka běží v samostatném okně bez adresního řádku.
2. **iOS (Safari)**: otevřít URL appky → tlačítko sdílení (čtvereček se
   šipkou) → „Přidat na plochu". Safari je jediný prohlížeč na iOS, který
   toto umí (Chrome na iOS ne, protože pod kapotou používá stejný engine
   jako Safari, ale bez tohoto rozšíření).

Po instalaci appka automaticky ukazuje aktuální verzi po každém dalším
nasazení na Vercel - není potřeba nic ručně aktualizovat ani schvalovat.

Pokud by v budoucnu bylo potřeba oficiální umístění v App Store / Google
Play (např. kvůli spolehlivým push notifikacím na iOS), lze stejný Next.js
kód zabalit přes [Capacitor](https://capacitorjs.com/) - na Androidu to jde
udělat zdarma (sideload APK), na iOS je ale nutný placený Apple Developer
účet (99 USD/rok), protože Apple neumožňuje appky bez něj instalovat
natrvalo.

## 7. Bezpečnost

- Hesla hashovaná přes bcrypt (12 rounds).
- Přístupový JWT token (15 min) + refresh token (7 dní) v httpOnly cookie s rotací
  při každém refreshi.
- Google refresh token je v databázi uložen šifrovaně (AES-256-CBC, klíč
  `ENCRYPTION_KEY`).
- Row-level autorizace: obchodník má přístup pouze ke svým leadům/schůzkám/statistikám
  – vynuceno v service vrstvě, ne pouze v UI.
- `helmet`, CORS s `credentials: true` jen pro `FRONTEND_URL`, globální rate limiting
  (`ThrottlerModule`).
