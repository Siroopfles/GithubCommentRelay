# Brainstormsessie IDEEËN: GitHub PR Comment Aggregator

## 1. Context & Visie
Dit project is een lichtgewicht, lokaal gehoste (Proxmox LXC) tool. Het primaire doel is het efficiënt aggregeren van bot-comments op GitHub Pull Requests. De toekomstige visie is om deze applicatie te laten fungeren als een centrale "hub" die naadloos samenwerkt met je lokaal gehoste AI-agents. De AI-agents moeten via dit systeem informatie kunnen ophalen en acties kunnen triggeren. Let op: Externe of zware, gehoste LLM's worden niet direct in deze tool geïntegreerd, aangezien alles lokaal en behapbaar moet blijven.

---

## 2. 25 Ideeën tot Uitbreiding

Hieronder volgt de lijst met 25 concrete opties om het project naar het volgende niveau te tillen. Elk idee is volledig zelfstandig uitgewerkt en kan door een autonome developer (of AI developer) als losse feature-branch worden opgepakt.

### Categorie A: AI Agent Integraties & Data Connectivity
*Focus op het faciliteren van data en acties voor je lokale AI-agents.*

**1. Lokale Webhook Push (Event Broadcaster)**
- **Wat:** Bij specifieke GitHub-events (bijv. een nieuwe PR of een verzonden batch aan comments), verstuurt deze tool direct een POST-request naar een geconfigureerde lokale URL (bijv. de luisterpoort van je AI-agent).
- **Waarom:** Dit haalt de last van het pollen weg bij je agents en zorgt voor real-time triggers.

**2. REST API voor Agent-Status (Lezen)**
- **Wat:** Ontwikkel specifieke, simpele endpoints zoals `GET /api/agents/prs/active` of `GET /api/agents/metrics`.
- **Waarom:** Je agents hebben hierdoor een gestructureerde (JSON) manier om de huidige status van openstaande pull requests en geaggregeerde comments op te vragen, zonder scraping te hoeven toepassen.

**3. REST API voor Agent-Acties (Schrijven)**
- **Wat:** Ontwikkel een beveiligd endpoint (bijv. `POST /api/agents/action`) waarmee een lokaal netwerk-device een opdracht kan sturen naar dit project, zoals "Plaats een specifiek bericht op PR #15".
- **Waarom:** Dit project wordt daarmee de exclusieve beheerder van de GitHub Token, en agents sturen hun GitHub-acties simpelweg door via deze tool.

**4. MQTT Broker Koppeling**
- **Wat:** Verbind het project met een lokale MQTT broker (bijv. Eclipse Mosquitto) op je Proxmox/netwerk. De tool publiceert topics zoals `home/github/pr/new_comment`.
- **Waarom:** Zeer efficiënt voor IoT- of Home Assistant-integraties. Je agents kunnen op deze topics abonneren in plaats van te luisteren naar HTTP-webhooks.

**5. Historische Data-Dump via API**
- **Wat:** Maak een tool/cronjob die de SQLite-database (met alle `ProcessedComment` records) exporteert als schoon JSON- of CSV-bestand naar een gedeelde lokale directory.
- **Waarom:** Ideaal voor AI-agents die met Retrieval-Augmented Generation (RAG) werken en lokaal historische bot-beslissingen willen bestuderen zonder direct de SQLite DB te locken.

**6. Integratie met Lokale Notificatiediensten**
- **Wat:** Voeg koppelingen toe voor ntfy, Gotify of een lokale Discord-webhook, die getriggerd worden bij fouten of succesvolle aggregaties.
- **Waarom:** Je agents of jijzelf kunnen direct via een lokale chat op de hoogte blijven van het worker-proces.

### Categorie B: User Experience (UI / UX)
*Focus op een comfortabeler lokaal beheer en snellere inzichten.*

