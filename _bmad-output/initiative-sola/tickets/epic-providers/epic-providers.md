---
type: epic
title: "Utförare och tider: startsidan och /providers/:id"
parent: initiative-sola
covers: [R4, R12]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Utförare och tider: startsidan och /providers/:id

## Description

De första vyerna med data och den första routingen (exempelapp Byggordning 2). Vem som helst ser utförare och deras tjänster och lediga tider. `api.js` med sin första funktion, serverns datalager i minnet med seed-data, routetabellen i `app.js` och vymodulens kontrakt kommer här.

## Outcome

En besökare som inte är inloggad bläddrar från startsidan till en utförare och ser dess lediga tider.

## Done when

- `/` listar utförare med tjänster, och en länk leder till `/providers/:id`.
- `/providers/:id` visar tjänster och lediga tider för den kommande perioden, och en djuplänk dit fungerar.
- Vyerna följer AD-14 och hämtar bara via `api.js`. Det som har skrivits två gånger är utbrutet till `#sola` (AD-4).
- Serverns endpoints för utförare och lediga tider har tester i `node --test`. Allt är sammanslaget till main och körbart med startkommandot. Inga CSP-fel i konsolen.

## Boundaries

- Ingen bokningsknapp som fungerar. Bokning hör till epic-customer-flow.
- Ingen inloggning eller guard.

## References

- parent — _bmad-output/initiative-sola/initiative-sola.md, Requirements
- architecture — _bmad-output/initiative-sola/architecture-sola/architecture-sola.md, AD-6, AD-9, AD-10, AD-13, AD-14, AD-15, Domänkontrakt

## Notes

- Waits on epic-foundation because: skalet, proxyn och serverns skelett
- Decision: 2026-10-26 Pao (i epic-foundation): `api.js` och serverns datalager i minnet med seed-data skapas här, tillsammans med det första anropet och den första endpoint som läser dem.
