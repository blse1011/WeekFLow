# WeekFlow 📅

Persönlicher Task-Manager mit Wochenansicht, Netlify Identity Login und Live-Sportwetten-Widget.

Gebaut als Demoprojekt für eine Projektarbeit über Netlify.

---

## Features

- 🔐 **Login via Netlify Identity** (E-Mail + Passwort, kostenlos)
- ✅ **Task Manager** — Aufgaben erstellen, bearbeiten, als erledigt markieren
- 📅 **Wochenansicht** — Aufgaben per Tag zuordnen
- 🎰 **Wetten-Widget** — Live-Quoten via The Odds API (Netlify Function als Proxy)
- 🌙 **Dark Mode** + Responsive Design

---

## Setup (Schritt für Schritt)

### 1. Repository erstellen

```bash
# Projekt auf GitHub pushen
git init
git add .
git commit -m "Initial commit: WeekFlow"
git remote add origin https://github.com/DEIN_NAME/weekflow.git
git push -u origin main
```

### 2. Netlify Account & Deployment

1. Gehe zu [netlify.com](https://netlify.com) und registriere dich kostenlos
2. Klicke auf **"Add new site" → "Import an existing project"**
3. GitHub verbinden → Repository auswählen
4. Build-Einstellungen (werden automatisch aus `netlify.toml` gelesen):
   - **Publish directory:** `public`
   - **Functions directory:** `netlify/functions`
5. Klicke **"Deploy site"** → In ca. 30 Sekunden ist die App live!

### 3. Netlify Identity aktivieren

1. Im Netlify Dashboard → **Site settings → Identity**
2. Klicke **"Enable Identity"**
3. Unter **"Registration preferences"** → `Open` (jeder kann sich registrieren) oder `Invite only`
4. Fertig! Der Login-Button in der App funktioniert jetzt automatisch.

### 4. The Odds API (für das Wetten-Widget)

1. Gehe zu [the-odds-api.com](https://the-odds-api.com) und registriere dich kostenlos
2. Kopiere deinen **API Key** aus dem Dashboard
3. In Netlify: **Site settings → Environment variables**
4. Klicke **"Add a variable"**:
   - Key: `ODDS_API_KEY`
   - Value: `dein-api-key-hier`
5. Site neu deployen (oder auf **"Trigger deploy"** klicken)

---

## Projektstruktur

```
weekflow/
├── public/
│   ├── index.html          # Haupt-HTML
│   ├── css/
│   │   └── style.css       # Alle Styles
│   └── js/
│       └── app.js          # App-Logik (Tasks, Tabs, Bets)
├── netlify/
│   └── functions/
│       └── odds.js         # Serverless Function: Odds API Proxy
└── netlify.toml            # Netlify Konfiguration
```

---

## Netlify Features im Überblick

| Feature              | Verwendung im Projekt           | Netlify-spezifisch? |
|----------------------|---------------------------------|---------------------|
| Static Hosting       | Frontend-Dateien hosten         | ❌ (auch woanders)  |
| CI/CD via GitHub     | Auto-Deploy bei jedem Push      | ❌ (auch woanders)  |
| Netlify Functions    | Serverless API-Proxy            | ⚠️ (Vendor Lock-in) |
| Netlify Identity     | Login / Auth                    | ✅ (Lock-in!)       |
| Environment Vars     | API-Key sicher speichern        | ❌ (Standard)       |
| Deploy Previews      | Branch-Preview-URLs             | ❌ (auch woanders)  |

### Vendor Lock-in Analyse

**Netlify Identity** ist der einzige echte Lock-in: Der `netlify-identity-widget.js` ist
Netlify-spezifisch. Bei einem Wechsel zu z.B. Vercel müsste man auf eine andere
Auth-Lösung (z.B. Auth0, Supabase Auth, Firebase Auth) wechseln.

**Netlify Functions** sind technisch AWS Lambda – der Code selbst (`exports.handler`) läuft
auch auf AWS Lambda oder Vercel Serverless Functions ohne große Änderungen.

---

## Lokale Entwicklung

```bash
# Netlify CLI installieren
npm install -g netlify-cli

# Lokal starten (mit Functions + Identity)
netlify dev
```

Der lokale Dev-Server läuft dann auf `http://localhost:8888`.
