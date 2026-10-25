---
review: currency
target: architecture-sola.md
reviewed: '2026-10-25'
lens: 'Är varje låst beslut webbkontrollerat eller verklighetsprövat, inte påstått ur minnet? Versioner, att tekniken finns och passar.'
---

# Granskning: aktualitet och verklighetsprövning

## Dom

Webbläsarbesluten (Navigation API, URLPattern) är webbkontrollerade och stämmer, men Node-golvet "22 LTS eller senare" är hämtat oprövat från `docs/design.md`. Det är för vagt för de Node-funktioner designen bygger på, och linjen går ur support om ungefär sex månader. Dessutom stämmer två påståenden inte med verkligheten: att appen kör under strikt CSP utan hash, och att SSE och cookies "bara fungerar". Ryggraden bör justeras på de punkterna innan bygget börjar.

## Metod

- Läste `architecture-sola.md`, `.memlog.md`, `docs/design.md`, `docs/user-stories.md` och `docs/exempelapp.md`.
- För varje låst beslut kontrollerade jag om `.memlog.md` har en `(version)`-post eller en källa. Bara en sådan post finns: rad 23, webbläsarstöd för Navigation API och URLPattern.
- Webbkontroll 2026-10-25 mot Node.js officiella releaseschema och API-dokumentation för v22 och v24. Webbläsarstöd hämtades från rådata i `web-platform-dx/web-features` och `mdn/browser-compat-data`. Övrigt kontrollerades mot MDN:s källtext (`mdn/content`), WHATWG HTML-specifikationen (källfilen) och RFC Editor.
  - caniuse.com, web.dev och developer.mozilla.org gick inte att nå via proxyn. Jag använde därför samma data från GitHub.
- Körde lokala prov med Node v22.22.0: `util.styleText`, `util.parseArgs`, `fs.glob`, rekursiv `fs.watch` på Linux, global `WebSocket`, typstrippning av `.ts`, `node:test` (snapshot, mock timers, coverage, module mocks) och subpath-importen `#sola` via `package.json` `imports`.

## Översikt: beslut mot kontroll

| Beslut | Kontrollerat i memlog? | Min kontroll | Status |
| --- | --- | --- | --- |
| Node "22 LTS eller senare" (Stack, AD-2) | Nej, taget från design.md | 22 är Maintenance LTS med EOL 2027-04-30. Funktionerna kräver 22.13–22.18. | **Fynd 1** |
| Navigation API, URLPattern, "Baseline 2026" (AD-12) | Ja (rad 23) | Stämmer. "Baseline 2026" är dock ett rörligt mål till 2026-12-31. | **Fynd 3** |
| Import map + `#sola` (AD-1, AD-3) | Nej | Import maps är Baseline Widely available sedan 2025-09-27. `#sola` är en giltig bar specifier i webbläsaren och fungerar i Node. Inline import map blockeras av strikt CSP. | OK / **Fynd 2** |
| Dynamisk `import()` (AD-10) | Nej | Baseline Widely available sedan 2022-07-15 | OK |
| RFC 9457 Problem Details (AD-6) | Nej | Proposed Standard sedan juli 2023, ersätter RFC 7807. Ingen efterträdare finns. | OK |
| SSE på `GET /api/events` (AD-6, AD-8) | Nej | EventSource är Baseline Widely available. Gränsen på 6 anslutningar över HTTP/1.1 är inte hanterad. | **Fynd 4** |
| HttpOnly-cookie (AD-7) | Nej | HttpOnly fungerar som avsett. SameSite och Secure är inte angivna, och Lax som standard finns bara i Chrome. | **Fynd 5** |
| `node:test`, `fs.watch`, `WebSocket`, typstrippning, `fs.glob`, `styleText`, `parseArgs` (design.md, refereras via `tools/`) | Nej | Alla finns i 22.22, men stabiliteten varierar | **Fynd 1, 6, 7** |

## Fynd

### Fynd 1 — Node-golvet är oprövat, för vagt och nära EOL [Hög]

