# Brainstormsessie IDEEËN: GitHub PR Comment Aggregator

## 1. Context & Visie
Dit project is een lichtgewicht, lokaal gehoste (Proxmox LXC) tool. Het primaire doel is het efficiënt aggregeren van bot-comments op GitHub Pull Requests. De visie is om de output van deze tool zo te optimaliseren en automatiseren dat **jouw AI-agents, die meelezen in de GitHub PR-chat**, perfect gestructureerde data, heldere context en eventueel sturende commando's ontvangen. De tool communiceert niet direct via API's of webhooks naar de agents; de GitHub comment sectie is de enige en centrale communicatielaag.

---

## 2. 25 Ideeën tot Uitbreiding 

Hieronder volgt de lijst met 25 concrete opties om de output en werking van de aggregator naar het volgende niveau te tillen.

### Categorie A: Optimalisatie van Comments voor AI-Agents (Data Structuur) [/]
*Ideeën om de geaggregeerde posts perfect leesbaar en bruikbaar te maken voor AI's in de GitHub chat.*

**1. JSON-Injectie in Markdown Comments**
- **Wat:** Verstop een onzichtbaar of opvouwbaar JSON-blok (tussen `<!-- -->` of in een `<details>` tag) in de geaggregeerde comment met de gestructureerde ruwe data van alle bots.
- **Waarom:** AI-agents kunnen JSON feilloos parsen. Zo krijgen ze niet alleen de menselijke tekst, maar ook gestructureerde foutcodes, line-nummers en tool-namen in een voorspelbaar formaat.

**2. Standaardiseren via een AI-Prompt Header**
- **Wat:** Plaats bovenaan de geaggregeerde comment een vaste instructie of "system prompt" gericht aan de luisterende AI. Bijv: *"@ai-agent, analyseer de onderstaande samengevoegde feedback en stel direct een fix voor."*
- **Waarom:** Automatiseert de trigger voor je AI-agent; de agent weet precies wat er van hem verwacht wordt zodra de tool post.

**3. Actie-Tags & Commando's per Bot-Fout**
- **Wat:** De aggregator voegt specifieke tags toe aan de output, afhankelijk van welke tool iets meldt. Bijv. bij linter errors voegt het `[ACTION: FIX_LINT]` toe, bij security issues `[ACTION: SEC_REVIEW]`.
- **Waarom:** Dit maakt het voor jouw AI-agent heel makkelijk om de feedback te routeren of specifieke gedragingen te activeren op basis van simpele tekst-tags.

**4. Dynamische Template Builder (UI)**
- **Wat:** Maak een beheerpagina in de UI waarin je het Markdown-sjabloon van de output volledig kunt samenstellen met variabelen zoals `{{bot_name}}`, `{{file_path}}`, `{{error_code}}`.
- **Waarom:** Zo kun je de output finetunen op precies dat formaat dat jouw specifieke AI-agent het beste begrijpt, zonder in de code te hoeven duiken.

**5. Bestand- en Context-Mapping**
- **Wat:** Als een bot-comment betrekking heeft op een specifiek bestand (bijv. `src/utils.ts`), laat de aggregator dan automatisch bovenaan het blok de absolute padnaam en wellicht een link naar de diff in GitHub genereren.
- **Waarom:** AI-agents in de PR-chat hebben vaak de exacte bestandslocatie nodig om goede suggesties of auto-fixes te genereren.

### Categorie B: Geavanceerde Filtering & Deduplicatie (Ruis Verminderen)
*Voorkomen dat AI-agents in de war raken door dubbele of nutteloze informatie.*

**6. Strikte Inhoudelijke Deduplicatie**
- **Wat:** De aggregator controleert of twee verschillende CI-tools (bijv. ESLint en Prettier) klagen over exact dezelfde regel en dezelfde fout, en voegt deze samen tot één punt.
- **Waarom:** Dubbele meldingen in de chat vervuilen de context window van je AI-agents en kunnen leiden tot verwarrende of dubbele fixes.

