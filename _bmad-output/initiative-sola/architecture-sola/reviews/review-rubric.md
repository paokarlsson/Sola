# Granskning (rubric walker): architecture-sola.md

- **Granskad fil:** `_bmad-output/initiative-sola/architecture-sola/architecture-sola.md` (status: draft, AD-1 till AD-12)
- **Underlag:** `.memlog.md`, `docs/design.md`, `docs/user-stories.md`, `docs/exempelapp.md`, `initiative-sola.md`
- **Datum:** 2026-10-25
- **Måttstock:** checklistan för en bra ryggrad. Den fixerar de verkliga divergenspunkterna för nivån under (enheterna `sola/`, `tools/` och `example/` samt epikerna som bygger bokningsappen steg för steg) och missar ingen. Varje AD:s Rule går att upprätthålla och förhindrar sin divergens. Inget under Deferred kan låta två enheter divergera. Namngiven teknik är verifierat aktuell. Underlaget täcks. Varje dimension som höjden äger är beslutad, uppskjuten eller en öppen fråga.

## Verdikt

Ryggraden är stark på gränserna mellan enheterna (AD-1–AD-5) och på serverns roll som facit (AD-8). Ändå räcker den inte för överlämning. Den viktigaste sömmen, alltså hur `sola dev`, `example/server/` och webbläsaren hänger ihop på **en origin**, är inte beslutad. Det engelska kontraktet (routes, API, fält, statusövergångar) finns bara som en öppen fråga i memloggen och har inte kommit med i ryggraden. Gränssnittet mellan `app.js` och vyerna, med livscykel och SSE-ägarskap, saknas. Säkerhetskraven i user stories 5 och 6 (ingen `innerHTML`, strikt CSP) har skjutits upp, eller hänvisar till ett AD som inte täcker dem, trots att de första epikerna skriver DOM-kod innan `html` finns.

## Översikt

| # | Allvar | Fynd | Checklistepunkt |
| --- | --- | --- | --- |
| F1 | Kritisk | Dev-topologin är obeslutad: en origin, `/api`-routing, SPA-fallback, `/sola/`-mount, reserverade sökvägar | Divergenspunkter; operativt hölje |
| F2 | Hög | Det engelska kontraktet (routes, API, fält, tillstånd) saknas, och den öppna frågan har tappats bort | Divergenspunkter; underlag; öppna frågor |
| F3 | Hög | AD-9:s regel ”401 leder till `/login`” bryter publika sidor och inloggningen. Det saknas ett hem för den inloggade användaren | AD:s Rule förhindrar sin divergens |
| F4 | Hög | Kontraktet mellan vymodul och `app.js` saknas: livscykel, städning, ägare av SSE-anslutningen, ordning på svar | Divergenspunkter |
| F5 | Hög | Säkerhetsinvarianter är uppskjutna eller saknas: `innerHTML`, CSP inklusive import map och live reload, CSRF/SameSite | Deferred låter enheter divergera; underlag |
| F6 | Medel | Test- och kvalitetsdimensionen är tyst: var tester ligger, hur de körs, hur AD:erna kontrolleras, CI | Dimension tyst; Rule går att upprätthålla |
| F7 | Medel | Modul- och paketuppsättning: `package.json` (`type`, `imports` för `#sola`), `.js` eller `.mjs`, hur `sola` startas | Divergenspunkter |
| F8 | Medel | Gränsen mellan `example/components/` och `sola.js` vid utbrytning saknar kriterium | Rule går att upprätthålla |
| F9 | Medel | CSS är helt uppskjutet. Komponenter kan välja `style=`, `<style>` eller egna filer, vilket också krockar med CSP | Deferred låter enheter divergera |
| F10 | Medel | Driften är tyst utöver ”endast lokalt”: seed- och demoanvändare, portar, 500-fel, loggning, hur ”riktig körning” utlöses | Operativt hölje |
| F11 | Låg | Node 22 når EOL 2027-04-30, och ingen versionskontroll av Node finns i memloggen | Verifierat aktuell teknik |
| F12 | Låg | ”Baseline 2026” är ett rörligt mål medan året pågår | Verifierat aktuell teknik |

