# WeekFlow – Eine Projektarbeit über Netlify

Ein persönlicher Wochenplaner mit Task-Management, Wetter-Widget und Nutzer-Login,
entwickelt und gehostet auf [Netlify](https://www.netlify.com), um das Werbeversprechen
"besonders einfache Entwicklung ohne großen Deployment-Aufwand" praktisch zu überprüfen.

---

## Inhaltsverzeichnis

1. [Was ist Netlify?](#1-was-ist-netlify)
2. [Projektidee und Funktionsumfang](#2-projektidee-und-funktionsumfang)
3. [Technischer Aufbau](#3-technischer-aufbau)
4. [Genutzte Netlify-Features im Detail](#4-genutzte-netlify-features-im-detail)
5. [Entwicklungsprozess und aufgetretene Probleme](#5-entwicklungsprozess-und-aufgetretene-probleme)
6. [Bewertung: Hält das Werbeversprechen stand?](#6-bewertung-hält-das-werbeversprechen-stand)
7. [Vendor Lock-in: Bindet man sich an Netlify?](#7-vendor-lock-in-bindet-man-sich-an-netlify)
8. [Fazit](#8-fazit)

---

## 1. Was ist Netlify?

Netlify ist eine Cloud-Plattform für die Entwicklung und das Hosting von Web-Anwendungen,
gegründet 2014 und bekannt dafür, den modernen "Git-zu-Live-Deployment"-Workflow
maßgeblich geprägt zu haben: Code wird in ein Git-Repository (z. B. GitHub) gepusht,
Netlify erkennt die Änderung automatisch, baut das Projekt und veröffentlicht es –
ganz ohne eigenen Server, ohne manuelle Konfiguration von Webspace oder FTP-Zugängen.

Ursprünglich war Netlify vor allem für **statische Websites** (HTML/CSS/JS, sogenannte
"Jamstack"-Anwendungen) bekannt. Mittlerweile positioniert sich die Plattform breiter
als "All-in-one-Plattform" für moderne Web-Apps und bewirbt sich zunehmend auch als
"AI-native" Plattform, auf der KI-Coding-Agenten direkt Code schreiben und deployen
können sollen.

Neben dem reinen Hosting bietet Netlify eine Reihe ergänzender Dienste an, die
typischerweise sonst einen eigenen Server oder Drittanbieter erfordern würden:

- **Serverless Functions** – kleine Backend-Funktionen, die bei Bedarf ausgeführt werden
- **Identity** – fertiges Nutzer-Login-System ohne eigene Authentifizierungs-Logik
- **Blobs** – ein einfacher Cloud-Speicher (Key-Value-Store)
- **Forms** – Formular-Auswertung ohne eigenes Backend
- **Deploy Previews** – automatische Vorschau-URLs für jeden Branch/Pull-Request
- **Edge Functions** – Code, der näher am Nutzer ausgeführt wird (geringere Latenz)

Das Geschäftsmodell ist Freemium: Der kostenlose "Starter"-Plan umfasst 100 GB
Bandbreite, 300 Build-Minuten und 125.000 Function-Aufrufe pro Monat – für ein
Projekt wie dieses vollkommen ausreichend.

---

## 2. Projektidee und Funktionsumfang

**WeekFlow** ist ein persönlicher Wochenplaner mit drei Kernbereichen:

| Bereich | Funktion |
|---|---|
| 📅 **Woche** | Kalenderansicht mit Navigation zwischen Wochen; Aufgaben werden automatisch dem richtigen Tag zugeordnet (nach Wochentag oder konkretem Fälligkeitsdatum) |
| ✅ **Aufgaben** | Klassisches Task-Management: erstellen, bearbeiten, löschen, als erledigt markieren, nach Priorität und Status filtern |
| 🌤️ **Wetter** | Aktuelles Wetter und 3-Tage-Vorschau für eine frei wählbare Stadt |

Zusätzlich verfügt die App über einen **Login-Bereich** (nur eingeloggte Nutzer sehen
ihre Aufgaben), **Cloud-Synchronisation** (Aufgaben sind auf allen Geräten gleich) sowie
einen **Dark Mode** und ein responsives Design für die mobile Nutzung.

Die Idee wurde bewusst so gewählt, dass möglichst viele unterschiedliche
Netlify-Funktionen sinnvoll zum Einsatz kommen – nicht nur reines Hosting, sondern auch
Backend-Logik, Authentifizierung und Datenspeicherung.

---

## 3. Technischer Aufbau

```
weekflow/
├── public/                    → Frontend (wird von Netlify gehostet)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── netlify/functions/         → Backend (Serverless Functions)
│   ├── tasks.js                 (Aufgaben laden/speichern via Netlify Blobs)
│   └── weather.js                (Proxy zur externen Wetter-API)
├── netlify.toml                → Konfigurationsdatei für Netlify
└── package.json                 → Node.js-Abhängigkeiten der Functions
```

Das Frontend ist bewusst ohne Framework (kein React/Vue) in reinem HTML, CSS und
JavaScript umgesetzt, um den Fokus auf die Netlify-Funktionen zu legen statt auf
Build-Tooling. Das Backend besteht aus zwei kleinen Node.js-Funktionen, die Netlify
automatisch als eigenständige, serverlose Endpunkte bereitstellt.

---

## 4. Genutzte Netlify-Features im Detail

### 4.1 Static Hosting + Continuous Deployment

Der `public`-Ordner wird automatisch gehostet. Jeder `git push` auf den `main`-Branch
löst einen neuen Build und ein automatisches Deployment aus – inklusive HTTPS via
Let's Encrypt, das Netlify automatisch bereitstellt. Es war zu keinem Zeitpunkt
nötig, sich mit Webserver-Konfiguration, SSL-Zertifikaten oder FTP zu beschäftigen.

### 4.2 Netlify Functions (Serverless Backend)

Zwei Functions übernehmen die Backend-Logik:

- **`weather.js`** ruft die externe Wetter-API (WeatherAPI.com) auf und reicht die
  Antwort an das Frontend weiter. Der Zweck dieses "Proxy"-Musters: Der API-Key bleibt
  serverseitig in einer Umgebungsvariable versteckt und wird nie im Browser sichtbar.
- **`tasks.js`** liest und schreibt die Aufgaben eines Nutzers in den Cloud-Speicher
  (siehe 4.4).

Beide Funktionen werden nicht dauerhaft betrieben, sondern bei jedem Aufruf des
Frontends "on demand" gestartet – ein typisches Serverless-Prinzip, bei dem man nicht
für ungenutzte Serverzeit bezahlt.

### 4.3 Netlify Identity (Nutzer-Login)

Identity ist Netlifys eingebautes Authentifizierungssystem. Es wird per einem
einzigen `<script>`-Tag eingebunden und stellt sofort ein fertiges
Login-/Registrierungs-Popup bereit – ganz ohne eigene Implementierung eines
Passwort-Hashing, einer Nutzer-Datenbank oder eines Session-Managements.

Nach erfolgreichem Login erhält der Browser ein **JWT (JSON Web Token)**, das die
Identität des Nutzers bestätigt. Dieses Token wird bei jeder Anfrage an die eigenen
Functions mitgeschickt (`Authorization: Bearer <token>`), wo die enthaltene
eindeutige Nutzer-ID ausgelesen wird, um Daten zuverlässig einer Person zuzuordnen.

Die komplette Nutzerverwaltung (Registrierung, Passwort-Reset, Nutzerliste) erfolgt
über das Netlify-Dashboard, ohne dass dafür Code geschrieben werden musste.

### 4.4 Netlify Blobs (Cloud-Speicher)

Blobs ist ein einfacher Key-Value-Speicher, vergleichbar mit einer simplen
NoSQL-Datenbank ohne festes Schema. In diesem Projekt wird er genutzt, um die
Aufgabenliste jedes Nutzers zu speichern – unter einem Schlüssel, der die jeweilige
Nutzer-ID enthält (`tasks-<userId>`), sodass jede Person ausschließlich ihre eigenen
Daten sieht.

Dadurch ist die App **geräteübergreifend synchron**: Eine auf dem Smartphone
angelegte Aufgabe erscheint nach dem Neuladen auch auf dem PC, da die Daten
zentral bei Netlify und nicht lokal im Browser liegen.

### 4.5 Environment Variables

Sensible Daten wie der API-Key der Wetter-API werden nicht im Code oder in der
`netlify.toml` hinterlegt (diese landen im öffentlich einsehbaren Git-Repository),
sondern als Umgebungsvariable im Netlify-Dashboard gespeichert und erst zur Laufzeit
in die Funktion eingespeist. Dies entspricht gängiger Sicherheitspraxis und wurde im
Projekt konsequent umgesetzt.

---

## 5. Entwicklungsprozess und aufgetretene Probleme

Im Sinne einer ehrlichen Bewertung gehört auch dazu, dass die Entwicklung **nicht
durchgehend reibungslos** verlief. Folgende Probleme traten konkret auf:

| Problem | Ursache | Lösung |
|---|---|---|
| Build schlug fehl: `Cannot find module '@netlify/blobs'` | Abhängigkeit war nicht in der `package.json` deklariert | Dependency ergänzt und `npm install` als Build-Befehl gesetzt |
| `MissingBlobsEnvironmentError` zur Laufzeit | Veraltete Syntax verwendet (`require`/`exports.handler` statt `import`/`export default`) | Function nach aktueller Netlify-Dokumentation auf ES-Module-Syntax umgestellt |
| `Failed to load settings from /.netlify/identity` | Identity war im Dashboard noch nicht vollständig aktiviert bzw. Seite war nicht neu deployt | Identity-Konfiguration geprüft, erneutes Deployment ausgelöst |
| Aufgaben synchronisierten nicht zwischen Geräten | Anfangs wurde nur `localStorage` im Browser genutzt statt eines Cloud-Speichers | Umstellung auf Netlify Blobs mit JWT-basierter Nutzerzuordnung |

Diese Probleme zeigen: Die **grundlegende** Inbetriebnahme (Hosting, erster Build,
erste Function) war tatsächlich in wenigen Minuten erledigt. Sobald jedoch
fortgeschrittenere Features wie Blobs mit Authentifizierung kombiniert wurden, war
die Dokumentation an einigen Stellen uneindeutig bzw. es existierten zwei
unterschiedliche, nicht klar gekennzeichnete Function-Syntaxen (älteres
CommonJS-Format vs. neueres ES-Module-Format), was zu Fehlversuchen führte, bis die
korrekte, aktuelle Schreibweise identifiziert wurde.

---

## 6. Bewertung: Hält das Werbeversprechen stand?

Die Ausgangsfrage der Projektarbeit war, ob Netlifys Versprechen einer "besonders
einfachen Entwicklung" der Realität standhält. Differenzierte Antwort:

**Für reines Hosting und CI/CD: ja, uneingeschränkt.** Das Verbinden eines
GitHub-Repositorys, der erste Build und das automatische Deployment bei jedem Push
funktionierten ohne Komplikationen und tatsächlich innerhalb weniger Minuten. Dieser
Teil des Versprechens ist absolut zutreffend und macht Netlify gerade für
Einsteiger:innen attraktiv.

**Für einfache Serverless Functions (z. B. den Wetter-Proxy): größtenteils ja.**
Eine einzelne, zustandslose Funktion ohne Authentifizierung war schnell und
unkompliziert umgesetzt.

**Für komplexere Kombinationen (Identity + Blobs zusammen): nein, nicht ohne
Weiteres.** Hier zeigte sich die größte Diskrepanz zwischen Versprechen und Realität:
Mehrere Build- und Laufzeitfehler waren nötig, bis die korrekte Kombination aus
Function-Syntax, Authentifizierungs-Header und Speicher-API gefunden war. Die
Dokumentation deckt zwar jedes Feature einzeln gut ab, doch das **Zusammenspiel**
mehrerer fortgeschrittener Features ist weniger gut dokumentiert, was die
Fehlersuche erschwerte.

**Fazit zu dieser Frage:** Das Werbeversprechen stimmt für den Einstieg und für
einfache Use Cases sehr genau. Je tiefer man jedoch in die "Komfort-Features"
eintaucht, desto mehr nähert man sich normaler Backend-Entwicklung mit den
üblichen Stolpersteinen an – die Einsparung an Komplexität ist real, aber nicht
unbegrenzt.

---

## 7. Vendor Lock-in: Bindet man sich an Netlify?

Auch diese Frage lässt sich nicht pauschal beantworten, sondern hängt davon ab,
welche Features man konkret nutzt:

| Feature | Lock-in-Grad | Begründung |
|---|---|---|
| Static Hosting | Niedrig | Jeder Static-Host (Vercel, Cloudflare Pages, GitHub Pages) kann das identisch |
| CI/CD via Git | Niedrig | Standardkonzept, von praktisch allen modernen Hostern angeboten |
| Netlify Functions | Mittel | Der Code selbst ist Standard-Node.js und ließe sich mit geringem Aufwand auf AWS Lambda oder Vercel Functions portieren; lediglich Importpfad und Handler-Format unterscheiden sich leicht |
| Environment Variables | Niedrig | Konzept existiert bei jedem Anbieter, nur die Verwaltungsoberfläche unterscheidet sich |
| **Netlify Identity** | **Hoch** | Das komplette Login-Widget und der Authentifizierungs-Flow sind proprietär. Ein Wechsel würde eine vollständige Neuimplementierung mit einem anderen Anbieter (z. B. Auth0, Supabase Auth, Firebase Auth) erfordern |
| **Netlify Blobs** | **Hoch** | Die Speicher-API (`getStore`, `setJSON`) existiert ausschließlich innerhalb der Netlify-Umgebung; eine Migration würde den Wechsel auf eine portable Datenbank (z. B. PostgreSQL, MongoDB, Supabase) erfordern |

In diesem Projekt wurde **bewusst** sowohl Identity als auch Blobs eingesetzt, um
genau diesen Aspekt in der Praxis untersuchen zu können. Das Ergebnis: Der Großteil
des Codes (das gesamte Frontend sowie die reine Logik innerhalb der Functions) ist
ohne Änderung portabel. Der Login-Flow und die Datenspeicherung sind hingegen eng an
Netlify gebunden und müssten bei einem Anbieterwechsel neu geschrieben werden.

---

## 8. Fazit

Netlify hält sein Versprechen der einfachen Entwicklung für den größten Teil
typischer Anwendungsfälle ein, insbesondere für das Grundgerüst aus Hosting, CI/CD
und einzelnen Serverless Functions. Mit Grundkenntnissen in HTML/CSS/JavaScript war
es möglich, **innerhalb weniger Tage** eine vollständige Web-App mit Login,
Cloud-Speicher, eigenem Backend und Anbindung an eine externe API umzusetzen – ein
Vorhaben, das ohne eine Plattform wie Netlify deutlich mehr Infrastruktur-Wissen
(Server-Setup, Datenbank-Hosting, SSL-Konfiguration) erfordert hätte.

Gleichzeitig zeigte sich, dass insbesondere die fortgeschritteneren,
Netlify-exklusiven Features (Identity, Blobs) sowohl bei der Inbetriebnahme mehr
Fehlerquellen mit sich bringen als reines Hosting, als auch einen spürbaren
Vendor-Lock-in erzeugen. Wer eine Anwendung dauerhaft plattformunabhängig halten
möchte, sollte diese Komfort-Features bewusst vermeiden oder zumindest die
Architektur so gestalten, dass sie austauschbar bleiben (z. B. Authentifizierung
und Datenspeicherung hinter einer eigenen, abstrahierten Schnittstelle kapseln).

Für kleine bis mittlere Projekte, Prototypen und Lernzwecke – wie im Rahmen dieser
Projektarbeit – ist Netlify eine geeignete und tatsächlich sehr zugängliche Wahl.

---

## Setup-Anleitung

### Voraussetzungen
- Kostenloser Account bei [netlify.com](https://netlify.com)
- Kostenloser Account bei [weatherapi.com](https://www.weatherapi.com) für den API-Key
- Git und ein GitHub-Repository

### Schritte
1. Repository mit Netlify verbinden: **Add new site → Import an existing project**
2. **Site settings → Identity → Enable Identity** aktivieren
3. **Site settings → Environment variables** → `WEATHER_API_KEY` mit eigenem Key eintragen
4. Erneutes Deployment auslösen (**Trigger deploy**)

Nach dem Deployment ist die App unter der von Netlify vergebenen `*.netlify.app`-URL
erreichbar.

---

## Verwendete Technologien

- **Frontend:** HTML5, CSS3 (eigenes Design-System mit CSS-Variablen, Dark Mode),
  Vanilla JavaScript (keine Frameworks)
- **Backend:** Netlify Functions (Node.js, ES Modules)
- **Authentifizierung:** Netlify Identity (JWT-basiert)
- **Datenspeicherung:** Netlify Blobs
- **Externe API:** WeatherAPI.com