**Var:** Stack-tabellen (`Node | 22 LTS eller senare`), `.memlog.md` rad 9.

**Problem:** Golvet togs från `docs/design.md` ("Node (22 eller senare)") utan någon `(version)`-post. Enligt Node.js officiella schema gäller detta per 2026-10-25:

| Linje | Status 2026-10-25 | Active LTS | Maintenance | EOL |
| --- | --- | --- | --- | --- |
| 22.x (Jod) | Maintenance LTS | 2024-10-29 | 2025-10-21 | **2027-04-30** |
| 24.x (Krypton) | Maintenance LTS (sedan 2026-10-20) | 2025-10-28 | 2026-10-20 | 2028-04-30 |
| 26.x | Current, blir **Active LTS 2026-10-28** | 2026-10-28 | 2027-10-20 | 2029-04-30 |
| 27.x | Alpha från 2026-10-28 | LTS 2027-10-20 | – | 2030-04-30 |

Från Node 27 ändras modellen: en ny major per år, alla linjer blir LTS med 30 månaders LTS och ingen Maintenance-fas. Node 26 är den sista linjen i den gamla modellen.

Golvet "22" räcker inte heller för det designen använder, för funktionerna blev stabila eller påslagna först i senare minor-versioner av 22:

| Funktion | Finns från | Stabil / standard |
| --- | --- | --- |
| `util.parseArgs` | 18.3 | Stabil 20.0 |
| `util.styleText` | 21.7 / 20.12 | **Stabil 22.13.0** |
| `fs.glob` / `fsPromises.glob` | 22.0 | **Stabil 22.17.0** |
| Global `WebSocket` (klient) | 21.0 / 20.10 | Utan flagga 22.0, stabil **22.4.0** |
| Typstrippning (`.ts`) | 22.6 (flagga) | Standard och utan varning **22.18.0**, men bara "1.2 Release candidate" i 22. **Stabil först i 24.12.0.** |
| `fs.watch` med `recursive` på Linux | 19.1 | Stabil (fs-modulen) |
| `node:test` | 18 | Stabil 20.0 |

Med "22" kan alltså en agent köra 22.0–22.17 och få experimentvarningar eller funktioner som saknas. Själva 22-linjen får säkerhetsfixar i drygt sex månader till. Det går emot user story 1 ("startar om tio år") och målet om låg förvaltning.

**Åtgärd:**
1. Ändra Stack till `Node | 24 LTS (≥ 24.12) eller senare; CI/lokalt verifieras även på 26 LTS`. Lägg till en `(version)`-post i memlog med datum och källa.
2. Om 22 måste behållas, skriv i stället `22.18 eller senare` och lägg till ett revisit-villkor: "lyft golvet före 2027-04-30".
3. Lägg `"engines": { "node": ">=24.12" }` i `package.json`, som designen ändå planerar för `imports`, så att golvet syns maskinellt. Det strider inte mot AD-2.

### Fynd 2 — Strikt CSP och inline import map går inte ihop utan hash [Hög]

**Var:** Capability-tabellen, rad "6 Statiska filer, strikt CSP → AD-2". `docs/design.md` påstår: "Fungerar offline och med `script-src 'self'`". Structural Seed: `example/index.html  # import map`.

**Problem:** En import map måste vara inline. MDN anger att `src` inte får användas på `<script type="importmap">`. Enligt WHATWG HTML ("prepare the script element") prövas alla `<script>` utan `src`, även `importmap`, mot CSP:s inline-kontroll med typen `"script"`. Med `script-src 'self'` blockeras därför import map. Då löses `#sola` aldrig, och appen startar inte. Detta har inte prövats, och ingen AD täcker CSP.

**Åtgärd:** Lägg till en regel, till exempel i AD-1 eller en ny AD: "CSP är `script-src 'self' 'sha256-<hash av import map>'`. Import map hålls byte-identisk, och `sola dev` (senare `sola build`) räknar ut och skickar hashen i `Content-Security-Policy`-huvudet." En hash passar statiska filer bättre än en nonce, eftersom en nonce kräver dynamisk servering. Rätta också påståendet i `docs/design.md` vid tillfälle.