---

## F1 — Dev-topologin är obeslutad (kritisk)

**Observation.** AD-5 delar devservern i `tools/` (`sola dev`, filservering och live reload) och `example/server/` (API). Ryggraden säger inte hur webbläsaren når båda. Följande är obesvarat:

- **Samma origin.** Sessionen är en HttpOnly-cookie (AD-7). Om `sola dev` och `example/server` lyssnar på olika portar blir anropen cross-origin. Då krävs CORS, `credentials: 'include'` och `SameSite=None; Secure`, och det fungerar inte över ren `http://localhost`. Om de delar origin måste den ena processen vidarebefordra till den andra, eller ladda den. AD-1 förbjuder `tools/` att importera från `example/`, men ryggraden säger inte om det gäller en hanterare som anges vid körning (`--api example/server/index.js`).
- **Serverrot och `/sola/`.** `example/index.html` mappar `#sola` till `/sola/sola.js`, alltså en sökväg utanför `example/`. Antingen serverar `sola dev` repots rot, och då ligger appen under `/example/` och alla routes får prefix, eller så serveras `example/` som rot med en extra mount av `sola/`. De två valen ger olika URL:er i appen.
- **SPA-fallback.** En direktladdning av `/providers/42` måste returnera `index.html`. Ryggraden säger inte vem som gör det, eller hur `/api/*`, statiska filer och `/__reload` skiljs åt.
- **Reserverade sökvägar.** Live reload använder SSE (design.md), och appen använder också SSE (`/api/events`). Live reload behöver ett eget namnrum.
- **Hur man startar.** Ett kommando eller två processer? Epik 1 (”Grund: … en devserver med API”) bygger exakt den här sömmen.

**Varför det är en divergens.** Epiken för `tools/` och epiken för `example/server/` gör var sin rimlig gissning, och de går inte ihop. AD-5:s löfte att servern ”ska kunna ersättas av Spola utan ändring i appen” förutsätter dessutom ett bestämt svar: samma origin och samma sökvägar.

**Förslag.** Inför ett AD-13, ”En origin i utveckling”:
- `sola dev` serverar `example/` som rot och mountar `sola/` på `/sola/`, eller så anges rötterna med flaggor. Välj ett av alternativen.
- `/api/*` vidarebefordras till en uppströms som anges med flagga (`--api http://localhost:<port>`). Det är generiskt och följer AD-1.
- GET-anrop med `Accept: text/html` som inte träffar en fil får `index.html`.
- `/__sola/*` är reserverat för verktyget.
- Ett startkommando dokumenteras, till exempel `node tools/sola.js dev --api …` plus `node example/server/index.js`, eller ett skript som startar båda.

Uppdatera mermaid-diagrammet så att proxyvägen syns.

## F2 — Det engelska kontraktet saknas, och den öppna frågan har tappats bort (hög)

**Observation.** Memloggen har `(question) docs/exempelapp.md har svenska fält, routes och statusvärden; måste översättas till engelska innan bygget börjar.` Ryggraden har ingen sektion för öppna frågor, och frågan syns inte där. Ryggraden ger bara fragment: statusvärden, roller, två fältexempel (`providerId`, `startsAt`) och `GET /api/events`. ER-diagrammet saknar attribut. Konventionen ”gemener, substantiv i plural” krockar dessutom med sökvägar som underlaget kräver: `/login`, `/api/login`, `/api/logout`, `/api/me`, `/schema` (`/schedule`), `/mina-bokningar` (`/my-bookings`) och `/boka/:tidId` (ett verb). Regeln går alltså inte att följa som den är skriven.