**7. "No Action Needed" Filtering**
- **Wat:** Stel Regex-regels in per target bot om comments zoals *"Coverage did not change"* of *"0 vulnerabilities found"* volledig eruit te filteren en niet te aggregeren.
- **Waarom:** Het bespaart tokens en contextruimte voor de AI-agent als louter succes-berichten worden achtergehouden.

**8. Prioritering en Sortering van Feedback**
- **Wat:** De tool sorteert de geaggregeerde comments voordat deze gepost worden. Bijvoorbeeld: Security-waarschuwingen (Dependabot/Snyk) bovenaan, daarna Type-errors, daarna linter-warnings.
- **Waarom:** AI-agents schenken vaak meer aandacht aan de bovenste delen van een prompt. Belangrijke fixes worden zo sneller opgepakt.

**9. Verbergen/Resolven van Originele Bot Comments**
- **Wat:** Zodra de geaggregeerde comment geplaatst is, gebruikt de tool de GitHub GraphQL API om de originele, losse bot comments dicht te klappen (Minimize as "Resolved").
- **Waarom:** Dit voorkomt dat de AI-agent de feedback dubbel leest (één keer los, één keer in de aggregatie) tijdens het scannen van de PR-tijdlijn.

**10. "Diff" Extractie uit Comments**
- **Wat:** Als een originele bot-comment een voorgestelde code-diff bevat (in markdown codeblocks), zorgt de aggregator dat deze codeblocks extra goed worden geïsoleerd en gemarkeerd in de samenvatting.
- **Waarom:** AI-agents kunnen deze code-diffs dan direct overnemen of evalueren zonder de opmaak te verliezen.

### Categorie C: Gebruikerservaring & Workflow (UI / UX)
*Makkelijker beheer van de aggregator op je Proxmox LXC.*

**11. Handmatige "Aggregate Now" Knop per PR**
- **Wat:** Een dashboard in de UI waar je openstaande PR's ziet, met een knop om direct, zonder wachten, de aggregatie te forceren.
- **Waarom:** Soms heb je de AI-agent direct nodig en wil je niet wachten op de geconfigureerde "Batch Delay".

**12. "Dry Run" / Preview Modus**
- **Wat:** Een toggle in de UI waarmee je de tool kunt laten proefdraaien: de tool toont in het dashboard hoe de geaggregeerde post eruit zou zien, zonder hem daadwerkelijk op GitHub te plaatsen.
- **Waarom:** Ideaal om je Markdown-templates en JSON-injecties te testen en te kijken hoe een AI-agent daarop zou reageren, zonder PR's te spammen.

**13. Historisch Archief in het Dashboard**
- **Wat:** Een logboek in de UI waar je alle samengevoegde berichten uit het verleden kunt teruglezen, inclusief een status of de AI-agent erop heeft geantwoord (indien te detecteren).
- **Waarom:** Handig om te debuggen waarom een AI-agent een bepaalde instructie uit een eerdere comment niet begreep.

**14. Visuele Status Indicators per Repository**
- **Wat:** Een groen/rood icoon op de `/repositories` pagina die toont of de verbinding met GitHub voor die specifieke repo succesvol is (validatie van repo-naam en toegangsrechten).
- **Waarom:** Voorkomt "stil falen" als je een typfout maakt in de repo naam.

**15. Volledige Dark Mode Interface**
- **Wat:** Voeg `dark:` varianten toe in Tailwind voor het volledige Next.js dashboard.
- **Waarom:** Biedt een veel prettigere beheeromgeving, passend bij de meeste development setups.

### Categorie D: Timing, Repositories & Flexibiliteit
*Meer controle over wanneer en waar comments worden verzameld.*

