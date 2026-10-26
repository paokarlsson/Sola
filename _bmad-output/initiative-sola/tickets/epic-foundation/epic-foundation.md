---
type: epic
title: "Grund: sola dev, server och appens skal"
parent: initiative-sola
covers: [R1, R2, R3, R12, R13]
sources: [_bmad-output/initiative-sola/initiative-sola.md, docs/exempelapp.md]
companions: [_bmad-output/initiative-sola/architecture-sola/architecture-sola.md]
after: []
refined: true
risk: high
---

# Grund: sola dev, server och appens skal

## Description

Sätter upp de tre enheterna och den gemensamma grunden som alla andra epiker bygger på: `sola dev`, skelettet till `example/server/`, appens skal (`index.html`, `app.js`, `style.css`) och testkörningen med `node --test` (exempelapp Byggordning 1). Det här är plattformsgrunden för initiativet, och spårvägen genom alla lager provas här först.

## Outcome

En utvecklare startar exemplet med två kommandon och ser startsidans skal under strikt CSP, med live reload, utan att installera något.

## Requirements

- R1 (parent R1): En utvecklare startar exemplet med `node example/server` och `node tools/sola.mjs dev example/web --mount /sola/=sola/ --api http://localhost:3001` och ser startsidans skal, utan installation.
- R2 (parent R2; AD-5): `sola dev` serverar roten på `/` och monterade kataloger på sina prefix. På GET med `Accept: text/html` som inte matchar en fil svarar den med rotens `index.html`.
- R3 (parent R2; AD-5, AD-7): `sola dev` proxar `/api/*` oförändrat till `--api`, inklusive `Host`, cookies och strömmande SSE. Ett test i `node --test` mot en stubbe uppströms visar att `Host`, `Cookie` och `Set-Cookie` går igenom oförändrade och att en SSE-händelse når klienten innan svaret avslutas.
- R4 (parent R2; AD-5): En ändrad fil under roten eller en mount laddar om sidan, och en ändrad CSS-fil byts utan omladdning. Det sker via en reload-klient som `sola dev` injicerar som extern modul under `/__sola/`, och ingen fil i `example/` känner till `/__sola/`.
- R5 (parent R3; AD-20): `sola dev` skickar CSP-headern i AD-20 med sha256 av import map-blocket i den HTML som serveras. Ett test i `node --test` visar att hashen stämmer, och skalet visar inga CSP-fel i konsolen.
- R6 (parent R12; AD-3): `sola/sola.js` finns, och appen når den via `#sola`: i webbläsaren genom import map i `index.html`, i Node genom `imports` i `package.json`.
- R7 (parent R13): `node --test` utan argument kör testerna för `sola dev` och `example/server` grönt, utan installation.
- R8 (parent R1; exempelapp Byggordning 1; AD-6): `example/server` svarar på okända `/api/*` med 404 `application/problem+json` och `type` `/problems/not-found`.

## Constraints

- Noll beroenden, inte heller devDependencies. Inget byggsteg. Endast Node ≥ 24.12 (parent Constraints; AD-2).
- `sola dev` är generisk: `tools/` importerar aldrig från `example/` och känner inte till appens routes. `example/server/` serveras aldrig (AD-1, AD-5).
- Inga HTML-sänkor i `sola/` eller `example/`, och inga inline-skript eller inline-stilar utöver import map (parent Constraints; AD-15, AD-20).
- Engelska i kod, filnamn och sökvägar, och kebab-case för filer (AD-11, Consistency Conventions).
- `sola dev` och `example/server` exporterar var sin startfunktion som tar port 0, och CLI:t är ett tunt skal runt den. Testerna ligger som `*.test.js` bredvid koden (beslut 2026-10-26).
- Ingen lösning bryts ut till `sola.js` förrän den skrivs för andra gången (parent Constraints; AD-4).

## Done when

- `node example/server` och `node tools/sola.mjs dev example/web --mount /sola/=sola/ --api http://localhost:3001` visar startsidans skal.
- `node --test` är grönt och visar djuplänkar som får `index.html`, en proxy som släpper igenom `Host`, cookies och SSE oförändrat, CSP-headern med rätt hash, den injicerade reload-klienten, att `#sola` går att importera i Node och serverns 404 `not-found`.
- Pao bekräftar i webbläsaren att konsolen inte visar några CSP-fel, att en ändrad JS-fil laddar om sidan och att en ändrad CSS-fil byts utan omladdning.
- `package.json` har inga beroenden, och allt är sammanslaget till main.

## Boundaries

- Inga vyer med data. Startsidans innehåll hör till epic-providers.
- Inget datalager och ingen seed-data i servern, och ingen `api.js`. Båda kommer i epic-providers tillsammans med den första endpointen och det första anropet.
- Inga exporter i `sola.js`. Den första kommer med den första utbrytningen (AD-4).
- Inga inloggningsendpoints. De hör till epic-login, som jämför `Origin` mot den `Host` som proxyn släpper igenom.
- `sola test`, `sola build` och `sola update` hör till epic-release.

## References

- parent — _bmad-output/initiative-sola/initiative-sola.md, Requirements
- architecture — _bmad-output/initiative-sola/architecture-sola/architecture-sola.md, AD-1, AD-2, AD-3, AD-5, AD-6, AD-7, AD-20, Structural Seed

## Notes

- Decision: 2026-10-26 Pao: `example/server` är i epik 1 ett skelett: `node:http`, JSON, Problem Details och 404 `not-found` på okända `/api/*`. Datalagret i minnet och seed-datan kommer med den första endpoint som läser dem i epic-providers. Användare med lösenord kommer i epic-login.
- Decision: 2026-10-26 Pao: `api.js` skapas i epic-providers tillsammans med sitt första anrop och läggs inte till som tom fil i epik 1.
- Decision: 2026-10-26 Pao: `sola/sola.js` är en tom modul, och `app.js` gör `import '#sola'`. Ingen `version`-export.
- Decision: 2026-10-26 Pao: Proxyn skickar `Host` oförändrad, så att servern jämför `Origin` mot `Host` på samma sätt i utveckling och i drift (AD-7).
- Decision: 2026-10-26 Pao: `sola dev --port` har 3000 som standard, och `example/server` läser `PORT` med 3001 som standard.
- Decision: 2026-10-26 Pao: Kontrollen i webbläsaren av CSP-fel, omladdning och CSS-byte är ett manuellt steg för Pao i epikens avslutande verifiering, eftersom DOM-tester ligger utanför initiativet.
- Decision: 2026-10-26 Pao: Ingen spike. Den första storyn är den mest osäkra: `sola dev` serverar skalet under CSP med rätt hash.
