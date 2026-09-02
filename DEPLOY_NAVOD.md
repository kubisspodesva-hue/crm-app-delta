# Návod na nasazení CRM Delta (Blueprint - nejrychlejší cesta)

Repo obsahuje `render.yaml` - Render podle něj založí obě služby (backend
i frontend) najednou, se správnými build/start příkazy i s už vygenerovanými
JWT/encryption secrets. Nemusíš nic z toho ručně vyplňovat.

---

## Krok 1 – Databáze (Neon, mimo Render)

Render dovolí jen jednu free databázi na účet, tak databázi hostujeme na
[neon.tech](https://neon.tech) (taky zdarma):

1. Na [neon.tech](https://neon.tech) → přihlásit přes GitHub → založit projekt
   `crm-delta` (region klidně Frankfurt/EU).
2. Na stránce **Connection Details** vypni přepínač **„Pooled connection"**
   a zkopíruj connection string (bez `-pooler` v adrese) - budeš ho hned
   potřebovat.

---

## Krok 2 – Blueprint na Renderu

1. V Render dashboardu: **New +** → **Blueprint**
2. Vyber GitHub repo `crm-app-delta` (pokud ho Render nevidí, povol mu k němu
   přístup přes "Configure account").
3. Render najde `render.yaml` a ukáže náhled dvou služeb: `crm-delta-backend`
   a `crm-delta-frontend`.
4. V náhledu doplň jediné povinné pole: **DATABASE_URL** = connection string
   z Kroku 1.
5. Klikni **Apply**. Render obě služby sestaví a spustí (pár minut).

---

## Krok 3 – Propojit frontend s backendem

Až obě služby doběhnou, zkopíruj si jejich URL (uvidíš je u každé služby
nahoře, něco jako `https://crm-delta-backend.onrender.com`):

1. U `crm-delta-frontend` → **Environment** → nastav
   `NEXT_PUBLIC_API_URL` = `<URL backendu>/api`
   (např. `https://crm-delta-backend.onrender.com/api`) → **Save Changes**.
2. U `crm-delta-backend` → **Environment** → nastav
   `FRONTEND_URL` = `<URL frontendu>`
   (např. `https://crm-delta-frontend.onrender.com`) → **Save Changes**.

Render obě služby po uložení sám restartuje.

---

## Krok 4 – Google Calendar (volitelné, jde přeskočit)

Appka běží i bez tohoto kroku - jen sekce plánování schůzek nebude aktivní.

1. [Google Cloud Console](https://console.cloud.google.com/) → nový projekt →
   **APIs & Services** → **Library** → povol **Google Calendar API**.
2. **Credentials** → **Create Credentials** → **OAuth client ID** → typ
   **Web application**.
3. **Authorized redirect URIs**:
   `https://crm-delta-backend.onrender.com/api/calendar/google/callback`
4. U `crm-delta-backend` → **Environment** doplň `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (stejná URL jako v kroku 3).

---

## Krok 5 – Testovací data (volitelné)

U `crm-delta-backend` v Render dashboardu → **Shell** → spusť:

```bash
npm run prisma:seed
```

Vytvoří admina a dva obchodníky s heslem `Heslo123!` (viz README, sekce 2.2).
**Po prvním přihlášení hesla změň.**

---

## Krok 6 – Vyzkoušet a nainstalovat na telefon

1. Otevři URL frontendu z Kroku 2/3 - měl by se objevit přihlašovací
   formulář.
2. Přihlas se (admin@crm.cz / Heslo123!, pokud jsi udělal/a Krok 5).
3. Na telefonu otevři stejnou URL → Android: menu (⋮) → "Přidat na plochu".
   iOS: sdílení → "Přidat na plochu".

---

## Poznámka k free tieru

Free web services na Renderu po ~15 minutách bez provozu "usnou" a první další
požadavek trvá ~30-60 sekund, než se appka probudí. Neon free databáze se
chová podobně (scale to zero). Pro reálné použití obchodním týmem doporučuju
po vyzkoušení upgradovat na placené plány.