**7. Live Worker Logs in de Browser (WebSockets / SSE)**
- **Wat:** Stream de `console.log` output van `worker.ts` via Server-Sent Events (SSE) direct naar een terminal-widget op het webdashboard.
- **Waarom:** Het bespaart je het openen van de Proxmox shell via SSH. Fouten zijn direct zichtbaar.

**8. Handmatige "Sync Nu" Functionaliteit**
- **Wat:** Voeg een prominente knop toe in het menu om onmiddellijk `processRepositories()` uit te voeren.
- **Waarom:** Soms wil je direct zien of een zojuist gemergde of aangemaakte PR wordt opgepakt, zonder op de ingestelde polling-timer te moeten wachten.

**9. Volledige Dark Mode (Tailwind)**
- **Wat:** Implementeer `dark:` classes en een globale state (of `next-themes`) om de UI om te schakelen naar een donker thema.
- **Waarom:** Zorgt voor een modernere uitstraling en is prettiger bij gebruik in combinatie met andere development tools.

**10. Interactieve GitHub Token Tester**
- **Wat:** Een knop in de Settings UI genaamd "Test Token", die een kleine call doet naar de GitHub API (`/user`) om rechten (scopes) te verifiëren.
- **Waarom:** Voorkomt het zogenaamde "stille falen". Je ziet direct in de UI in plaats van in de worker logs of de opgegeven token de juiste rechten heeft.

**11. Visuele Status per Repository**
- **Wat:** Breid de `/repositories` pagina uit met metadata: "Laatst gecheckt: 5 minuten geleden" en een gekleurd bolletje (Groen/Rood) dat de API-status van die specifieke repo aangeeft.
- **Waarom:** Geeft direct visueel vertrouwen dat het systeem goed configureerd is per repository.

**12. Historische Viewer in UI (Gearchiveerde Comments)**
- **Wat:** Maak een nieuwe tab in het dashboard ("History") waar je alle succesvol samengevoegde berichten inclusief de originele auteur(s) kunt teruglezen en doorzoeken.
- **Waarom:** Biedt controle en inzicht, mocht je willen weten wat bots maanden geleden precies rapporteerden.

### Categorie C: Geavanceerde Bot & Comment Logica
*Verbeteringen aan de manier waarop GitHub-data wordt verwerkt.*

**13. Intelligente "Ignore" Woordenlijst (Regex Filtering)**
- **Wat:** Maak het mogelijk om per Bot (in de DB) keywords of regex in te stellen. Als de bot een bericht post met dat keyword (bijv. "No changes detected"), wordt deze volledig overgeslagen.
- **Waarom:** Zorgt voor veel schonere PR's door useless spam te negeren, in plaats van die spam te aggregeren.

**14. Inhoudelijke Deduplicatie van Bot Comments**
- **Wat:** Voordat het geaggregeerde bericht wordt gepost, controleert de logica of meerdere bots toevallig niet *exact* dezelfde tekst (of lint-fout) hebben gerapporteerd.
- **Waarom:** Soms triggeren meerdere lokaal geconfigureerde pipelines dezelfde fout. Deze deduplicatie logica (via simpele string similarity) voorkomt een dubbel opgemaakt overzicht.

**15. Automatisch "Minimizen" van Originele Comments**
- **Wat:** Nadat de bot het verzamelde bericht plaatst, gebruikt de worker de GitHub GraphQL API om de originele losse bot-berichten als "Resolved" of "Outdated" te verbergen in GitHub's UI.
- **Waarom:** Dit is de ultieme manier om de PR-tijdlijn schoon te maken. Nu staan zowel de losse comments als de samengevoegde comments in beeld.

**16. Aanpasbare Output Templates (Markdown)**
- **Wat:** Voeg een instellingenveld toe voor een Markdown-sjabloon (bijv. met Liquid tags of simpele string-vervangingen) voor het uiteindelijke verzamelbericht.
- **Waarom:** Zo kun je het aggregatie-bericht de branding/styling geven die jij prefereert (bijvoorbeeld als een mooie tabel in plaats van een lijst).

