# Driftsättning på Railway — Steg för steg

## Vad du behöver
- Ett gratis konto på railway.app
- Ett gratis konto på github.com
- Dina Stripe live-nycklar (Stripe Dashboard → Developers → API keys)

---

## Steg 1 — Lägg upp koden på GitHub

1. Gå till github.com och logga in
2. Klicka på "New repository" → döp det till t.ex. `stripe-checkout`
3. Ladda upp alla filer (dra och släpp i webbläsaren):
   - `package.json`
   - `backend/server.js`
   - `frontend/index.html`
4. Klicka "Commit changes"

---

## Steg 2 — Deploya på Railway

1. Gå till railway.app → logga in med GitHub
2. Klicka "New Project" → "Deploy from GitHub repo"
3. Välj ditt `stripe-checkout` repo
4. Railway startar automatiskt — vänta ca 1 minut

---

## Steg 3 — Lägg till din Stripe-nyckel

1. I Railway, klicka på ditt projekt → "Variables"
2. Klicka "New Variable" och lägg till:
   - **Name:** `STRIPE_SECRET_KEY`
   - **Value:** din `sk_live_...` nyckel från Stripe Dashboard
3. Klicka "Add" — Railway startar om automatiskt

---

## Steg 4 — Uppdatera frontend med din publika nyckel

1. Öppna `frontend/index.html`
2. Hitta denna rad (längst ner i filen):
   ```
   const STRIPE_PUBLISHABLE_KEY = 'pk_live_REPLACE_WITH_YOUR_KEY';
   ```
3. Ersätt `pk_live_REPLACE_WITH_YOUR_KEY` med din `pk_live_...` nyckel
   (Stripe Dashboard → Developers → API keys → Publishable key)
4. Ladda upp den uppdaterade filen till GitHub igen
5. Railway deployas automatiskt på några sekunder

---

## Steg 5 — Hämta din live-URL

1. I Railway → klicka "Settings" → "Domains"
2. Klicka "Generate Domain" — du får en URL som t.ex.:
   `https://stripe-checkout-production.up.railway.app`
3. Dela den URL:en med dina kunder — det är din checkout-sida!

---

## Klart! Din checkout gör följande:
- Kunden väljer paket + antal användare
- Fyller i kortuppgifter
- Betalar 0 kr idag
- Första faktura skickas automatiskt den 28:e nästa månad
- Därefter faktureras den 28:e varje månad

---

## Support
Vid problem — kontrollera loggar i Railway under "Logs"-fliken.
