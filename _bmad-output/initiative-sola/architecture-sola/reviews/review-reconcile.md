---
review: reconcile
target: _bmad-output/initiative-sola/architecture-sola/architecture-sola.md
sources: [docs/design.md, docs/user-stories.md, docs/exempelapp.md, .memlog.md]
date: '2026-10-25'
---

# Avstämningsgranskning: arkitekturryggraden mot underlaget

## Omdöme

Ryggraden täcker struktur, beroenderiktning och API-kontrakt väl. Den tappar däremot underlagets tysta säkerhets- och serveringskrav (strikt CSP, Trusted Types, inget `innerHTML` redan nu, samma origin, deep links). Den saknar kontraktet mellan router och vy, och domänordlistan som memloggen själv markerar som öppen fråga. Två regler motsäger underlaget: den globala regeln 401 → `/login` och "ingen delad klientcache" (som krockar med `user`-signalen). Ryggraden bör revideras innan oberoende byggare börjar.

Engelska namn i stället för exempelappens svenska är ett beslut (memlog rad 20) och redovisas inte som fynd. Att ordlistan saknas redovisas däremot som fynd (F4).

---

## Fynd

### F1 — Strikt CSP, Trusted Types och förbud mot `innerHTML` gäller redan nu, inte först när `html` bryts ut [high]

**Underlag:**
- design.md, Mallar: "aldrig `innerHTML`. XSS är uteslutet från start" och "Kompatibelt med strikt CSP och Trusted Types".
- design.md, Användning: "Fungerar offline och med `script-src 'self'`".
- user-stories 5 (aldrig `innerHTML`) och 6 (statiska filer, strikt CSP).

**I ryggraden:**
- Story 5 står som *Deferred: mallsäkerhet bryts ut med `html`*.
- Story 6 hänvisar till AD-2, men AD-2 säger ingenting om CSP.
- Ingen AD nämner CSP eller Trusted Types.

**Varför det spelar roll:**
- Exempelappen byggs först i ren JS. Det naturligaste i ren JS är `el.innerHTML = \`...${x}\``. Utan en regel nu skrivs vyerna med `innerHTML`, och sedan extraheras `html` ur fel mönster.
- Säkerhetslöftet "från start" blir då ett löfte "från utbrytningen".

**Motsägelse i underlaget som ryggraden måste lösa:** design.md påstår att appen fungerar med `script-src 'self'`. Men import mapen är ett *inline*-`<script type="importmap">`, och inline-skript blockeras av `script-src 'self'`. Det kräver en hash eller nonce. Externa import maps (`src`) stöds inte. Följder:
- Varje uppgradering av Sola ("en rad i import map", story 2) ändrar hashen. CSP-headern måste då uppdateras samtidigt, om inte hashen räknas fram automatiskt.

**Följdkrav för Trusted Types:**
- Sola måste tolka mallens statiska strängdelar till en `<template>`. Det är en TT-sink: `template.innerHTML`, `setHTMLUnsafe` eller `DOMParser`.
- Under `require-trusted-types-for 'script'` krävs då en namngiven TT-policy, till exempel `sola`, och appens CSP måste tillåta den (`trusted-types sola`).
- Det är ett kontrakt mellan `sola/` och den som sätter headers (`tools/` och servern), alltså ryggradsmaterial.

**Strikt `style-src 'self'`** blockerar också inline-`<style>` och `style="..."`-attribut i markup. Det binder den uppskjutna CSS-konventionen och komponenterna.