**17. Dynamische Delay per Repository of Bot**
- **Wat:** Zorg dat de "Batch Delay" niet één globaal getal is, maar dat je dit per repo of per tool kunt overrulen. (Bijv. Repo A heeft een traag CI systeem en wacht 15 min, Repo B wacht 2 min).
- **Waarom:** Veel fijnmazigere controle over de timing van de worker.

**18. Specifieke Branch Whitelisting**
- **Wat:** Voeg in de UI de mogelijkheid toe om aan te geven dat een Repo alleen comments hoeft te scannen als de Pull Request naar `main` of `develop` gaat.
- **Waarom:** Bespaart API requests voor kleine WIP/Draft test-branches.

**19. Meerdere Auteurs (Multi-Token Support)**
- **Wat:** De architectuur voorbereiden op meerdere users, zodat je een `Account` model aanmaakt en per Repo aangeeft welke token gebruikt moet worden om de uiteindelijke post te plaatsen.
- **Waarom:** Zeer waardevol als je dit project wilt scheiden tussen persoonlijke hobby repo's en professionele werkrepo's die verschillende identiteiten vereisen.

### Categorie D: Architectuur, Stabiliteit & DevOps
*Zekerheid inbouwen voor 24/7 lokale hosting.*

**20. Volledige Docker & Docker Compose Support**
- **Wat:** Voeg een geoptimaliseerde multistage `Dockerfile` en een `docker-compose.yml` toe.
- **Waarom:** Elimineert afhankelijkheden van LXC OS-packages (zoals specifieke node/PM2 versies) en maakt back-uppen van de SQLite volume kinderspel.

**21. Ontvangen van GitHub Webhooks (Event-driven Architecture)**
- **Wat:** Ontwikkel een API route `/api/webhooks/github` die Push/Comment events ontvangt direct van GitHub, als vervanging (of aanvulling) op het pollen elke 60 seconden.
- **Waarom:** Maakt de tool instant en verbruikt nagenoeg nul GitHub REST API rate limits. (Mits je LXC netwerk bereikbaar is voor GitHub via bijv. Cloudflare Tunnels).

**22. Rate Limit Bewaking (Auto-Pauze)**
- **Wat:** Voeg logica toe in `getOctokit` die de response header `x-ratelimit-remaining` uitleest. Zakt dit onder een kritieke grens (bijv. < 50), dan pauzeert de worker zichzelf voor een uur en toont hij dit luid in het Dashboard.
- **Waarom:** Voorkomt langdurige API bans vanuit GitHub.

**23. Database Auto-Pruning Systeem**
- **Wat:** Voeg logica toe in de worker die 1x per week draait om oude data (bijv. afgehandelde sessies en processedcomments ouder dan 60 dagen) fysiek uit de SQLite te verwijderen (`DELETE FROM`).
- **Waarom:** Dit is cruciaal voor een lokaal, set-and-forget systeem; het voorkomt dat de database na een jaar pijnlijk langzaam wordt of te veel LXC opslag kost.

**24. Gecentraliseerde File-Logging (Winston / Pino)**
- **Wat:** Vervang de simpele `console.log` met een gestructureerde logger (zoals `winston`), die fouten wegschrijft naar JSON-geformatteerde logfiles in een `./logs` map inclusief bestandsrotatie.
- **Waarom:** Hierdoor kunnen je AI-agents of andere monitoringstools op je Proxmox de error-logs veel eenvoudiger analyseren dan wanneer het vastzit in PM2 console output.

**25. Lokale Netwerk Toegangsbeveiliging (Basic Security)**
- **Wat:** Voeg Next.js Middleware toe voor het afschermen van de Admin/Settings endpoints door middel van een simpel vast wachtwoord (.env of database).
- **Waarom:** Zelfs op een lokaal netwerk wil je soms vermijden dat andere apparaten/gebruikers onbedoeld bij de ruwe GitHub token in de settings interface kunnen komen.