### Fynd 3 — "Baseline 2026" är ett rörligt mål och betyder "Newly available" [Medel]

**Var:** AD-12 och Stack.

**Verifierat (stämmer med memlog rad 23):**
- Navigation API är Baseline Newly available sedan **2026-01-13**: Chrome/Edge 102, Firefox 147, Safari/iOS 26.2. `NavigateEvent.intercept`, `canIntercept`, `scroll` och `navigation.transition` ingår.
- URLPattern är Newly available sedan **2025-09-15**: Chrome/Edge 95, Firefox 142, Safari/iOS 26.

**Problem:**
- "Baseline 2026" är enligt web.dev den fasta mängd funktioner som blir Newly available under kalenderåret 2026. Mängden är inte stängd förrän 2026-12-31, så regeln släpper i praktiken in allt som landar i november–december.
- URLPattern hör egentligen till Baseline 2025.
- Navigation API blir Widely available först omkring 2028-07 (30 månader efter 2026-01-13).
- Safari 26.2 kräver iOS 26. iOS 26 saknar stöd för iPhone XS, XS Max och XR, så de enheterna kan aldrig köra appen.
- URLPattern saknas helt som global i Node 22 (prov: `typeof URLPattern === 'undefined'`). I Node 24 finns den som global men är experimentell. Designen vill att appkod ska gå att köra i Node för tester via `#sola`, så routerkod som använder URLPattern fungerar inte på Node 22.

**Åtgärd:** Skriv AD-12 med exakta lägstaversioner: "Chrome/Edge ≥ 102, Firefox ≥ 147, Safari/iOS ≥ 26.2 (styrs av Navigation API; Baseline Newly available 2026-01-13)". Ta bort den öppna formuleringen "Baseline 2026" eller definiera den. Notera att Node-tester som rör URLPattern kräver Node ≥ 24. Det är ytterligare ett skäl till Fynd 1.

### Fynd 4 — SSE över HTTP/1.1 når gränsen på sex anslutningar, och origin för `/api` är odefinierad [Medel]

**Var:** AD-5, AD-6, AD-8, Structural Seed (`tools/` live reload med SSE, `example/server/` SSE).

**Problem:** MDN (EventSource) beskriver att SSE utan HTTP/2 begränsas till **6 öppna anslutningar per webbläsare och domän, över alla flikar**. Chrome och Firefox har markerat detta som "Won't fix". `node:http` talar HTTP/1.1, och webbläsare kräver TLS för HTTP/2.

I dev har varje flik två långlivade strömmar: live reload från `sola dev` och `GET /api/events`. Med tre flikar är gränsen nådd, och alla vidare `fetch` mot samma origin hänger. Det ser ut som en ramverksbugg.

Ryggraden säger inte heller om `sola dev` och `example/server/` delar origin. AD-9 använder relativa `/api`-sökvägar och AD-7 en cookie, så detta måste vara samma origin för att cookies ska fungera utan CORS och `SameSite=None`.

**Åtgärd:**
1. Lägg i AD-5: "Appen och API:t serveras från samma origin; `sola dev` vidarebefordrar `/api/*` till `example/server/`" (eller motsvarande).
2. Lägg i AD-6 eller AD-8: "Högst en `EventSource` per ström och flik; strömmen stängs vid `pagehide`." Dokumentera gränsen på sex anslutningar och att produktion bör gå via HTTP/2.

### Fynd 5 — Cookie-attributen är ospecificerade och bygger på ett standardvärde som inte finns överallt [Medel]

**Var:** AD-7.

**Verifierat:**
- HttpOnly stänger ute `document.cookie`, men cookien skickas ändå med `fetch()`. Det stöder AD-7.
- Enligt BCD finns `SameSite=Lax` som standardvärde bara i Chrome (80+). I Firefox ligger det bakom en inställning, och Safari saknar det.
- Undantaget som tillåter `Secure` på `http://localhost` stöds inte av Safari (MDN).
- Cookie-specen RFC 6265bis är fortfarande ett Internet-Draft i RFC Editor-kön. Någon publicerad RFC har jag inte hittat.

