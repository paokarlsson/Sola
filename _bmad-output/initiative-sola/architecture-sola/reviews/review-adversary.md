---
review: adversary
target: architecture-sola.md
context: [.memlog.md, docs/exempelapp.md, docs/design.md, docs/user-stories.md]
date: '2026-10-25'
verdict: 'Ryggraden håller enheterna isär men lämnar själva kontraktet mellan dem odefinierat. Två agenter som följer AD-1..AD-12 till punkt och pricka bygger med stor sannolikhet appar som inte går ihop.'
---

# Adversarial granskning av arkitekturryggraden för Sola

## Verdikt

AD-1 till AD-12 drar bra **gränser**, alltså vem som får importera vad och vem som får anropa `fetch`. Det som ska gå **över** gränserna är däremot inte fastlagt: entiteternas form, vymodulens signatur, hur `sola dev` och appens API delar origin, vem som äger den inloggade användaren, SSE-händelsernas format och bokningens tillstånd. Alla fyra hål högst upp i rankningen uppstår med nästan full säkerhet redan i byggsteg 1–3 enligt `docs/exempelapp.md`. Hålen kan inte upptäckas genom att läsa enheterna var för sig, eftersom varje enhet för sig följer alla AD:er.

Dessutom finns tre interna motsägelser (se avsnittet [Motsägelser](#motsägelser-i-ryggraden)):

- AD-4 står mot AD-9.
- ER-diagrammet stämmer inte med att en tid kan bokas om.
- Routekonventionen ("substantiv i plural") stämmer inte med de routes appen behöver.

## Metod

För varje par av enheter en nivå ner har jag konstruerat två implementationer som båda följer varje AD bokstavligt men ändå inte fungerar ihop. Jag har prioriterat divergenser som en människa eller en AI-agent faktiskt skulle göra, och rankat dem efter sannolikhet × påverkan (H/M/L).

## Rankning

| # | Hål | Par | Sannolikhet | Påverkan | Åtgärd |
| --- | --- | --- | --- | --- | --- |
| 1 | Domänen saknar kanoniska engelska namn och former | `server/` ↔ `api.js` ↔ vyer ↔ Spola | H (säker) | H | Ny AD-13 |
| 2 | Origin, rotkatalog och `/sola/sola.js` i dev är odefinierade | `tools/` ↔ `example/server/` ↔ `index.html` | H (säker) | H | Skärpt AD-5 och ny AD-14 |
| 3 | Vymodulens kontrakt och livslängd saknas | `app.js` ↔ `views/*` ↔ `views/*` | H | H | Ny AD-15 |
| 4 | Ingen äger den inloggade användaren, och 401-flödet loopar | `app.js` (guards) ↔ `api.js` ↔ `views/login.js` | H | H | Ny AD-16 och skärpt AD-9 |
| 5 | SSE-händelsernas format och anslutningens ägare | `server/` ↔ `api.js`/vyer ↔ Spola | H | M–H | Ny AD-17 |
| 6 | Bokningens tillståndsmaskin och vem som äger "ledig" | `server/` ↔ Spola ↔ vyer | M–H | H | Ny AD-18 |
| 7 | Komponentkontraktet är oklart och `innerHTML` är tillåtet före `html` | `components/*` ↔ `views/*` | H | M–H (XSS) | Ny AD-19 |
| 8 | Svarsformer: inbäddning eller id, och endpoints som saknas | `server/` ↔ vyer | H | M | Ingår i AD-13 |
| 9 | Parallella utbrytningar och appkunskap i `sola.js` | agent A ↔ agent B ↔ `sola.js` | M | M–H | Skärpt AD-4 och AD-1 |
| 10 | Problem Details: `type`, fältfel och språk | `server/` ↔ `api.js` ↔ Spola | H | M | Skärpt AD-6 |
| 11 | Tid: `Z` eller `+01:00`, och semantiken för `from`/`to` | `server/` ↔ vyer ↔ Spola | M | M | Skärpt AD-6 |
| 12 | Delad JS mellan klient och server i `example/` | `server/` ↔ `api.js` | M | M | Ny AD-20 |
| 13 | Strikt CSP och import map inline | `tools/` ↔ `index.html` | M | L–M | Notering |
| 14 | Node 22 och URLPattern i tester | `sola.js` ↔ `tools/` (test) | M | L–M | Skärpt Stack |

---

## 1. Domänen saknar kanoniska engelska namn och former

**Par:** `example/server/` (agent A) ↔ `example/api.js` och vyer (agent B) ↔ Spola (senare).

**Varför båda följer reglerna:** AD-11 kräver engelska och konventionstabellen kräver camelCase. Memloggen har en öppen fråga: *"docs/exempelapp.md har svenska fält … måste översättas till engelska innan bygget börjar."* Den frågan besvaras ingenstans i ryggraden. Varje agent översätter därför själv:

| Svenska (exempelapp.md) | Agent A | Agent B | Ryggraden |
| --- | --- | --- | --- |
| `Tid` | `Slot` | `TimeSlot` / `timeSlot` | `SLOT`, `getSlots` (bara ett exempel) |
| `start`, `slut` | `start`, `end` | `startsAt`, `endsAt` | `startsAt` (bara ett exempel) |
| `ledig` | `available` | `isFree` | – |
| `minuter` | `minutes` | `durationMinutes` | – |
| `meddelande` | `message` | `note` | – |
| `utforareId` | `providerId` | `performerId` | `providerId` |
| `?fran&till` | `?from&to` | `?start&end` | – |
| `/boka/:tidId` | `/book/:slotId` | `/bookings/new?slot=` | Routes ska vara "substantiv i plural", vilket inte går för `boka` |
| `/schema` | `/schedule` | `/schedules` | samma motsägelse |

Alla kolumnerna följer AD-11. Ingen av dem fungerar ihop med de andra. Spola kommer dessutom att översätta på ett tredje sätt, och AD-5 kräver att Spola ska kunna ta över "utan ändring i appen".

**En fälla till:** agent B väljer `/bookings/new` för bokningsvyn medan utförarens vy ligger på `/bookings/:id`. Då beror det på ordningen i routetabellen om URLPattern matchar `new` som ett id.

**Åtgärd: ny AD-13 — Domänkontraktet är fastlagt i ryggraden [ADOPTED]**

- **Binds:** example, Spola
- **Prevents:** att server, `api.js`, vyer och Spola översätter domänen var för sig.
- **Rule:** Entiteter, fält, statusvärden, routes och API-sökvägar har exakt de engelska namn som tabellerna nedan anger. `docs/exempelapp.md` är bakgrund. När den och ryggraden säger olika gäller ryggraden. Ett nytt fält eller en ny sökväg läggs till i tabellen i samma ändring som koden. Läsningar av `Booking` bäddar in `slot` och `service` som hela objekt, och `customer` och `provider` som `{ id, name }`. Skrivningar tar bara id. Fält som servern härleder, som `available`, går inte att skriva.

```text
User     { id, name, role: 'customer' | 'provider' }
Service  { id, providerId, name, durationMinutes }
Slot     { id, providerId, startsAt, endsAt, available }      // available härleds av servern
Booking  { id, slotId, serviceId, customerId, status, message,
           slot, service, customer, provider }                 // de fyra sista bara i svar
```

| Route | Roll | | API | Roll |
| --- | --- | --- | --- | --- |
| `/` | alla | | `POST /api/login` `{ username, password }` → `User` | alla |
| `/login?next=` | alla | | `POST /api/logout` → 204 | inloggad |
| `/providers/:id` | alla | | `GET /api/me` → `User` | inloggad |
| `/book/:slotId` | customer | | `GET /api/providers`, `GET /api/providers/:id` (med `services`) | alla |
| `/my-bookings` | customer | | `GET /api/providers/:id/slots?from&to` (bara lediga) | alla |
| `/schedule` | provider | | `GET /api/slots?from&to` (egna, alla) | provider |
| `/slots` | provider | | `POST /api/slots`, `DELETE /api/slots/:id` | provider |
| `/bookings/:id` | provider | | `GET /api/bookings`, `GET /api/bookings/:id` | inloggad |
| | | | `POST /api/bookings` `{ slotId, serviceId, message }` | customer |
| | | | `DELETE /api/bookings/:id` (se AD-18), `PATCH /api/bookings/:id` `{ status }` | se AD-18 |
| | | | `GET /api/events` (se AD-17) | inloggad |

Ändra också konventionen för routes till: *"gemener i kebab-case; samlingar i plural (`/providers/:id`); sidor som inte är resurser får ett engelskt ord (`/login`, `/schedule`, `/book/:slotId`)"*.

> Hål 8 ingår här. `docs/exempelapp.md` saknar `GET /api/bookings/:id`, som vyn `/bookings/:id` behöver, och ett sätt för utföraren att lista **alla** sina tider, inklusive bokade, till `/schedule` och `/slots`. Utan dem gör agent A `GET /api/bookings` och filtrerar i klienten, medan agent B lägger till en endpoint som Spola inte känner till. Inbäddningsregeln ovan stoppar också N+1-hämtningar i `/my-bookings` (tid, tjänst och utförarens namn för varje bokning) och skillnaden mellan vyer som slår ihop data själva och vyer som förväntar sig färdiga objekt.

---

## 2. Origin, rotkatalog och `/sola/sola.js` i dev är odefinierade

**Par:** `tools/` (`sola dev`) ↔ `example/server/` ↔ `example/index.html`.

**Varför båda följer reglerna:** AD-5 lägger filservering och live reload i `tools/` och API:t i `example/server/`. AD-1 förbjuder `tools/` att importera från `example/`. Bokstavligt tolkat ("får bero på `sola/` och endast via `#sola`") förbjuder AD-1 också `example/` att importera från `tools/`. Ingen av enheterna får alltså starta den andra. Ändå måste de dela origin: sessionen är en HttpOnly-cookie (AD-7), och `fetch('/api/…')` och `EventSource('/api/events')` är relativa till sidans origin.

Fyra lagliga implementationer som inte går ihop:

1. `sola dev` kör på `:3000` och `example/server` på `:3001`. Då är anropen cross-origin, cookien följer inte med utan CORS och `credentials`, och SSE går sönder. `api.js` hårdkodar `http://localhost:3001`, vilket inte gäller under Spola.
2. `sola dev` serverar `example/` som rot. Då pekar import map-målet `/sola/sola.js` (strukturfröet) **utanför roten** och ger 404.
3. `sola dev` serverar repots rot. Då hamnar appen på `/example/`, vilket krockar med `/` och de andra absoluta routes som URLPattern matchar.
4. Om `example/` är rot serveras `/server/*.js` som statiska filer. **Serverkoden och dess seedade användare och lösenord blir läsbara från webbläsaren.**

Det finns fler glipor:

- **SPA-fallback.** Om `sola dev` saknar fallback ger djuplänken `/providers/abc` 404. Om fallbacken är naiv och `index.html` använder `src="app.js"` (relativt) laddas `/providers/app.js`, får `index.html` som svar och kraschar på MIME-typen.
- **Live reload.** Live reload behöver en egen SSE-sökväg och ett klientskript. Agent A injicerar `<script>` i HTML-svaret. Agent B lägger skriptet i `index.html`, och då känner appen till verktyget. Sökvägen kan också krocka med `/api/events`.
- **Uppgradering.** Design.md (och user story 2) bygger på `vendor/sola-x.y.z.js` och en import map-rad. Exempelappens `/sola/sola.js` provar alltså inte uppgraderingsflödet som `sola update` senare ska skriva om.

**Åtgärd: skärpt AD-5 och ny AD-14 — En origin, en statisk rot [ADOPTED]**

- **Binds:** tools, example, Spola
- **Prevents:** cross-origin-cookies, serverkod som serveras statiskt, djuplänkar som ger 404 och att verktyget och appen känner till varandra.
- **Rule:**
  - Appens statiska filer ligger i `example/web/`. `example/server/` ligger utanför den katalogen och serveras aldrig.
  - `sola dev <root> [--mount <url-prefix>=<dir>]… [--api <url>]` gör fyra saker. Den serverar `<root>` på `/`. Den monterar kataloger generiskt; exemplet startas med `--mount /sola/=sola/`. Den proxar `/api/*` oförändrat till `--api`, inklusive cookies och strömmande SSE. Och den svarar med `<root>/index.html` på GET-anrop utan filändelse som har `Accept: text/html` och inte börjar med `/api/`.
  - Verktygets egna sökvägar ligger under `/__sola/`. Verktyget injicerar själv sin reload-klient i HTML-svar. Ingen fil i `example/` refererar till `/__sola/`.
  - Alla URL:er i `index.html` är rotrelativa (`/app.js`, `/style.css`).
  - Ingen route i appen får börja med `/api/`, `/sola/` eller `/__sola/`, eller heta som en fil eller katalog i `<root>`.
  - I drift (Spola eller annan) gäller samma sak: en origin, statiska filer och `/api/*` sida vid sida.

---

## 3. Vymodulens kontrakt och livslängd saknas

**Par:** `app.js` (routern) ↔ `views/providers.js` (agent A) ↔ `views/schedule.js` (agent B).

**Varför båda följer reglerna:** AD-10 säger bara att varje route har en vymodul som laddas med `import()`. Agent A skriver `export default function (params) { return node; }`. Agent B skriver `export async function render(container, { id })` och `export function unmount()`. Båda följer AD-10. `app.js` kan bara anropa den ena formen, och en tredje agent som skriver routern väljer vilken vy som går sönder.

AD-8 gör saken värre eftersom den kräver omhämtning både efter egen ändring och vid varje SSE-händelse:

- **Racet.** Ett anrop som startar av en SSE-händelse kan komma tillbaka **efter** ett anrop som startar av en egen ändring. Då visar vyn ett äldre tillstånd. Det är precis det AD-8 skulle förhindra ("Servern är facit"), och ändå följer koden regeln.
- **Läckan.** En vy som har lämnats får fortfarande SSE-händelser och skriver till frånkopplad DOM. Den städning som design.md beskriver ("effekter som städas bort när vyn lämnas") finns inte förrän den har brutits ut, och ingen regel säger hur vyer ska städa innan dess.
- **Parameterbyte.** Vid `/providers/a` → `/providers/b` monterar routern i agent A:s version om vyn, medan vyn i agent B:s version förväntar sig en parametersignal och aldrig hämtar om.

**Åtgärd: ny AD-15 — Vymodulens kontrakt [ADOPTED]**

- **Binds:** example (`app.js`, `views/`)
- **Prevents:** vyer som routern inte kan anropa, inaktuella svar som skriver över nyare, och lyssnare som överlever sin vy.
- **Rule:**
  - Varje vymodul har en enda export: `export default async function View({ params, query, signal })`. Den returnerar en `Node` som `app.js` sätter in i `#app`.
  - `signal` är en `AbortSignal` som `app.js` avbryter när vyn lämnas. Alla lyssnare, timrar, SSE-prenumerationer och API-anrop i vyn binds till den.
  - En vy laddar sin data med en enda `load()`. Varje nytt anrop till `load()` avbryter det föregående, så det senast startade anropet vinner.
  - Om parametrar eller query ändras skapar routern en ny vyinstans.
  - Kontraktet byts först när routern bryts ut till Sola, och då i en enda ändring enligt AD-4.

---

## 4. Ingen äger den inloggade användaren, och 401-flödet loopar

**Par:** `app.js` (guards) ↔ `api.js` (401 → `/login`) ↔ `views/login.js`.

**Varför båda följer reglerna:** Guards finns bara i `app.js` (AD-10) och måste veta rollen **innan** `import()` körs (exempelapp.md: "utförarens vyer laddas bara för den som är inloggad som utförare"). AD-8 förbjuder delad klientcache. Därför finns tre lagliga ägare:

- Agent A håller `let currentUser` i `app.js` och låter `login.js` importera `app.js` för att sätta värdet. Det ger en cirkulär import, men AD-10 förbjuder bara att vyer importerar vyer.
- Agent B tolkar AD-8 bokstavligt och låter varje guard anropa `getMe()` vid varje navigation.
- Agent C lägger `user` i `api.js` och nollställer det vid 401.

Alla tre följer reglerna. De ger tre olika svar på frågan "är jag inloggad?".

AD-9 ("skickar användaren till `/login` vid `401`") ger dessutom loopar som följer reglerna till punkt och pricka:

- **Publik startsida.** `/` är publik, men sidhuvudet anropar `getMe()` för att visa namnet. En utloggad besökare skickas då till `/login` från en publik sida.
- **Fel lösenord.** Om servern svarar `401` på `POST /api/login` gör `api.js` en navigation till `/login` och felmeddelandet försvinner.
- **Formatet på `next`.** Guarden skriver `next=pathname` (design.md) medan `api.js` skriver `next=pathname+search`, eller ingenting. `login.js` följer `next` utan kontroll, vilket ger en öppen omdirigering via `next=//evil.example`.
- **Navigeringssättet.** `api.js` gör `location.href = '/login'` (helsidesladdning) medan `app.js` använder `navigation.navigate`. Det ger två routingvägar trots AD-12.
- **Vyn efter 401.** Vyn som väntade på svaret får ett avvisat promise och visar "Unauthorized" en kort stund innan navigationen sker.

**Åtgärd: ny AD-16 — Sessionstillstånd i klienten [ADOPTED]**, med skärpning av AD-9.

- **Binds:** example
- **Prevents:** flera ägare av den inloggade användaren, omdirigeringsloopar och öppna omdirigeringar.
- **Rule:**
  - `app.js` äger `currentUser`. Värdet sätts från `getMe()` vid start och efter `login()`/`logout()`, och rensas vid 401.
  - Vyer läser `currentUser` men skriver det aldrig. Det är den enda tillåtna klientkopian av serverdata. Den ersätts av Solas `user`-signal när den bryts ut.
  - `getMe()` returnerar `null` vid 401. `login()` avvisar med `Problem` vid fel lösenord. I inget av fallen omdirigerar `api.js`.
  - För alla andra 401 gäller tre saker. `api.js` anropar en `onUnauthorized`-callback som `app.js` registrerar. `app.js` navigerar med `navigation.navigate('/login?next=' + encodeURIComponent(pathname + search))`. Anropet avvisas med en `AbortError` som vyer ignorerar.
  - `login.js` följer `next` bara om värdet börjar med `/` men inte med `//`.
  - En guard som nekar en inloggad användare med fel roll skickar till `/`, inte till `/login`.

---

## 5. SSE-händelsernas format och anslutningens ägare

**Par:** `example/server/` ↔ `api.js`/vyer ↔ Spola.

**Varför båda följer reglerna:** AD-6 anger bara sökvägen och AD-8 anger bara betydelsen ("något ändrades"). Servern i agent A:s version skickar `event: booking` med `data: {"id":"…"}`. Agent B skriver standardhändelsen `message` med `data: {"type":"booking.updated"}`. I klienten lyssnar `addEventListener('booking', …)`, som aldrig anropas för `message`, eller tvärtom. Båda följer reglerna och ingen vy uppdateras. Spola blir en tredje variant.

Fler glipor:

- **Vem öppnar anslutningen.** AD-9 talar om `fetch`, och `EventSource` är inte `fetch`. Ett sidhuvud, schemat och `/my-bookings` kan alltså öppna var sin anslutning. Det bryter i och för sig mot "inga API-sökvägar i vyer", men en komponent är ingen vy.
- **401 på strömmen.** `EventSource` exponerar ingen status. Med utgången session återansluter den i oändlighet och 401-regeln i AD-9 träffar aldrig.
- **Missade händelser.** Ändringar som sker medan anslutningen är nere går förlorade. Klienten i agent A:s version hämtar om vid `open`, medan agent B:s inte gör det och visar inaktuell data.
- **Vilka ändringar räknas.** Exempelappen talar om "när en bokning ändras". Om en utförare tar bort en tid skickas kanske ingen händelse, och `/providers/:id` hos brukaren visar då en tid som inte längre finns.

**Åtgärd: ny AD-17 — Händelseströmmen [ADOPTED]**

- **Binds:** example, Spola
- **Prevents:** händelser som ingen lyssnar på, flera anslutningar och inaktuell data efter återanslutning.
- **Rule:**
  - `GET /api/events` skickar bara händelser utan namn (`message`) med `data: {"type":"<entity>.changed","id":"<id>"}`, där `entity` är `booking` eller `slot`.
  - Varje skrivning som ändrar en bokning eller tid ger en händelse till alla berörda användare.
  - Utan session svarar servern `401` innan strömmen öppnas.
  - `api.js` äger den enda `EventSource` och exporterar `onChange(listener, { signal })`. Lyssnaren anropas för varje händelse **och** vid varje (åter)anslutning.
  - `api.js` stänger strömmen vid `logout()`. Vid `error` kontrollerar den sessionen med `getMe()` innan den återansluter.
  - Klienten hämtar om och litar aldrig på innehållet i `data` (AD-8).

---

## 6. Bokningens tillståndsmaskin och vem som äger "ledig"

**Par:** `example/server/` ↔ Spola ↔ vyer.

**Varför båda följer reglerna:** Ingen AD anger tillåtna övergångar eller vad `DELETE /api/bookings/:id` betyder.

- **Avbokning.** Servern i agent A:s version tar bort posten vid `DELETE`. Agent B (och kanske Spola) sätter `status: 'cancelled'`. `/my-bookings` ska visa "tidigare bokningar", men den avbokade bokningen syns bara i den ena varianten.
- **Vem äger `available`.** `Slot.available` (`ledig`) kan lagras som en flagga som `POST /api/bookings` sätter, men att återställa den vid `cancelled` eller `rejected` glöms lätt bort. Det kan också härledas från bokningarna. Klienten kan dessutom räkna fram "ledig" själv genom att filtrera bort tider som har en bokning. Det ger tre ägare av samma faktum.
- **ER-diagrammet.** Diagrammet säger `SLOT ||--o| BOOKING` (högst en bokning). Det går inte ihop med att en avbokad tid kan bokas igen.
- **Ogiltiga övergångar.** Vad händer om brukaren avbokar en bekräftad bokning? Om utföraren tar bort en tid som är bokad: kaskad eller `409`? Klientens knappar visas efter en logik och servern spärrar efter en annan.

**Åtgärd: ny AD-18 — Bokningens tillstånd [ADOPTED]**

- **Binds:** example, Spola
- **Prevents:** olika betydelser av `DELETE`, flera ägare av `available` och olika tillåtna övergångar i klient och server.
- **Rule:**
  - Servern äger alla övergångar. Övergångarna är:
    - `pending` → `confirmed` eller `rejected` (provider, `PATCH`).
    - `pending` eller `confirmed` → `cancelled` (customer, `DELETE`, som **inte** tar bort posten och svarar 200 med `Booking`).
  - Andra övergångar ger `409` som Problem Details.
  - En tid har högst en bokning i `pending` eller `confirmed`. `available` härleds av servern från det.
  - `DELETE /api/slots/:id` på en tid med en aktiv bokning ger `409`.
  - Klienten visar en åtgärd bara om tabellen tillåter den för rollen. Servern är ändå den som avgör.
  - Rätta ER-diagrammet till `SLOT ||--o{ BOOKING`.

---

## 7. Komponentkontraktet är oklart och `innerHTML` är tillåtet före `html`

**Par:** `components/time-slot.js` (agent A) ↔ `views/schedule.js` (agent B) ↔ `components/booking-dialog.js` (agent C).

**Varför båda följer reglerna:** Konventionen säger "PascalCase för komponenter" men inte vad en komponent är.

- **Tre former.** Agent A skriver `TimeSlot(slot)` som returnerar `HTMLElement`. Agent C skriver `bookingDialog({ booking, onConfirm })` som returnerar en **HTML-sträng**. En tredje variant definierar `<time-slot>` som Custom Element. Alla tre följer AD-10 ("delad kod via `example/components/`").
- **Data i komponenter.** AD-8 säger "en vy hämtar sin data". En komponent är ingen vy, och ett `ProviderCard` som anropar `getProvider()` själv följer alltså reglerna. Det ger återigen flera ägare och N hämtningar.
- **XSS.** User story 5 ("ingen `innerHTML`") skjuts upp till utbrytningen av `html`. Fram till dess får en vy skriva ut brukarens `message` med `innerHTML` i utförarens vy. Det ger **lagrad XSS** som följer alla AD:er. Dessutom blockeras inline-`onclick` av den strikta CSP som story 6 kräver.

**Åtgärd: ny AD-19 — Komponenter och DOM [ADOPTED]**

- **Binds:** example, sola
- **Prevents:** inkompatibla komponentformer, komponenter som hämtar data och XSS innan `html` finns.
- **Rule:**
  - En komponent är en funktion `PascalCase(props)` som returnerar en `Node`.
  - Komponenter får data via props och rapporterar ändringar via callbacks i props. Bara vyer anropar `api.js`.
  - `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` och inline-händelseattribut är förbjudna i `example/` och `sola/` från första raden. Text sätts med `textContent` eller noder.

---

## 9. Parallella utbrytningar och appkunskap i `sola.js`

**Par:** agent A ↔ agent B, som båda bryter ut till `sola/sola.js`.

**Varför båda följer reglerna:** AD-4 säger "när den skrivs för andra gången … i samma commit". Två agenter som arbetar parallellt ser var sin andra förekomst:

- **Två namn för samma sak.** Agent A exporterar `list(items, key, render)` och agent B `each(items, render, { key })`. Det ger två API:er för samma sak, mot design.md ("ett API för varje sak").
- **Samma namn med olika semantik.** Agent A exporterar `signal` med `.value` och agent B med `.get()`/`.set()`. Konflikten uppstår i en enda fil och hela appen påverkas.
- **AD-4 mot AD-9.** `api.js` innehåller N funktioner som alla gör `fetch` → tolka Problem Details → hantera 401. Det är "andra gången", så AD-4 **kräver** att mönstret bryts ut till `sola.js`. Då anropar `sola.js` `fetch`, vilket AD-9 förbjuder ("Endast `example/api.js` anropar `fetch`").
- **Appkunskap i `sola.js`.** Agent B bryter ut hjälparen med `'/login'` och `/api/` hårdkodade. AD-1 förbjuder bara *imports* från `example/`. Strängar med appkunskap uppfyller regelns bokstav men bryter mot syftet.

**Åtgärd: skärpt AD-4 och AD-1**

- **AD-4, tillägg:**
  - Utbrytningar görs en i taget. Den som bryter ut tar först namnet i exportlistan överst i `sola.js`. Namn tas från design.md när de finns där (`signal`, `computed`, `effect`, `html`, `mount`, `define`).
  - En export har ett namn och en form. En utbrytning som ändrar en befintlig export uppdaterar alla anrop i samma commit.
  - Mönster som upprepas *inom* `api.js` får brytas ut till en privat hjälpare i `api.js`. De blir Sola-API först när en andra app eller Spola-integrationen behöver dem.
- **AD-1, tillägg:** `sola.js` innehåller inga app-routes, API-sökvägar, domänfält, statusvärden eller svenska texter. Allt sådant skickas in som argument.

---

## 10. Problem Details: `type`, fältfel och språk

**Par:** `example/server/` ↔ `api.js` ↔ Spola.

**Varför båda följer reglerna:** RFC 9457 lämnar `type` öppet, och tillägg är fria.

- **`type`.** Servern i agent A:s version skickar `type: "about:blank"` överallt. Agent B skickar `type: "/problems/slot-taken"`. `api.js` grenar på `status` i det ena fallet och `type` i det andra.
- **Fältfel.** Formulär (byggsteg 4) behöver fel per fält. Agent A använder `errors: [{ field, message }]` och agent B `invalidParams: [{ name, reason }]`.
- **Språk.** Vyn visar `detail` direkt för användaren. Nodeservern skriver svenska och Spola engelska. Det bryter mot AD-11 utan att någon enskild enhet gör fel.

**Åtgärd: skärpt AD-6**

- `type` är en relativ URI `/problems/<kebab-case>` ur en lista i ryggraden: `invalid-credentials`, `validation`, `slot-taken`, `invalid-transition`, `not-found`, `forbidden`, `unauthorized`.
- Valideringsfel använder tillägget `errors: [{ field, message }]`.
- Klienten visar egna svenska texter, valda efter `type` och `field`. Serverns `title` och `detail` visas aldrig för användaren.

---

## 11. Tid: `Z` eller `+01:00`, och semantiken för `from`/`to`

**Par:** `example/server/` ↔ `views/schedule.js` ↔ Spola.

**Varför båda följer reglerna:** AD-6 säger "ISO 8601 med offset", och både `…T08:00:00Z` och `…T09:00:00+01:00` uppfyller det.

- **Sortering.** Vyn sorterar på strängen, vilket fungerar för agent A:s server (alltid `Z`) men ger fel ordning när Spola blandar offset kring sommartidsskiftet.
- **`from`/`to`.** `?from=2026-10-26` (datum) står mot `?from=2026-10-26T00:00:00+01:00` (tidpunkt). Om gränsen är inkluderande eller exkluderande avgör om måndagens första tid visas.
- **Dygnsgränser.** Veckovyn delar upp per dag efter webbläsarens zon i agent A:s version och efter `Europe/Stockholm` i agent B:s.

**Åtgärd: skärpt AD-6**

- Servern skickar alltid UTC (`Z`).
- `from` och `to` är tidpunkter med `Z`. Intervallet är halvöppet: `from` ingår, `to` ingår inte.
- Klienten jämför aldrig tidssträngar. Den tolkar dem och räknar dygn och veckor i webbläsarens lokala zon. Flera zoner ligger utanför ramen (exempelapp.md).

---

## 12. Delad JS mellan klient och server i `example/`

**Par:** `example/server/` ↔ `example/api.js`.

**Varför båda följer reglerna:** AD-1 reglerar bara `example/` mot `sola/` och `tools/`. En agent lägger `statuses.js` och valideringen i `example/shared/` och importerar dem från både servern och klienten. Det följer reglerna, men logiken kan inte följa med när Spola (Java) tar över, och klienten börjar lita på validering som Spola inte har.

**Åtgärd: ny AD-20 — HTTP är enda gränsen i exemplet [ADOPTED]**

- **Binds:** example
- **Prevents:** logik som bara finns i Node-servern och inte kan följa med till Spola.
- **Rule:** `example/server/` och `example/web/` importerar aldrig från varandra. Allt de delar står i AD-13 och AD-17/18.

---

## 13. Strikt CSP och import map inline (notering)

Story 6 kräver strikt CSP. Import map måste ligga inline (`<script type="importmap">` har inget `src`). Med CSP-huvudet `script-src 'self'` i `tools/` blockeras alltså appens import map, och utan huvudet provas story 6 aldrig. Kalla det inte uppskjutet utan att säga hur: anteckna att CSP i dev skickas med en `sha256-`hash av import map-blocket, som `sola dev` räknar ut generiskt, eller att CSP uttryckligen skjuts upp till distribution.

## 14. Node 22 och URLPattern i tester (notering)

Stacken säger "Node 22 LTS eller senare". Så vitt jag vet är `URLPattern` global först i Node 23.8/24. När router-tester i Node (story 10, uppskjutet) körs under Node 22 saknas `URLPattern`, medan Node 24 har det. Kontrollera detta och sätt i så fall golvet till **Node 24 LTS** innan `sola test` byggs.

---

## Motsägelser i ryggraden

1. **AD-4 mot AD-9:** En fetch-hjälpare som upprepas måste brytas ut enligt AD-4 men får inte anropa `fetch` utanför `api.js` enligt AD-9. Se hål 9.
2. **ER-diagrammet mot domänen:** `SLOT ||--o| BOOKING` gör det omöjligt att boka om efter en avbokning. Se hål 6.
3. **Routekonventionen mot routes:** "Substantiv i plural" går inte ihop med `/login`, `/schedule`, `/book/:slotId` och `/my-bookings` (som står som exempel i konventionstabellen). Se hål 1.
4. **Strukturfröet mot AD-1/AD-5:** `example/server/` ligger i samma katalog som de statiska filerna, och import map-målet `/sola/sola.js` ligger utanför appens rot. Se hål 2.
5. **Öppen fråga i memloggen:** Översättningen av `docs/exempelapp.md` är markerad som ett krav "innan bygget börjar" men har inget beslut. Se hål 1.

## Rekommenderad ordning

1. AD-13 (domänkontrakt) och AD-14 (en origin, `example/web/`). Båda behövs redan i byggsteg 1.
2. AD-15 (vymodul) och AD-16 (session och 401). Båda behövs innan byggsteg 2–3.
3. AD-18 (tillstånd) och AD-19 (komponenter, ingen `innerHTML`). Båda behövs innan byggsteg 4.
4. AD-17 (händelser) innan byggsteg 6, och skärpningen av AD-6 innan formulären.
5. Skärp AD-4 och AD-1 innan den första utbrytningen.