Följande måste fixeras för att `server/`, `api.js`, vyerna och Spola ska svara likadant:
- Den fullständiga route- och API-tabellen på engelska, med namn på query-parametrar (`fran`/`till` till `from`/`to`, datum eller datumtid?).
- Fälten per entitet (`Tid { start, slut, ledig }` till `startsAt`/`endsAt`/`available`? Lagras `available` eller härleds den?).
- Statusövergångar per roll (vem får gå från `pending` till `confirmed`/`rejected`, får en `confirmed` bokning avbokas, vad händer med tiden efter `cancelled`).
- Kroppen i `PATCH /api/bookings/:id`.
- Statuskoder vid lyckat anrop (201/204).
- Värdena för Problem Details-fältet `type` som klienten förgrenar på (till exempel ”tiden redan bokad”).
- SSE-formatet (eventnamn och data).
- Inloggningskroppen och demoanvändarna.

ER-diagrammet `SLOT ||--o| BOOKING` säger dessutom emot underlaget. En avbokad eller avvisad tid kan bokas igen, så samma tid får flera bokningar över tid.

AD-6 och AD-7 binder ”Spola”, som inte finns bland `binds` i frontmattern. Kontraktet behöver därför vara läsbart utanför ryggraden.

**Förslag.**
1. Lägg till sektionen *Öppna frågor* med den här frågan, med ägare och deadline (”före epik 1”), eller ännu hellre:
2. Ta fram ett bindande kontraktsdokument, till exempel `docs/api.md` eller en tabell i ryggraden, med alla routes, endpoints, fält, övergångar, `type`-värden och SSE-format. Låt AD-6 hänvisa till det.
3. Ändra konventionen till ”resurser i plural; sessionssökvägar (`/login`, `/logout`, `/me`) och vyer (`/schedule`) är undantag”.
4. Rätta kardinaliteten till ”högst en aktiv (`pending`/`confirmed`) bokning per tid”.

## F3 — AD-9:s 401-regel bryter publika sidor och inloggningen. Den inloggade användaren saknar hem (hög)

**Observation.** AD-9 säger att `api.js` ”skickar användaren till `/login` vid `401`”.
- Vid start måste appen fråga `GET /api/me` för att veta vem som är inloggad. För en anonym besökare på `/` eller `/providers/:id`, som är öppna för alla, blir svaret 401. Enligt regeln skickas då alla anonyma besökare bort från startsidan.
- `POST /api/login` med fel lösenord svarar rimligen 401. Regeln gör det till en omdirigering till samma sida i stället för ett felmeddelande.
- `design.md` lägger till `?next=` vid omdirigering, men AD-9 nämner det inte.

Den inloggade användaren (`user`-signalen i design.md) är delat klienttillstånd. AD-8 säger att ”ingen vy äger delad data”, och AD-10 tillåter vyerna att importera endast `components/`, `api.js` och `#sola`. Vyer som behöver rollen (till exempel för att visa knappen ”Boka”) kan alltså inte läsa den från `app.js`. Varje epik kommer att lösa det på sitt sätt, till exempel med egna `getMe()`-anrop, globala variabler eller en export i `api.js`.

**Förslag.** Skriv om AD-9:
- `getMe()` returnerar `null` vid 401 och omdirigerar inte.
- Ett felaktigt inloggningsförsök ger en Problem Details som inloggningsvyn visar.
- Övriga 401 sätter användaren till `null`. Omdirigeringen till `/login?next=…` görs av guarden i `app.js`, inte av `api.js`.

Bestäm var användaren bor, till exempel `example/session.js` som exporterar `user` och som vyer får importera, och lägg till den i AD-10:s lista över tillåtna importer.

## F4 — Kontraktet mellan vymodul och `app.js`, livscykel och SSE-ägare saknas (hög)

**Observation.** AD-10 säger att varje route har en vymodul som laddas med `import()`, men inte vad modulen exporterar eller hur den tas bort. Varje vyepik (2–6) och `app.js` behöver samma svar på följande:
- Signaturen, till exempel `export default function view({ params, url, signal }) → Node`.
- Hur städning sker när användaren navigerar bort. Underlaget kräver ”effekter som städas bort när vyn lämnas”.
- **Vem som äger `EventSource`.** AD-9 gör `api.js` till enda vägen för `fetch`, men SSE går inte via `fetch`. Om varje vy öppnar en egen `EventSource` och inte stänger den läcker anslutningar. Över HTTP/1.1, som är vad `node:http` ger, tillåter webbläsaren bara sex samtidiga anslutningar per origin, och live reload tar redan en. Appen hänger efter några navigeringar.
- **Ordningen på svar.** AD-8 lovar att vyer inte ska visa olika tillstånd. En egen ändring plus en SSE-händelse kan ändå ge två omhämtningar som kommer i fel ordning, så att ett gammalt svar skriver över ett nytt. AD-8 har ingen regel om att senaste begäran vinner.

