---
type: initiative
title: "Sola: ramverket bryts ut ur en bokningsapp som går att köra"
parent: none
sources: [docs/design.md, docs/user-stories.md, docs/exempelapp.md]
companions: [_bmad-output/initiative-sola/architecture-sola/architecture-sola.md]
after: []
risk: medium
---

# Sola: ramverket bryts ut ur en bokningsapp som går att köra

## Description

Bokningsappen i `docs/exempelapp.md` byggs steg för steg i ren HTML/JS/CSS enligt byggordningen. Allt som skrivs en andra gång flyttas till `sola/sola.js`. När initiativet är klart finns en app där brukare och utförare går igenom sina flöden. Den körs med `sola dev` mot en Node-server med data i minnet, och ramverket den behövde har brutits ut ur den, utan beroenden och utan byggsteg (`docs/design.md`, Huvudidé och Nästa steg 1–4).

## Outcome

För Pao och AI-agenterna som bygger finns ett ramverk som är bevisat på en riktig app med två roller, routing, formulär, serverdata och live-uppdatering. Signalen är byggordningens steg 6: schemat uppdateras live medan en brukare bokar (`docs/exempelapp.md`, Byggordning).

## Requirements

- R1 (story 7; exempelapp Byggordning 1): En utvecklare startar exemplet med `node example/server` och `sola dev` och ser startsidan i webbläsaren, utan installation.
- R2 (design Utvecklingsverktyg; AD-5): `sola dev` serverar en katalog och svarar med `index.html` på djuplänkar. Den proxar `/api/*` till servern, laddar om sidan när en fil ändras och byter CSS utan omladdning.
- R3 (story 6; AD-20): Appen körs under den strikta CSP som `sola dev` skickar, utan CSP-fel i konsolen.
- R4 (exempelapp Vyer `/`, `/providers/:id`): Vem som helst ser utförare med tjänster på startsidan, och en utförares tjänster och lediga tider på `/providers/:id`.
- R5 (exempelapp Roller; design Auth guards; story 12): En användare loggar in och ut, och sessionen ligger i en HttpOnly-cookie som servern sätter. En utloggad användare på en skyddad vy hamnar på `/login?next=` och kommer tillbaka efter inloggningen.
- R6 (exempelapp Vyer; design Auth guards): Rollvyer visas bara för sin roll, och fel roll skickas till `/`. Servern svarar 401 utan session och 403 utan behörighet, på varje anrop.
- R7 (exempelapp Roller Brukare): En brukare bokar en ledig tid med ett meddelande, ser kommande och tidigare bokningar och avbokar.
- R8 (exempelapp Datamodell): En tid har högst en aktiv bokning. Den som bokar en upptagen tid får ett begripligt fel, och en avbokad eller avvisad tid kan bokas igen.
- R9 (exempelapp Roller Utförare): En utförare lägger ut och tar bort tider, ser veckoschemat med tider och bokningar och bekräftar eller avvisar en bokning.
- R10 (exempelapp Vyer; story 9): Utförarens vyer laddas med `import()` först när en inloggad utförare navigerar dit. En brukare hämtar aldrig deras moduler.
- R11 (exempelapp Byggordning 6; story 8): När en bokning eller tid ändras uppdateras berörda vyer hos andra inloggade användare utan omladdning.
- R12 (design Huvudidé; exempelapp Vad appen kräver av Sola; story 7, 11): Varje lösning som har skrivits två gånger i appen ligger i `sola/sola.js`, och appen importerar den bara via `#sola`.
- R13 (story 10; design Utvecklingsverktyg): Alla tester i repot körs med bara Node (`node --test`), utan installation.

## Constraints

- Noll beroenden i runtime och verktyg, inte heller devDependencies. Endast Node ≥ 24.12 och webbläsarens egna API:er (design Mål; story 4; AD-2).
- Inget byggsteg: ingenting transformeras innan det körs (design Mål; AD-2).
- Ramverket extraheras, det uppfinns inte. En lösning flyttas till Sola när den skrivs för andra gången, i samma commit som alla förekomster byts ut (design Huvudidé; AD-4).
- Inga HTML-sänkor (`innerHTML` med flera) i `sola/` eller `example/`, från första raden (story 5; AD-15).
- Webbläsare: Chrome/Edge 102, Firefox 147, Safari/iOS 26.2. Inga polyfills och ingen History API-fallback (design Routing; AD-12).
- Kontrakten i ryggraden för domän, API, session, händelser och bokningstillstånd binder servern, så att Spola kan ta över utan ändringar i klienten (story 12; AD-6, AD-7, AD-13, AD-17, AD-18).

## Done when

- Hela byggordningen körs i `sola dev` mot `example/server/`. En brukare och en utförare går igenom sina flöden i två flikar, och utförarens schema uppdateras live när brukaren bokar.
- `package.json` har inga beroenden, ingenting i repot kräver installation eller transformering, och `node --test` är grönt.
- Ingen lösning finns två gånger i `example/web/`. Det som delas ligger i `sola/sola.js` och importeras via `#sola`.
- En sökning hittar inga HTML-sänkor i `sola/` eller `example/`, och webbläsarkonsolen visar inga CSP-fel.
- Varje epik är sammanslagen till main och körbar med startkommandot i ryggraden.

## Boundaries

- Utanför (exempelapp Utanför ramen): betalning, notiser via mejl och sms, återkommande tider och flera tidszoner.
- Utanför (ryggraden, Deferred): första release med distribution, versioner, `vendor/`, `sola build`, `sola update`, `sola test`, `node:test`-tester för `sola.js` och DOM-tester i headless Chrome. Dessutom Spola-integration, driftsättning, SSR, persistens och CI.
- Utanför: listan "Idéer att utforska" i design.md.
- Spola berörs inte. Servern följer kontrakten som Spola senare tar över.
- Spårvägen genom epikerna: `sola dev` serverar `example/web/` och proxar `/api/*` till `example/server/`. En vy hämtar data via `api.js` och renderar den, och sedan bryts det som upprepas ut till `#sola`.

## References

- architecture — _bmad-output/initiative-sola/architecture-sola/architecture-sola.md (AD-1..AD-20, Domänkontrakt, Structural Seed, Deferred)
- design — docs/design.md, Mål, Huvudidé, Teknisk kärna, Utvecklingsverktyg, Nästa steg
- stories — docs/user-stories.md, 1–12
- app — docs/exempelapp.md, Roller, Vyer, Datamodell, API, Byggordning, Utanför ramen

## Notes

- Assumption: Listan "Vad appen kräver av Sola" i exempelapp.md är en förväntan och inget krav. Vad som bryts ut avgörs av andra-gången-regeln (AD-4).
- Assumption: Att en epik levereras till produktion betyder att den är sammanslagen till main och körbar med startkommandot, eftersom driftsättning är uppskjuten i ryggraden.
- Open question: Hör första release (`sola test`, `sola build`, `sola update`, distribution, `vendor/`, tester för `sola.js`) till det här initiativet eller till ett eget? Förslag: ett eget initiativ, eftersom ryggraden skjuter upp det. Pao avgör.
- Source conflict: exempelapp Byggordning – steg 1 står två gånger. Den första raden (`example/web/`, `sola dev`, `example/server/`) stämmer med AD-5, och den andra är en kvarleva.
