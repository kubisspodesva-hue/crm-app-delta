# CRM – architektura řešení

## 1. Přehled

Produkční CRM pro obchodní tým: správa leadů, plánování schůzek přes Google Calendar,
sledování výkonu, cíle, predikce a provizní systém.

Monorepo se dvěma nezávisle nasaditelnými aplikacemi:

```
crm-app-delta/
├── backend/     NestJS REST API (Node.js, TypeScript, Prisma, PostgreSQL)
└── frontend/    Next.js 14 (App Router, TypeScript, Tailwind CSS)
```

## 2. Technologický stack

| Vrstva | Technologie |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts |
| Backend | Node.js 20, NestJS 10, TypeScript |
| Databáze | PostgreSQL 15 |
| ORM | Prisma |
| Autentizace | JWT (access 15 min) + refresh token (7 dní, httpOnly cookie), bcrypt |
| Kalendář | Google Calendar API v3, OAuth2 |
| Validace | class-validator / class-transformer |
| Hostování (doporučeno) | Vercel (frontend), Railway/Render (backend + Postgres) |

## 3. Architektonický přístup

- **Modulární monolit** na backendu (NestJS moduly per doména) – dostatečně škálovatelné
  pro obchodní tým, bez zbytečné komplexity mikroslužeb. Každý modul (leads, users,
  meetings, commissions, targets, stats, notifications) má vlastní controller/service/DTO
  a lze jej v budoucnu vyextrahovat do samostatné služby.
- **Vrstvení**: Controller (HTTP, validace vstupu) → Service (byznys logika) → Prisma
  (perzistence). Nikdy se nevolá Prisma přímo z controlleru.
- **Zabezpečení**: JWT guard + Roles guard na úrovni endpointů, `@CurrentUser()` decorator,
  row-level filtrování (agent vidí jen své leady) je vynuceno v service vrstvě, ne jen v UI.
- **Historie změn**: každá mutace leadu (stav, přiřazení, poznámka, kontakt) zapisuje záznam
  do `LeadHistory` v rámci jedné DB transakce se samotnou změnou – historie je tak vždy
  konzistentní se stavem leadu.
- **Google Calendar**: obchodníci nepotřebují vlastní Google účet – CRM používá refresh token
  administrátora (majitele kalendáře) uložený šifrovaně v `CalendarIntegration`. Endpoint
  `/meetings/available-slots` počítá volné sloty z `freebusy` API a odečítá již obsazené
  časy, takže obsazený slot nelze v UI vůbec vybrat.
- **Provize a cíle**: čistě odvozená data – počítají se on-the-fly service vrstvou
  (`CommissionsService`, `TargetsService`) z `Lead` + `CommissionConfig` + `Target`,
  nikdy se needukuje/needuplikuje uložený "final" výsledek, aby nedocházelo k nekonzistenci.

## 4. Role a přístupová práva

| Akce | Admin | Obchodník |
|---|---|---|
| Vidí všechny leady | ✅ | ❌ (jen své) |
| Vytváří/maže/deaktivuje obchodníky | ✅ | ❌ |
| Nastavuje provize a cíle | ✅ | ❌ (jen čte své) |
| Mění stav svého leadu, píše poznámky | ✅ | ✅ |
| Plánuje schůzku | ✅ | ✅ |
| Vidí statistiky všech obchodníků | ✅ | ❌ (jen své) |
| Export dat | ✅ | ❌ |

## 5. Tok „Domluvená schůzka“ (klíčový use-case)

1. Obchodník změní stav leadu na `MEETING_SCHEDULED`.
2. Frontend detekuje změnu stavu a otevře `MeetingBooker` modal.
3. Modal zavolá `GET /meetings/available-slots?date=...` → backend zavolá Google
   `freebusy.query`, vrátí volné 30/60min sloty pro daný den.
4. Obchodník vybere slot → `POST /meetings` s `leadId`, `start`, `end`.
5. Backend znovu ověří dostupnost (race-condition guard), vytvoří `events.insert`
   v Google Calendari (s jménem, telefonem, e-mailem a poznámkou klienta v popisu),
   uloží `Meeting` propojený s `Lead`, zapíše `LeadHistory` záznam.
6. Lead nyní zobrazuje odkaz na schůzku; notifikace se generuje den/den předem.

## 6. Nasazení

- **Frontend** → Vercel, env `NEXT_PUBLIC_API_URL`.
- **Backend** → Railway/Render, připojená managed PostgreSQL, env viz `.env.example`.
- **Migrace** → `prisma migrate deploy` v CI/CD před spuštěním nové verze backendu.
- **Secrets**: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN`
  se nastavují v prostředí hostingu, nikdy se necommitují.