**Förslag.** Inför ett AD för vymodulen:
- Signaturen enligt ovan.
- `app.js` skapar en `AbortController` per vyvisning och avbryter den vid navigering.
- Vyn knyter alla lyssnare, timrar och `fetch` till den `signal`.

Utöka AD-9:
- `api.js` äger den enda `EventSource` och exponerar `onChange(callback, { signal })`.
- En ny omhämtning avbryter den föregående (senaste vinner).

## F5 — Säkerhetsinvarianter är uppskjutna eller saknas (hög)

**Observation.**
- **Story 5 (ingen `innerHTML`)** är uppskjuten till ”när `html` bryts ut”. Epik 1–2 bygger listor och vyer i ren JS innan någon mallfunktion finns. Den naturliga genvägen i vanilla-JS är `innerHTML`, och då bryts `html` senare ut ur kod som redan bröt mot kravet. Divergensen uppstår just under den period som uppskjutningen gäller.
- **Story 6 (strikt CSP)** hänvisar till AD-2, men AD-2 säger ingenting om CSP. Ingen policy är fastslagen, och tre saker påverkas direkt:
  - Den inline `<script type="importmap">` i `index.html` blockeras av `script-src 'self'` om den inte har en hash eller nonce.
  - Ett live reload-skript som injiceras inline blockeras på samma sätt.
  - `style=`-attribut i mallar blockeras av en strikt `style-src`.
  
  Om devservern inte skickar CSP märks bristerna först i produktion.
- **AD-7** fixerar HttpOnly men inte `SameSite`, `Path`, `Secure` eller CSRF-skydd. Med cookie-session är CSRF det centrala hotet. Om Node-servern och Spola gör olika val beter sig klienten olika, och AD-7 lovar att de ska vara utbytbara.

**Förslag.**
1. Inför ett AD om säker DOM från dag ett: inget `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`/`new Function` eller inline-händelseattribut i `sola/` och `example/`. Det gäller även före utbrytningen.
2. Inför ett AD om CSP: `sola dev` skickar en fast, strikt CSP (skriv ut policyn) och räknar fram hashen för import map. Live reload laddas som extern fil från `/__sola/`. Överväg `require-trusted-types-for 'script'`.
3. Utöka AD-7 med `SameSite=Lax` (eller `Strict`), `Path=/`, `Secure` utanför localhost, och att servern avvisar ändrande anrop vars `Origin` inte är den egna.

## F6 — Test- och kvalitetsdimensionen är tyst (medel)

**Observation.** Tester för `sola.js` och DOM-tester är uppskjutna, och story 10 mappas till ”Deferred”. Det som avgör om epiker divergerar är ändå inte hur mycket som testas utan **var och hur**: `*.test.js` bredvid källan eller i `test/`, att `node --test` körs från roten, och om API-servern testas. AD-4:s ”exempelappen är integrationstestet” går inte att upprätthålla så länge det inte finns någon automatiserad eller dokumenterad kontroll av att appen fungerar efter en utbrytning. Memloggens revisit-villkor är ”när en utbrytning bryter appen”, men utan tester märks det inte. Ingen av AD:erna har en kontrollmekanism. AD-1, AD-3, AD-9, AD-11 och förbudet mot `innerHTML` är alla möjliga att kontrollera med grep. CI nämns inte alls, inte ens som uppskjutet.

**Förslag.** Bestäm nu, som en konvention eller ett kort AD:
- `node:test`, filer som heter `*.test.js` bredvid källan, och `node --test` från roten.
- En kontroll i `tools/` (till exempel `sola check`) som verifierar AD-1, AD-3, AD-9 och F5-förbuden med textsökning.
- Kontraktstester för `example/server/` med `node:test` mot F2-kontraktet. De kan sedan köras mot Spola.