**Problem:** Utan explicit `SameSite` blir sessionscookien cross-site i Firefox och Safari. Det öppnar för CSRF mot `POST /api/bookings` och liknande. En `Secure`-flagga i dev bryter inloggningen i Safari mot `http://localhost`.

**Åtgärd:** Skriv i AD-7: "`Set-Cookie: session=…; HttpOnly; SameSite=Lax; Path=/` och `Secure` utanför localhost. Muterande anrop kräver `Content-Type: application/json` och kontroll av `Origin`." Spola behöver följa samma rad.

### Fynd 6 — `node:test`-funktioner som designen räknar med är delvis experimentella [Låg]

**Var:** Deferred ("Tester för `sola.js`"), Capability rad 10, `docs/design.md` ("assertions, mocking, snapshots, coverage").

**Verifierat på Node 22.22.0 och i dokumentationen för v22/v24:**
- Snapshots fungerar utan flagga. De är dokumenterade som stabila från 23.4.0.
- Coverage kräver fortfarande `--experimental-test-coverage` och är "Stability 1 – Experimental" även i 24.
- `MockTimers` ger `ExperimentalWarning` i 22.22.
- `mock.module` kräver `--experimental-test-module-mocks` och ger varning.
- Nodes globala `EventSource` är experimentell och kräver `--experimental-eventsource` i både 22 och 24, så SSE-tester i Node måste läsa strömmen via `fetch`.

**Åtgärd:** Notera i Deferred att `sola test` bara får bygga på stabila delar (`test`, `assert`, `mock.fn`, snapshots på ≥ 23.4), och att coverage, module mocks och EventSource kontrolleras igen när testerna skrivs.

### Fynd 7 — Rekursiv `fs.watch` har plattformsförbehåll [Låg]

**Verifierat:** `recursive` stöds på Linux sedan 19.1.0, och provet gav en `rename`-händelse för `sub/x.txt`. Dokumentationen varnar dock: bevakningen är opålitlig på nätverksfilsystem och i Docker eller Vagrant, `filename` kan vara `null`, och efter delete och nyskapande bevakas det gamla inodet.

**Åtgärd:** Ingen ändring i ryggraden behövs. Låt implementationen av `sola dev` göra full omladdning när `filename` är `null`, debounca händelser och i dokumentationen nämna `fs.watchFile` som reserv i containrar.

## Bekräftat utan anmärkning

- **RFC 9457** är Proposed Standard (juli 2023) och ersätter RFC 7807. Medietypen `application/problem+json` och fälten `type`/`title`/`status`/`detail` stämmer. Ingen ersättare är på gång.
- **Import maps** är Baseline Widely available sedan 2025-09-27 (Chrome 89, Firefox 108, Safari 16.4). Ryggraden använder en enda import map. Flera import maps är inte Baseline, eftersom Firefox saknar stöd, så håll fast vid en.
- **`#sola` som specifier** är giltig i webbläsaren. Den börjar inte med `/`, `./` eller `../` och kan inte tolkas som absolut URL, så den behandlas som bar specifier (WHATWG HTML, "resolve a URL-like module specifier"). I Node fungerar den som subpath import (`"imports": {"#sola": ...}`), vilket är provat på 22.22.0.
- **Dynamisk `import()`** är Baseline Widely available sedan 2022-07-15.
- **`modulepreload`** blev Widely available 2026-03-18. Det rör `sola build` senare.
- **Server-Sent Events/EventSource** är Baseline Widely available sedan 2022-07-15.
- **Node:s inbyggda `WebSocket`** finns och är stabil från 22.4. Det är en klient. Node har ingen inbyggd WebSocket-server, vilket är ytterligare ett skäl att behålla SSE för serverpush.

## Förslag till memlog-poster

