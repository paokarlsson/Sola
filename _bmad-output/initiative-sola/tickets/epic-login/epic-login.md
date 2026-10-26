---
type: epic
title: "Inloggning: /login, sessionscookie och currentUser"
parent: initiative-sola
covers: [R5, R6, R12]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Inloggning: /login, sessionscookie och currentUser

## Description

In- och utloggning med en sessionscookie som servern sätter, och `session.js` som äger `currentUser` (exempelapp Byggordning 3). Guards hör inte hit, utan till epic-customer-flow och epic-provider-flow (beslut 2026-10-26 i initiativet). Epic-customer-flow och epic-provider-flow bygger på `session.js`, `currentUser` och kontrollen av `Content-Type` och `Origin` på skrivande anrop.

## Outcome

En användare loggar in på `/login`, ser sitt namn i sidhuvudet och loggar ut. Servern känner igen sessionen via cookien.

## Done when

- `POST /api/login` sätter en cookie med attributen i AD-7, och fel uppgifter ger `invalid-credentials` med en svensk text i klienten.
- `GET /api/me` ger användaren med giltig session och 401 utan. `POST /api/logout` tar bort sessionen.
- Skrivande anrop utan `Content-Type: application/json` eller med fel `Origin` avvisas.
- `currentUser` sätts vid start och efter in- och utloggning (AD-16), och `next` följs bara om den är rotrelativ.
- Servertesterna i `node --test` är gröna. Allt är sammanslaget till main och körbart med startkommandot. Inga CSP-fel i konsolen.

## Boundaries

- Guards och 403 hör till epic-customer-flow och epic-provider-flow.
- Ingen registrering och inget lösenordsbyte. Användarna finns i serverns data i minnet.

## References

- parent — _bmad-output/initiative-sola/initiative-sola.md, Requirements
- architecture — _bmad-output/initiative-sola/architecture-sola/architecture-sola.md, AD-7, AD-16, AD-6

## Notes

- Waits on epic-providers because: routern i app.js som /login läggs i
- Decision: 2026-10-26 Pao (i epic-foundation): Proxyn i `sola dev` skickar `Host` oförändrad, så servern jämför `Origin` mot `Host` på samma sätt i utveckling och i drift (AD-7). Användare med lösenord läggs till i serverns data här.