Lägg CI under Deferred med ett utlösande villkor.

## F7 — Modul- och paketuppsättning (medel)

**Observation.** AD-2 förbjuder beroenden men säger inte om det finns en `package.json`. `design.md` bygger på `"imports": { "#sola": … }` i `package.json` för att appkoden ska fungera i Node för tester. Utan `"type": "module"` beror tolkningen av `.js` i `example/server/` och `sola/` på Nodes syntaxdetektering. Structural Seed har `tools/sola.mjs` men `.js` i övrigt. Det saknas också en regel för hur `sola dev` startas utan `npm install`.

**Förslag.** Inför ett AD eller en konvention:
- En `package.json` i roten med `"type": "module"`, `"imports": { "#sola": "./sola/sola.js" }`, `"engines": { "node": ">=22.x" }`, utan `dependencies` och `devDependencies`, och eventuellt `"bin": { "sola": "tools/sola.js" }`.
- Alla filer heter `.js`.
- Kommandot skrivs som `node tools/sola.js dev`.

## F8 — Gränsen mellan `components/` och `sola.js` saknar kriterium (medel)

**Observation.** AD-10 tillåter delad kod i `example/components/` och i `#sola`. AD-4 säger att lösningar som skrivs en andra gång flyttas till `sola.js`. Ryggraden säger inte när något andra gången blir en appkomponent och när det blir ramverk. Det leder till att domänkod hamnar i Sola (mot AD-1:s anda) eller att generiska lösningar fastnar i appen. Olika epiker kommer att dra gränsen olika.

**Förslag.** Lägg till ett kriterium i AD-4: kod utan domänkunskap (inga entiteter, inga sökvägar, ingen svensk text) går till `sola.js`. Domänspecifik kod går till `components/`. Utbrytning till Sola kräver att lösningen inte nämner bokning, tid eller utförare.

## F9 — CSS är helt uppskjutet (medel)

**Observation.** ”CSS-konvention bestäms när stilarna krockar.” Fram till dess kan komponenter välja `style=`-attribut, `<style>` i mallen, egna `.css`-filer per komponent eller allt i `style.css`. Det är exakt den divergens som är dyr att städa upp, och de två första valen krockar med strikt CSP (F5).

**Förslag.** Fixera ett minimum nu: all CSS ligger i `.css`-filer som länkas från `index.html` (i början bara `style.css`), mallar har inga `style=` eller `<style>`, och klassnamn skrivs i kebab-case med komponentnamnet som prefix. Själva strategin (`@scope`, layers) kan fortsatt skjutas upp.

## F10 — Driften är tyst utöver ”endast lokalt” (medel)

**Observation.** Uppskjutningen av driftsättning och miljöer är rimlig för en exempelapp, men villkoret ”tills appen ska köras på riktigt” går inte att avgöra. Inom lokal utveckling är följande obeslutat:
- Seed-data och demoanvändare med inloggningsuppgifter. Inloggningsvyn och servern måste vara överens.
- Hur portar konfigureras.
- Att data försvinner vid omstart.
- Att oväntade fel (500) också returneras som Problem Details.
- Loggning.

Distributionen är uppskjuten, men `design.md` planerar `sola build` med hashade filnamn. Absoluta sökvägar och dynamiska `import()` som byggs ihop med strängar i appen kan göra det bygget omöjligt utan omskrivning.

**Förslag.**
- Lägg till en konvention för `example/server/`: seed i `server/seed.js` med listade demoanvändare, port via flagga eller miljövariabel, alla fel som Problem Details och en loggrad per anrop.
- Ge Deferred-raderna konkreta utlösare, till exempel ”när appen ska visas för någon utanför repot” och ”vid första taggade release”.
- Lägg till regeln att `import()` bara får ta litterala, relativa specifierare.

## F11 — Node-versionen (låg)