**Förslag:** En ny AD, till exempel "AD-13 — Strikt CSP och Trusted Types från första commit" (binder sola, tools, example):
- I `sola/` och `example/` är följande förbjudet:
  - `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, `setTimeout(string)`
  - inline-skript utom import mapen, inline-händelseattribut och inline-`<style>`/`style="..."`
- Ett enda undantag: Sola tolkar *endast mallarnas statiska strängdelar* via TT-policyn `sola`. Värden går aldrig genom HTML-tolkning.
- `sola dev` skickar samma CSP som produktion:

  ```
  default-src 'self'
  script-src 'self' 'sha256-<import map>'
  style-src 'self'
  connect-src 'self'
  require-trusted-types-for 'script'
  trusted-types sola
  ```

  Hashen räknas fram ur `index.html`, så att brott syns redan i dev och uppgradering förblir en rad.
- Kontrollera att Trusted Types ingår i Baseline 2026 (AD-12). Annars krävs ett uttryckligt beslut om funktionsdetektering, vilket AD-12 i dag förbjuder.
- Flytta story 5 och 6 i Capability Map från Deferred/AD-2 till den nya AD:n.

### F2 — Hur webbläsaren når både filerna och API:t på samma origin är inte bestämt [high]

**Underlag:**
- exempelapp.md, Byggordning 1: "en devserver med API och data i minnet".
- HttpOnly-cookie (design.md, exempelapp.md).
- `connect-src 'self'` och `script-src 'self'` (design.md).
- Story 6: statiska filer.
- Navigation API-routing med URL:er som `/utforare/:id`.

**I ryggraden:** AD-5 delar devservern i `tools/` (filer, live reload) och `example/server/` (API). Ryggraden säger inte hur de två möts, och AD-1 förbjuder `tools/` att importera från `example/`.

**Det som saknas:**
1. **Samma origin:** Cookie, `'self'` i CSP och undvikandet av CORS kräver att `/api/*` och appens filer serveras från samma origin. Ryggraden måste säga hur: `sola dev` proxar `/api/*` till en konfigurerad adress (till exempel `sola dev example --api http://localhost:3001`), eller API-servern skickas in som en handler via argument. Ingen import från `example/` behövs i något av fallen.
2. **SPA-fallback:** En direktlänk till `/providers/42` måste ge `index.html`, både i dev och i produktion. Det är ett krav på `sola dev` och på vilken statisk server som helst i drift (story 6).
3. **Absoluta sökvägar i `index.html`:** design.md:s exempel använder relativa `href="style.css"` och `src="app.js"`. Vid en direktlänk till `/providers/42` resolveras de till `/providers/app.js`. Regel: `index.html` refererar `/app.js` och `/style.css` (eller sätter `<base href="/">`).
4. **Monteringen:** Import mapen pekar på `/sola/sola.js` medan appens routes ligger på `/`. `sola dev` måste alltså servera `example/` som rot och `sola/` under `/sola/`. Det är inte nedskrivet.
5. **Reserverat namnutrymme för verktyget:** Live reload använder SSE (design.md), och appen använder SSE på `/api/events`. Verktygets egna sökvägar bör ligga under ett reserverat prefix, till exempel `/__sola/`, och live reload-klienten ska injiceras som *externt* skript (CSP, F1) och bara i dev.
6. **"CSS byts utan omladdning"** (design.md, Utvecklingsverktyg) saknas helt. Det binder hur CSS laddas: `<link rel="stylesheet">`-filer som kan bytas, och inte `<style>` som JS injicerar. Därför hör det hemma i ryggraden och i den uppskjutna CSS-konventionen.

**Förslag:** Utöka AD-5 med:
- samma origin via proxy eller injicerad handler
- SPA-fallback till `index.html` för sökvägar utan filändelse som inte börjar med `/api/`
- monteringskartan (`/` → `example/`, `/sola/` → `sola/`)
- prefixet `/__sola/` för verktyget
- CSS-byte utan omladdning för `<link>`-stilmallar

Lägg också till regeln: "`example/` ska fungera från vilken statisk server som helst plus API:t, givet SPA-fallback. Inget i appen får förutsätta `sola dev`."

### F3 — Kontraktet mellan router och vy, och den delade `user`-signalen, saknas. AD-8 och AD-9 motsäger underlaget [high]

**Underlag:**
- design.md, Routing och Auth guards: guarden "körs innan vyn laddas", returnerar `true` eller en omdirigeringsadress (`/login?next=...`), körs om när `user`-signalen ändras, och aktuell route är en signal.
- design.md, Komponenter: effekter "städas bort automatiskt".
- exempelapp.md: "Utförarens vyer laddas bara för den som är inloggad som utförare" och "Effekter som städas bort när vyn lämnas".
- exempelapp.md: `/` och `/utforare/:id` är öppna för alla.

**Luckor och motsägelser:**
1. **Vymodulens gränssnitt är odefinierat.** AD-10 säger att varje route har en vymodul som laddas med `import()`, men inte vad modulen exporterar eller hur den städas. Vyerna skrivs av olika byggare och `app.js` av en annan. Det är exakt den sortens gränssnitt en ryggrad ska låsa. Utan städkontrakt läcker SSE-lyssnare och `fetch` mellan vyer (design.md:s problem "Event listeners läcker").
2. **AD-8 "ingen delad klientcache" krockar med `user`-signalen.** Guards måste kunna svara synkront innan `import()`, och rollguarden ("bara utförare") behöver rollen. Den inloggade användaren *är* delat klienttillstånd. Den som bygger guards kommer antingen att bryta mot AD-8 eller anropa `/api/me` i varje guard.
3. **AD-9 "skicka användaren till `/login` vid 401" krockar med de publika vyerna.** En utloggad besökare på `/` som startar appen anropar `GET /api/me`, får `401` och skickas till `/login`. Det strider mot att `/` och `/providers/:id` är öppna för alla. Om `POST /api/login` svarar `401` vid fel lösenord laddas inloggningssidan dessutom om. Omdirigeringen tappar också `next`, som design.md:s guard bevarar.
4. **Ordningen "guard före `import()`"** står inte i ryggraden. Den är förutsättningen för att utförarens kod aldrig ska laddas för brukare.
5. **Vem äger `EventSource`?** AD-9 låser `fetch` till `api.js`, men SSE (AD-8) går via `EventSource`. Om varje vy öppnar en egen anslutning tar de, tillsammans med live reload-SSE:n, snabbt slut på HTTP/1.1-gränsen på 6 anslutningar per origin (`node:http` i dev).

**Förslag:**
- **AD-10 utökas med vykontraktet:** `export default function view({ params, signal })` returnerar en `Node`. Routern avbryter `signal` (en `AbortSignal`) när vyn lämnas. Alla lyssnare, `fetch`-anrop och SSE-prenumerationer i vyn kopplas till den signalen. Guards körs före `import()` och returnerar `true` eller en omdirigeringsadress som inkluderar `next`.
- **AD-8 får ett uttryckligt undantag:** "Den inloggade användaren är det enda delade klienttillståndet. Det ägs av `app.js` (senare `#sola`), hämtas med `GET /api/me` vid start, nollställs vid utloggning och vid varje `401`."
- **AD-9 preciseras:**
  - `401` från `/api/me` betyder `user = null` och ger ingen omdirigering.
  - Fel inloggningsuppgifter ger inte `401`. Ange vilken status som gäller, till exempel `400` eller `422` som Problem Details.
  - `401` från övriga anrop nollställer `user` och leder till `/login?next=<nuvarande sökväg>`.
  - `api.js` äger också den enda `EventSource`-anslutningen och exporterar en prenumerationsfunktion som tar en `AbortSignal`.

### F4 — Domänordlistan saknas, och konventionen för routes motsäger exempelappens routes [high]

**Underlag:** memlog rad 21 (question): "docs/exempelapp.md har svenska fält, routes och statusvärden; måste översättas till engelska innan bygget börjar." Frågan är inte stängd i loggen och syns inte i ryggraden, varken som beslut eller under Deferred.

**I ryggraden:** Bara exempel finns: `providerId`, `startsAt`, `getSlots`, `createBooking`, statusvärdena, rollerna, `/providers/:id`, `/api/bookings/:id` och `/api/events`. Det räcker inte för att servern, `api.js` och vyerna ska byggas oberoende och ändå passa ihop. Några av de val byggarna måste göra var för sig:

| exempelapp.md | Tänkbara varianter |
| --- | --- |
| `Tid` / `/api/tider` | `slot` / `time` / `timeSlot` (seed-filen heter `time-slot.js`, ER-diagrammet `SLOT`) |
| `start`, `slut` | `startsAt`/`endsAt` eller `start`/`end` |
| `ledig` | `available`, `isAvailable`, `free`, eller härledd |
| `minuter` | `minutes`, `durationMinutes` |
| `meddelande` | `message`, `note` |
| `?fran&till` | `?from&to` |
| `/boka/:tidId`, `/mina-bokningar`, `/schema`, `/tider`, `/bokningar/:id` | `/book/:slotId` eller `/slots/:id/book`, `/my-bookings`, `/schedule` ... |

**Motsägelse:** Konventionen "Routes och API-sökvägar: gemener, substantiv i plural" går inte ihop med flera av exempelappens routes: `/login`, `/boka/:tidId` (verb), `/mina-bokningar` och `/schema`. Ryggraden använder själv `my-bookings.js`. Det är inget plural substantiv på toppnivå.

**Semantik som också bör låsas, eftersom Spola ska följa samma kontrakt (AD-6):**
- `DELETE /api/bokningar/:id` betyder "avboka", men status `avbokad` finns, så bokningen ska *inte* raderas. Säg uttryckligen att DELETE sätter `cancelled` och frigör tiden, eller byt till `PATCH {status}`.
- Statusövergångarna och vem som får göra dem:
  - `pending` → `confirmed`/`rejected` (provider)
  - `pending`/`confirmed` → `cancelled` (customer)
- ER-diagrammet `SLOT ||--o| BOOKING` (högst en bokning per tid) motsäger att en tid kan bokas igen efter `cancelled` eller `rejected`. Invarianten bör vara "högst en *aktiv* (`pending`/`confirmed`) bokning per tid". `ledig`/`available` bör vara härledd på servern (AD-8: servern är facit) och inte lagras separat.

**Förslag:** Lägg till en sektion "Domänordlista" med en fullständig tabell från svenska till engelska för entiteter, fält, routes, API-sökvägar, query-parametrar, statusvärden och roller. Lägg till statusmaskinen. Justera konventionen till "API-resurser: gemener, plural substantiv; app-routes: gemener, kebab-case, enligt ordlistan". Stäng memlog-frågan.

### F5 — Solas Node-sida saknas: `package.json` `imports`, importerbarhet i Node, exempelappens tester [medium]

**Underlag:**
- design.md, Användning: "Samma specifier i `package.json` (`"imports": { "#sola": ... }`) gör att appkoden också fungerar i Node för tester."
- design.md, Mallar: "Samma `html` kan rendera till en sträng i Node".
- user-story 10.
- exempelapp.md: appen ger "konkreta exempel" på story 10.

**I ryggraden:**
- Det finns ingen `package.json` i Structural Seed.
- `#sola` definieras bara i import mapen. Valet av `#` är just Nodes syntax för subpath imports, men det står ingenstans.
- Story 10 är helt uppskjuten.

**Varför det spelar roll:** Om `sola.js` rör `document` eller `window` vid modulens toppnivå går den aldrig att importera i Node. Det kan inte rättas utan att API:t bryts, och samma gäller SSR. Den invarianten måste gälla från första utbrytningen, inte när testerna skrivs.

**Förslag:**
- Lägg till `package.json` i roten i Structural Seed: `"type": "module"`, `"imports": { "#sola": "./sola/sola.js" }`, inga `dependencies` eller `devDependencies`.
- Lägg till en regel i AD-3: "`sola.js` gör ingenting med DOM vid import. Webbläsarglobaler används först när en funktion anropas."
- Ange att `example/` utom vyerna (till exempel `api.js` och `server/`) ska gå att importera i Node.
- Om testerna skjuts upp bör ryggraden säga var de ska ligga (`*.test.js` bredvid källfilen eller `test/`) och att `sola test` = `node --test`.

### F6 — Löftena "läsbart på en kväll", "inga brytande ändringar" och "ett API för varje sak" saknar regler [medium]

**Underlag:**
- design.md, Positionering: "Läsbart på en kväll: hela runtime i en fil" och "löfte om inga brytande ändringar under lång tid".
- design.md, Slutsats: "Ha ett API för varje sak – parallella vägar splittrar ekosystemet".
- design.md: "Minifiering: Hoppa över".
- user-stories 1, 3 och 11.

**I ryggraden:**
- AD-3 ger en fil men ingen storleksgräns.
- Capability Map hänvisar story 3 till AD-2 och AD-3, men inget av dem håller filen läsbar.
- AD-4 förbjuder parallella *kopior* men inte parallella *API:er* i Sola. design.md erbjuder själv både funktionskomponenter och `define()`, så frågan uppstår.
- Det finns ingen kompatibilitetsregel. "Distribution och versioner" är uppskjutet, men löftet om stabilitet behöver en regel innan den första externa användaren finns.

**Förslag:**
- Lägg till en storleksgräns i AD-3, till exempel "`sola.js` ≤ N rader inklusive kommentarer, läsbar uppifrån och ned, aldrig minifierad, och en release är exakt den incheckade filen". Då förblir också `git diff` meningsfull (story 2).
- Lägg till regeln "En export per behov. Två exporter som löser samma sak är förbjudna."
- Lägg till under Deferred: "Kompatibilitetspolicy (inga brytande ändringar efter 1.0, bara stabila Baseline-API:er) bestäms senast före första release."

### F7 — Uppskjuten API-form utan de ramar designen redan satt [medium]

**Underlag** (design.md, Teknisk kärna):
- `signal`/`computed`/`effect` nära TC39-förslagets begrepp och bakom ett tunt lager, så att insidan kan bytas mot native (`.get()`/`.set()` i exemplen)
- ingen virtual DOM, komponenter är funktioner som körs en gång
- inga Custom Elements som grund
- mallen tolkas en gång, cachas i `WeakMap` och klonas via `<template>`
- effekter knyts till en ägare och städas
- aktuell route är en signal
- guarden returnerar `true` eller en adress

**I ryggraden:** "Solas API-form växer fram genom utbrytning (AD-4)". Det stämmer med arbetssättet, men utbrytningen görs av byggare eller agenter som inte har designens ramar framför sig. Ryggraden är deras underlag.

**Förslag:** Skriv in de ramar designen redan satt i Deferred-raden för API-formen, som "låsta riktningar, detaljerna växer fram". Då riskerar ingen utbrytning att landa i till exempel en vdom, Proxy-reaktivitet eller Custom Elements som grund.

### F8 — Produktionskrav som binder koden redan nu: modulepreload och hashade filnamn [medium]

**Underlag:** design.md, Produktion: "native ES-moduler, import maps, `modulepreload`, hashade filnamn, brotli via `node:zlib`". Inget byggsteg (Mål).

**I ryggraden:** Allt ligger under "Distribution och versioner / driftsättning". Det mesta kan vänta, men två saker binder appkoden i dag:
1. `sola build` måste kunna hitta modulgrafen utan att köra koden, både för `modulepreload` och för hashning. Därför måste alla `import` och `import()` ha *bokstavliga* specifiers. `import(\`./views/${name}.js\`)` gör grafen omöjlig att räkna ut.
2. Om filnamnen hashas utan att källan skrivs om (AD-2) måste det ske via en genererad import map som mappar varje modul-URL till sitt hashade namn. Det kräver att moduler bara refereras via import-specifiers och `<link>`/`<script>` i `index.html`, och inte via strängar som byggs ihop i runtime (`new URL(...)`, `fetch('/views/...')`).

**Förslag:**
- Lägg till regeln "bara bokstavliga specifiers i `import`/`import()`" i AD-10 eller AD-2.
- Notera i Deferred att `sola build` ska använda en genererad import map för hashade namn, aldrig omskrivning av källan, och att CSP-hashen för import mapen (F1) räknas fram i samma steg.

---

## Mindre fynd [low]

- **L1 — Exempelappen visar inte det dokumenterade användningssättet.** design.md och story 2 bygger på att `vendor/sola-x.y.z.js` checkas in och att uppgradering är en rad. `example/index.html` pekar i stället direkt på `/sola/sola.js`. Det är rimligt under utvecklingen, men det bör stå som ett medvetet avsteg, så att ingen tror att exempelappen demonstrerar story 2.
- **L2 — TypeScript.** design.md tillåter `typescript` som *enda* devDependency. AD-2 förbjuder alla devDependencies, vilket stämmer med memloggens constraint men är strängare än design.md. Skriv uttryckligen "JS med JSDoc-typer, inga `.ts`-filer", eftersom typborttagning i Node inte hjälper i webbläsaren. Då gör inte en byggare `.ts`-filer.
- **L3 — Node-version.** "22 LTS eller senare" följer design.md. Node 22 når end-of-life i april 2027, och flera av designens verktygs-API:er (`fs.glob`, typborttagning) är experimentella eller kräver flaggor i tidiga 22.x. Ange en lägsta minor-version eller lyft miniminivån, och notera det mot story 1 (tio år).
- **L4 — Utanför ramen saknas.** exempelapp.md utesluter betalning, notiser, återkommande tider och flera tidszoner. Ryggraden nämner inte detta. Med "ISO 8601 med offset" kan en byggare börja hantera tidszoner. Lägg en rad i Deferred eller i Scope: "En tidszon i UI. Betalning, notiser och återkommande tider ingår inte."
- **L5 — SSE-händelsens form.** AD-8 säger "något ändrades". Ange om händelsen har ett namn per resurs (`event: bookings`, `event: slots`) eller ett gemensamt namn. Annars hämtar vyer om för mycket eller för lite, och Spola kan välja annorlunda. Notera också att `EventSource` inte kan läsa en `401`, så utloggning upptäcks via nästa `fetch`.
- **L6 — Capability Map.** Story 6 → AD-2 och story 3 → AD-2/AD-3 är felaktiga hänvisningar (se F1 och F6). Story 8 bör också hänvisa till vykontraktet (F3).

## Utöver underlaget (inte krav från docs, men följer av AD-7)

- **CSRF och cookieattribut.** Underlaget säger bara HttpOnly. Eftersom Spola ska följa samma kontrakt bör AD-7 också låsa `SameSite=Lax` (eller `Strict`), `Secure` i drift och att muterande anrop kräver `Content-Type: application/json`. Annars bygger Node-servern och Spola olika CSRF-skydd. Flagga som en fråga till användaren, inte som ett krav.

## Kontrollerat och korrekt överfört

- Noll beroenden, inget byggsteg och Node som enda verktyg (AD-2).
- `#sola` via import map (AD-1, AD-3).
- Regeln om andra gången (AD-4).
- HttpOnly-sessionen och att guards bara är UX (AD-7).
- Navigation API och URLPattern utan fallback. Det är användarens beslut och avviker medvetet från design.md:s fallback-förslag (AD-12).
- Engelska i koden (AD-11).
- `import()` per vy (AD-10).
- Uppskjutna SSR, DOM-tester via CDP (sist enligt prioriteringen), formulärlager och distribution.
- Devserver och live reload först i `tools/`.
