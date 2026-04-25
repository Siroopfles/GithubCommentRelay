const fs = require('fs');
const path = require('path');

const journalPath = path.join(__dirname, 'JOURNAL.md');
let journal = fs.readFileSync(journalPath, 'utf8');

const newEntry = `
## Sessie: Categorie K & Visual Rule Builder
**Datum:** \`2024-04-25\`

### Wat we hebben bereikt
1. **Compact Mode (Idee 54):** Een React Context (\`CompactModeContext\`) gecreëerd en een toggle toegevoegd in de zijbalk die \`localStorage\` gebruikt. Door de hele app CSS styling toegepast om de UI in te klappen.
2. **Import / Export (Idee 51):** API routes gemaakt (\`/api/system/export\` en \`/import\`) om instellingen, repositories, reviewers, en bot mappings the importeren en exporteren. Een UI paneel in de "Settings" pagina met checkboxes gebouwd om gedeeltelijke/volledige imports mogelijk te maken.
3. **Repository Mappen/Groepen (Idee 53):** \`groupName\` veld toegevoegd aan het \`Repository\` schema, formulieren uitgebreid en de repository overzichtspagina verdeeld in uitklapbare secties per groep.
4. **Markdown Template Builder (Idee 52):** \`TemplateBuilder\` component gemaakt ter vervanging van de standaard tekstvelden voor markdown sjablonen. Het ondersteunt nu knoppen om simpel variabelen als \`{{bot_name}}\` in de tekst in te voegen.
5. **Settings Audit Log (Idee 55):** Database schema uitgebreid met \`AuditLog\`. Systeem registreert wijzigingen zoals 'UPDATE_SETTINGS' en 'IMPORT_CONFIG'. De logboekgeschiedenis is nu inzichtelijk gemaakt via een nieuw tabblad in de Settings weergave.
6. **Visual Chat Filter Builder (Nieuw IDEE):** Een nieuwe pagina toegevoegd in \`/logs/chat\`. Deze tool laat rauwe PR-comments zien in een interactieve feed. Door simpelweg tekst de highlighten met de muis kan een gebruiker direct een ignore regel (RegExp) aanmaken via een pop-up dialog.

### Volgende stappen
- Integreren van AI LLM verzoeken met de geëxporteerde prompt structuren en het uittesten van Categorie J of de andere openstaande ideeën.

---
`;

fs.writeFileSync(journalPath, journal + newEntry);
console.log('Journal updated');