**Observation.** ”Node 22 LTS eller senare”. Node 22 är i Maintenance LTS med end-of-life 2027-04-30. Node 24 är Active LTS och Node 26 går in i LTS nu i oktober 2026. Memloggen har webbkontroll av webbläsar-API:erna men ingen versionskontroll av Node. `design.md` använder `fs.glob`, `util.styleText`, global `WebSocket` och typstrippning. Flera av dem kom eller blev stabila först i senare 22.x-versioner.

**Förslag.** Ange lägsta minor-version som har alla API:er som används (till exempel `>=22.x`, fastställd mot Nodes changelog), kör även på senaste LTS, och notera att 22 går ur support våren 2027. Överväg 24 som golv.

## F12 — ”Baseline 2026” är ett rörligt mål (låg)

**Observation.** Baseline-årsmängden 2026 är inte stängd förrän året är slut, så varje funktion som blir Newly available under resten av året blir automatiskt tillåten. Uppgifterna för Navigation API (Firefox 147, Safari 26.2) och URLPattern (Firefox 142, Safari 26, Chrome/Edge 95) stämmer med memloggens källor.

**Förslag.** Ange lägsta webbläsarversioner explicit (Chrome/Edge, Firefox 147, Safari 26.2), eller ”Baseline Newly available per 2026-10-25”.

---

## Checklistan punkt för punkt

| Punkt | Bedömning |
| --- | --- |
| Fixerar de verkliga divergenspunkterna och missar ingen | **Delvis.** Gränser och beroenderiktning (AD-1–AD-3), utbrytningsregeln (AD-4) och servern som facit (AD-8) är träffsäkra. Följande saknas: dev-topologin (F1), kontraktet i detalj (F2), vymodul, livscykel och SSE (F4), användartillståndet (F3), modulsetup (F7) och gränsen mot komponenter (F8). |
| Varje Rule går att upprätthålla och förhindrar sin divergens | **Delvis.** AD-9:s 401-regel ger fel beteende (F3). Konventionen om plural går inte att följa (F2). AD-7 förhindrar inte divergens om CSRF och cookie-attribut (F5). AD-8 saknar regel om ordningen på svar (F4). AD-4 saknar gränskriterium (F8). Ingen AD har en kontrollmekanism (F6). |
| Inget under Deferred kan låta enheter divergera | **Nej.** Mallsäkerhet och `innerHTML` (F5), CSS-konvention (F9) och testers placering (F6) kan alla låta epiker divergera under uppskjutningstiden. API-form, klientcache, formulärlager, SSR, persistens och Spola-bytet är rimligt uppskjutna. |
| Namngiven teknik är verifierat aktuell | **Mestadels.** Webbläsar-API:erna är verifierade med källor. Node saknar verifiering och har nära EOL (F11). ”Baseline 2026” är rörligt (F12). RFC 9457 är aktuell. |
| Underlaget täcks | **Delvis.** Story 5 och 6 täcks inte i praktiken (F5). Story 10 saknar ens konvention (F6). Översättningen av `exempelapp.md` är tappad (F2). `design.md`:s `package.json`-imports saknas (F7). Byggordningen i `exempelapp.md` används inte för att visa vilka AD:er varje steg kräver. |
| Varje dimension är beslutad, uppskjuten eller en öppen fråga | **Nej.** Dev-miljön (F1), drift och observerbarhet (F10), kvalitet och CI (F6) och säkerhetshölje som CSP och CSRF (F5) är tysta. Det finns ingen sektion för öppna frågor. Driftsättning, infrastruktur och leverantör är uppskjutna med en motivering, men utan ett utlösare som går att avgöra. |

## Det som håller

- Paradigmet (extraherat ramverk) och enhetstabellen är tydliga och följs konsekvent.
- AD-1 och AD-3 kan kontrolleras mekaniskt och skyddar ramverkets yta.
- AD-4:s krav på samma commit och förbudet mot parallella kopior är ovanligt konkreta och bra.
- AD-6 väljer etablerade standarder (RFC 9457, ISO 8601, SSE) och kontraktet görs oberoende av Spola.
- AD-8 är ett enkelt och korrekt val för användarens prioritering ”enkelt och korrekt före snabbt”.
- AD-11 löser i förväg problemet med å/ä/ö i URL:er.
