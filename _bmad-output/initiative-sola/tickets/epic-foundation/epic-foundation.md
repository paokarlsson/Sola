---
type: epic
title: "Grund: sola dev, server och appens skal"
parent: initiative-sola
covers: [R1, R2, R3, R12, R13]
sources: []
companions: []
after: []
refined: false
risk: high
---

# Grund: sola dev, server och appens skal

## Description

Sätter upp de tre enheterna och den gemensamma grunden som alla andra epiker bygger på: `sola dev`, `example/server/` med data i minnet, appens skal och testkörningen med `node --test` (exempelapp Byggordning 1). Det här är plattformsgrunden för initiativet, och spårvägen genom alla lager provas här först.

## Outcome

En utvecklare startar exemplet med två kommandon och ser startsidans skal under strikt CSP, med live reload, utan att installera något.

## Done when

- `node example/server` och `node tools/sola.mjs dev example/web --mount /sola/=sola/ --api http://localhost:<port>` visar startsidans skal utan CSP-fel i konsolen.
- En djuplänk till en app-route svarar med `index.html`. `/api/*` proxas oförändrat, inklusive cookies och strömmande SSE. Det bevisas i `node --test` mot en stubbe uppströms, eftersom riktiga cookies kommer först i epic-login och `/api/events` först i epic-live.
- En ändrad JS-fil laddar om sidan, och en ändrad CSS-fil byts utan omladdning.
- `package.json` har inga beroenden, och `node --test` kör testerna för `sola dev` och `example/server/` grönt.
- `sola/sola.js` finns och importeras från appen via `#sola`. Allt är sammanslaget till main.

## Boundaries

- Inga vyer med data. Startsidans innehåll hör till epic-providers.
- Inga inloggningsendpoints. De hör till epic-login.
- `sola test`, `sola build` och `sola update` hör till epic-release.

## References

- parent — _bmad-output/initiative-sola/initiative-sola.md, Requirements
- architecture — _bmad-output/initiative-sola/architecture-sola/architecture-sola.md, AD-1, AD-2, AD-3, AD-5, AD-20, Structural Seed