**16. Dynamische Batch Delays per Repo**
- **Wat:** Laat het veld "Batch Delay" (hoe lang de tool wacht op comments) instelbaar zijn per specifieke repository.
- **Waarom:** Een grote monorepo heeft misschien CI pipelines die 15 minuten duren, terwijl een kleine repo in 2 minuten klaar is. Dit zorgt dat de AI-agent op het juiste moment getriggerd wordt.

**17. Branch-Specifieke Aggregatie (Whitelisting)**
- **Wat:** Voeg instellingen toe om de tool alleen te laten werken op specifieke branches, bijvoorbeeld alleen op PR's gericht naar `main` of `develop`.
- **Waarom:** Voorkomt onnodige activering van AI-agents (die wellicht duur zijn in API kosten) op tijdelijke WIP- of experimentele branches.

**18. Specifieke Target-Branches (Blacklisting)**
- **Wat:** De mogelijkheid om bepaalde branches (zoals `gh-pages` of geautomatiseerde release-branches) volledig uit te sluiten van comment aggregatie.
- **Waarom:** Voorkomt spam en onnodige verwerkingstijd.

**19. Multi-Account Ondersteuning**
- **Wat:** Voeg de mogelijkheid toe om meerdere GitHub Personal Access Tokens in te stellen en wijs per repository een token (identiteit) toe.
- **Waarom:** Zo kan de ene AI-agent getriggerd worden onder naam A op repo X, en een andere onder naam B op repo Y.

**20. Update van Bestaande Aggregaties (Samenvoegen i.p.v. Nieuwe Posts)**
- **Wat:** Als er binnen een lopende sessie wéér een trage bot comment binnenkomt, maakt de tool geen tweede verzamelbericht, maar bewerkt hij via de API het eerste bericht en voegt de nieuwe info toe.
- **Waarom:** Houdt de GitHub chat extreem schoon; de AI-agent hoeft maar naar 1 "master" bericht te kijken in plaats van versnipperde posts.

### Categorie E: Architectuur & Betrouwbaarheid (DevOps)
*Verbeteringen voor langdurig en stabiel gebruik op Proxmox.*

**21. Ontvangen van GitHub Webhooks (Event-driven)**
- **Wat:** Ontwikkel een `/api/webhooks` endpoint in Next.js om pushberichten van GitHub op te vangen zodra een bot comment.
- **Waarom:** Pollen (elke minuut checken) is inefficiënt en vreet GitHub API limieten op. Webhooks maken het proces instant en limiet-vrij.

**22. Rate Limit Bewaking (Auto-Pauze)**
- **Wat:** Lees de `x-ratelimit-remaining` headers van GitHub API calls uit. Als deze te laag worden, pauzeert de worker tijdelijk en toont een waarschuwing in het UI dashboard.
- **Waarom:** Voorkomt dat je LXC-IP of GitHub token tijdelijk geblokkeerd wordt door te agressief te pollen.

**23. Database Auto-Pruning Systeem**
- **Wat:** Een ingebouwde cronjob of worker-taak die oude `ProcessedComment` records in de SQLite database (ouder dan bijv. 60 dagen) automatisch weggooit.
- **Waarom:** Cruciaal voor een hobby-tool op een LXC container; dit voorkomt dat de lokale opslag volloopt en de database langzaam wordt.

**24. Gecentraliseerde File-based Logging**
- **Wat:** Implementeer `winston` of `pino` om errors niet alleen naar de console te sturen, maar ook roterend op te slaan in `.log` bestanden op de schijf.
- **Waarom:** Biedt je de mogelijkheid om achteraf te debuggen waarom een bepaalde bot comment niet is geaggregeerd, zonder de live console in de gaten te hoeven houden.

**25. Docker & Docker Compose Ondersteuning**
- **Wat:** Voeg een `Dockerfile` en `docker-compose.yml` toe met de juiste Node.js en SQLite configuratie.
- **Waarom:** Maakt de installatie op je Proxmox veel robuuster en reproduceerbaar, onafhankelijk van lokaal geïnstalleerde pakketten op de LXC.