- `(version) Webbkontroll 2026-10-25: Node 22 Maintenance LTS, EOL 2027-04-30; 24 Maintenance sedan 2026-10-20, EOL 2028-04-30; 26 Active LTS 2026-10-28, EOL 2029-04-30. Källa: github.com/nodejs/Release`
- `(version) Webbkontroll 2026-10-25: RFC 9457 Proposed Standard, ersätter 7807. Källa: rfc-editor.org/info/rfc9457`

## Källor

- Node.js Release Schedule: https://github.com/nodejs/Release
- Node.js tidigare releaser och schemaändring från Node 27: https://nodejs.org/en/about/previous-releases
- Node 22 `fs` (glob, watch): https://nodejs.org/docs/latest-v22.x/api/fs.html
- Node 22 `util` (styleText, parseArgs): https://nodejs.org/docs/latest-v22.x/api/util.html
- Node 22 globals (WebSocket, EventSource): https://nodejs.org/docs/latest-v22.x/api/globals.html
- Node 24 globals (URLPattern, EventSource): https://nodejs.org/docs/latest-v24.x/api/globals.html
- Node 22 TypeScript/typstrippning: https://nodejs.org/docs/latest-v22.x/api/typescript.html
- Node 24 TypeScript/typstrippning (stabil 24.12.0): https://nodejs.org/docs/latest-v24.x/api/typescript.html
- Node 22 `node:test`: https://nodejs.org/docs/latest-v22.x/api/test.html
- Node 24 `node:test`: https://nodejs.org/docs/latest-v24.x/api/test.html
- web-features, Navigation API: https://github.com/web-platform-dx/web-features/blob/main/features/navigation.yml.dist
- web-features, URLPattern: https://github.com/web-platform-dx/web-features/blob/main/features/urlpattern.yml.dist
- web-features, import maps: https://github.com/web-platform-dx/web-features/blob/main/features/import-maps.yml.dist
- web-features, flera import maps: https://github.com/web-platform-dx/web-features/blob/main/features/import-maps-multiple.yml.dist
- web-features, JS-moduler inkl. `import()`: https://github.com/web-platform-dx/web-features/blob/main/features/js-modules.yml.dist
- web-features, modulepreload: https://github.com/web-platform-dx/web-features/blob/main/features/modulepreload.yml.dist
- web-features, Server-Sent Events: https://github.com/web-platform-dx/web-features/blob/main/features/server-sent-events.yml.dist
- Baseline-mål och årsmängder: https://web.dev/articles/how-to-choose-your-baseline-target och https://web.dev/baseline
- Baseline-digest januari 2026: https://web.dev/blog/baseline-digest-jan-2026
- MDN `<script type="importmap">` (källa): https://github.com/mdn/content/blob/main/files/en-us/web/html/reference/elements/script/type/importmap/index.md
- WHATWG HTML, "prepare the script element" och "resolve a URL-like module specifier": https://html.spec.whatwg.org/multipage/scripting.html#prepare-the-script-element och https://html.spec.whatwg.org/multipage/webappapis.html#resolving-a-url-like-module-specifier
- WICG import-maps, CSP-diskussion: https://github.com/WICG/import-maps/issues/105
- MDN EventSource (gräns på 6 anslutningar): https://github.com/mdn/content/blob/main/files/en-us/web/api/eventsource/index.md
- MDN Set-Cookie (HttpOnly, SameSite, Secure/localhost): https://github.com/mdn/content/blob/main/files/en-us/web/http/reference/headers/set-cookie/index.md
- MDN Cookies-guide (Safari och Secure på localhost): https://github.com/mdn/content/blob/main/files/en-us/web/http/guides/cookies/index.md
- BCD Set-Cookie (SameSite Lax_default): https://github.com/mdn/browser-compat-data/blob/main/http/headers/Set-Cookie.json
- RFC 6265bis (fortfarande draft): https://datatracker.ietf.org/doc/draft-ietf-httpbis-rfc6265bis/
- RFC 9457: https://www.rfc-editor.org/info/rfc9457
- iOS 26 och enheter som tappat stöd: https://9to5mac.com/2025/09/15/ios-26-supports-these-recent-iphones-but-drops-three-models/
