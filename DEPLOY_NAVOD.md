# Návod na nasazení CRM Delta (krok za krokem)

Vše, co jde, je už předvyplněné. Ty jen kopíruješ a vkládáš. Zabere to cca 15 minut.

---

## Krok 1 – Kód na GitHub

Kód už je v repozitáři [`crm-app-delta`](https://github.com/kubisspodesva-hue/crm-app-delta)
na GitHubu – žádný zip rozbalovat nemusíš, stačí ho naklonovat nebo rovnou pokračovat
na Krok 2.

---

## Krok 2 – Založ účet na Renderu (1 minuta)

Jdi na [render.com](https://render.com) → "Get Started" → přihlas se přes GitHub účet
(stejný, kam patří repo `crm-app-delta`). Není potřeba platební karta, free tier stačí.

---

## Krok 3 – Založ PostgreSQL databázi

1. V Render dashboardu: **New +** → **PostgreSQL**
2. Name: `delta-db`
3. Region: cokoliv nejblíž (Frankfurt, pokud je k dispozici)
4. Plan: **Free**
5. Klikni **Create Database**
6. Až se založí, otevři ji a zkopíruj hodnotu **Internal Database URL** – budeš ji
   potřebovat hned v dalším kroku jako `DATABASE_URL`.

---

## Krok 4 – Backend (NestJS API)

1. **New +** → **Web Service**
2. Vyber GitHub repo `crm-app-delta`
3. Nastavení:
   - **Name**: `crm-delta-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run prisma:generate && npm run build`
   - **Start Command**: `npm run prisma:migrate:deploy && npm run start:prod`
   - **Plan**: Free
4. Sekce **Environment Variables** – přidej přesně tyto (hodnoty níže jsou už
   vygenerované, bezpečné, jen zkopíruj – jsou to **jiné** hodnoty než u ostatních
   CRM projektů, aby zůstaly nezávislé):

```
DATABASE_URL=<vlož Internal Database URL z Kroku 3>
PORT=4000
NODE_ENV=production
FRONTEND_URL=<doplníme v Kroku 6, zatím tam dej https://placeholder.com>
JWT_ACCESS_SECRET=5235707fad211e996d870b671e8b616a63f5f91eba7d2e0402e8724f9718bd0a
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=5aad9556d74b43208b96fb121f5a444bb2138d0c93148f992167bc38e71815d4
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=744c436cd4d509f070c8a3c17e845b4f
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=<doplníme v Kroku 7>
```

5. Klikni **Create Web Service**. Render appku sestaví a spustí – trvá to pár minut.
6. Až doběhne, zkopíruj si URL backendu nahoře (něco jako
   `https://crm-delta-backend-xxxx.onrender.com`) – budeš ji potřebovat v dalším kroku.

---

## Krok 5 – Frontend (Next.js)

1. **New +** → **Web Service**
2. Stejné repo `crm-app-delta`
3. Nastavení:
   - **Name**: `crm-delta-frontend`
   - **Root Directory**: `frontend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Free
4. Environment Variables:

```
NEXT_PUBLIC_API_URL=<URL backendu z Kroku 4>/api
```

   (např. `https://crm-delta-backend-xxxx.onrender.com/api`)

5. **Create Web Service**.
6. Až doběhne, zkopíruj URL frontendu (např. `https://crm-delta-frontend-xxxx.onrender.com`).

---

## Krok 6 – Propojit frontend s backendem (CORS)

Zpátky u `crm-delta-backend` v Render dashboardu → **Environment** → uprav proměnnou
`FRONTEND_URL` na skutečnou URL frontendu z Kroku 5 (např.
`https://crm-delta-frontend-xxxx.onrender.com`) → **Save Changes** (Render službu sám
restartuje).

---

## Krok 7 – Google Calendar (volitelné, jde přeskočit)

Appka běží i bez tohoto kroku – jen sekce plánování schůzek nebude aktivní, dokud toto
nenastavíš. Klidně to udělej později. Použij samostatný Google Cloud projekt (nebo
alespoň samostatný OAuth klient), ať nesdílí přístup s ostatními CRM projekty.

1. [Google Cloud Console](https://console.cloud.google.com/) → nový projekt →
   **APIs & Services** → **Library** → povol **Google Calendar API**.
2. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
   → typ **Web application**.
3. **Authorized redirect URIs**: `https://crm-delta-backend-xxxx.onrender.com/api/calendar/google/callback`
   (nahraď svojí skutečnou backend URL z Kroku 4).
4. Zkopíruj **Client ID** a **Client Secret**.
5. V Render u `crm-delta-backend` → Environment → doplň:
   ```
   GOOGLE_CLIENT_ID=<Client ID z Google>
   GOOGLE_CLIENT_SECRET=<Client Secret z Google>
   GOOGLE_REDIRECT_URI=https://crm-delta-backend-xxxx.onrender.com/api/calendar/google/callback
   ```
6. Save Changes.

---

## Krok 8 – Naplnit databázi testovacími daty (volitelné)

V Render dashboardu u `crm-delta-backend` klikni na **Shell** (v horním menu služby)
a spusť:

```bash
npm run prisma:seed
```

Vytvoří to admina a dva obchodníky s heslem `Heslo123!` (viz README, sekce 2.2).
**Po prvním přihlášení hesla změň** – seed je stejný jako u ostatních CRM projektů.

---

## Krok 9 – Vyzkoušet a nainstalovat na telefon

1. Otevři URL frontendu z Kroku 5 v prohlížeči – měl by se objevit přihlašovací
   formulář.
2. Přihlas se (admin@crm.cz / Heslo123!, pokud jsi udělal/a Krok 8).
3. Na telefonu otevři stejnou URL → Android: menu (⋮) → "Přidat na plochu".
   iOS: sdílení → "Přidat na plochu".

---

## Poznámka k free tieru Renderu

Free web services na Renderu po ~15 minutách bez provozu "usnou" a první další
požadavek trvá ~30-60 sekund, než se appka probudí. Pro reálné použití obchodním
týmem doporučuju po vyzkoušení upgradovat backend i frontend na placený plán
(řádově $7/měsíc za každou službu), ať appka neusíná mezi hovory s klienty.
