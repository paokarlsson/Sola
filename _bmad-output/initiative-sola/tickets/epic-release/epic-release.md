---
type: epic
title: "Första release: tester, sola test, sola build, sola update och distribution"
parent: initiative-sola
covers: [R14, R15, R16, R17]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Första release: tester, sola test, sola build, sola update och distribution

## Description

Sola släpps första gången, när appen har gett `sola.js` dess API (design Distribution, Utvecklingsverktyg; beslut 2026-10-26 i initiativet).

## Outcome

En utvecklare hämtar en verifierad `sola.js` från en oföränderlig release, och exempelappen körs från `vendor/` och uppgraderas med en rad.

## Done when

- Exporterna i `sola.js` har `node:test`-tester, och `sola test` kör alla tester grönt med bara Node.
- `sola build` ger en produktionsversion med hashade filnamn, `modulepreload` och brotli utan bundling, och utdatan serveras med `sola dev <utkatalog>` utan CSP-fel.
- Den första releasen är publicerad som en oföränderlig GitHub Release med attestering och går att importera från jsDelivr.
- `sola update` hämtar releasen och verifierar SHA-256. Exempelappen körs från `vendor/sola-x.y.z.js` via import map, och allt är sammanslaget till main.
- Ryggraden är uppdaterad för `vendor/`: `package.json`-imports, import map, startkommando och Deferred-raden om distribution. Ändringen görs med `bmad-architecture`.

## Boundaries

- Inget npm-paket och inga DOM-tester i headless Chrome (initiativets Boundaries).
- Ingen driftsättning av exempelappen.
- Touch point: GitHub-repot paokarlsson/Sola (publikt, immutable releases påslaget); owner: epic-release, manuellt steg för Pao.
- Touch point: jsDelivr (`gh/`-import ur det publika repot); owner: epic-release.

## References

- parent — _bmad-output/initiative-sola/initiative-sola.md, Requirements
- architecture — _bmad-output/initiative-sola/architecture-sola/architecture-sola.md, Deferred (Distribution, Tester för `sola.js`), AD-2, AD-3

## Notes

- Waits on epic-live because: en färdig app vars utbrytningar har gett sola.js dess API
- Decision: 2026-10-26 Pao: Repot görs publikt före första release. Det, att slå på immutable releases och själva publiceringen, som inte går att ångra, är manuella steg för Pao.
