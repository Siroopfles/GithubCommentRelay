# Jules API Documentatie (v1alpha)

Hieronder vind je de volledige technische specificaties van de Jules API (v1alpha). Deze documentatie bevat de JSON-schema's, methoden en resource-definities zodat een AI-agent de API correct kan aanroepen.

## Algemene API Informatie

Deze metadata is belangrijk voor de context en de configuratie van API-calls:

*   **Base URL:** `https://jules.googleapis.com`
*   **Versie:** `v1alpha`
*   **Authenticatie:** OAuth 2.0 (Google Cloud scopes vereist). Gebruik de door Google geleverde client libraries voor de beste ondersteuning.
*   **Content-Type:** `application/json`
*   **Timestamp Formaat:** RFC 3339 (bijv. `2024-10-02T15:01:23Z`).
*   **Resource Naming:** Volgt het Google API design pattern (bijv. `sessions/{session_id}/activities/{activity_id}`).
*   **Pagination:** Bij `list` methoden kun je `pageSize` (max 100) en `pageToken` gebruiken om door resultaten te bladeren.
*   **Status:** Alpha. De API is experimenteel, specificaties en definities kunnen veranderen.

---

## 1. Resource: Session (`v1alpha.sessions`)

Dit is de hoofdresource voor interactie met Jules. Een sessie is een doorlopende werkeenheid binnen een specifieke context (vergelijkbaar met een chat-sessie).

### Methoden

| Methode | HTTP Request | Beschrijving |
| :--- | :--- | :--- |
| **Create** | `POST /v1alpha/sessions` | Maakt een nieuwe sessie aan. Vereist een prompt en sourceContext. |
| **Get** | `GET /v1alpha/{name=sessions/*}` | Haalt details op van een specifieke sessie. |
| **List** | `GET /v1alpha/sessions` | Geeft een lijst van alle sessies. |
| **SendMessage** | `POST /v1alpha/{session=sessions/*}:sendMessage` | Stuurt een nieuw bericht/prompt van de gebruiker naar een bestaande sessie. Body: `{ "prompt": "string" }` |
| **ApprovePlan** | `POST /v1alpha/{session=sessions/*}:approvePlan` | Keurt een door de agent gegenereerd plan goed. Body: `{ "planId": "string" }` |

### JSON Schema

```json
{
  "name": "string",
  "id": "string",
  "prompt": "string",
  "sourceContext": {
    "source": "string",
    "revision": "string"
  },
  "requirePlanApproval": "boolean",
  "state": "enum (State)", // STATE_UNSPECIFIED, ACTIVE, COMPLETED, FAILED, CANCELLED
  "createTime": "string (Timestamp)",
  "updateTime": "string (Timestamp)",
  "url": "string" // URL om de sessie in de web-app te bekijken
}
```

---

## 2. Resource: Activity (`v1alpha.sessions.activities`)

Een activiteit is een individuele actie of gebeurtenis binnen een sessie. Dit houdt de voortgang en acties binnen de sessie bij.

### Methoden

| Methode | HTTP Request | Beschrijving |
| :--- | :--- | :--- |
| **List** | `GET /v1alpha/{parent=sessions/*}/activities` | Lijst van alle activiteiten binnen een specifieke sessie. |
| **Get** | `GET /v1alpha/{name=sessions/*/activities/*}` | Haalt details op van één specifieke activiteit. |

### JSON Schema

```json
{
  "name": "string",
  "id": "string",
  "description": "string",
  "createTime": "string (Timestamp)",
  "originator": "string", // bijv. "user", "agent", "system"
  "artifacts": [ { "object (Artifact)" } ],

  // Union field: activity kan slechts één van de volgende zijn:
  "agentMessaged": {
    "agentMessage": "string"
  },
  "userMessaged": {
    "userMessage": "string"
  },
  "planGenerated": {
    "plan": {
      "id": "string",
      "steps": [
        {
          "id": "string",
          "title": "string",
          "description": "string",
          "index": "integer"
        }
      ],
      "createTime": "string (Timestamp)"
    }
  },
  "planApproved": {
    "planId": "string"
  },
  "progressUpdated": {
    "title": "string",
    "description": "string"
  },
  "sessionCompleted": {},
  "sessionFailed": {
    "reason": "string"
  }
}
```

---

## 3. Resource: Artifact

Artifacten zijn de resultaten die door een activiteit worden geproduceerd (zoals code wijzigingen of bash output).

### JSON Schema

```json
{
  // Union field: content kan slechts één van de volgende zijn:
  "changeSet": {
    "source": "string", // Formaat: sources/{source}
    "gitPatch": {
      "unidiffPatch": "string",
      "baseCommitId": "string",
      "suggestedCommitMessage": "string"
    }
  },
  "media": {
    "data": "string (bytes/base64)",
    "mimeType": "string"
  },
  "bashOutput": {
    "command": "string",
    "output": "string",
    "exitCode": "integer"
  }
}
```

---

## 4. Resource: Source (`v1alpha.sources`)

Bronnen representeren de codebases (repositories) waar Jules mee kan werken. Let op: De Jules GitHub-app moet eerst geïnstalleerd zijn via de Jules web-app.

### Methoden

| Methode | HTTP Request | Beschrijving |
| :--- | :--- | :--- |
| **List** | `GET /v1alpha/sources` | Lijst van beschikbare bronnen. Ondersteunt filtering op naam. |
| **Get** | `GET /v1alpha/{name=sources/**}` | Haalt details op van een specifieke bron. |

### JSON Schema

```json
{
  "name": "string",
  "displayName": "string",
  "uri": "string"
}
```
