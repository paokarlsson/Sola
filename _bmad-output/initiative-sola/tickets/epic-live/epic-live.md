---
type: epic
title: "Live: vyerna uppdateras via Server-Sent Events"
parent: initiative-sola
covers: [R11, R12]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Live: vyerna uppdateras via Server-Sent Events

## Description

Serverpush med SSE, så att vyerna hämtar om sin data när en bokning eller en tid ändras (exempelapp Byggordning 6). Här kommer effekter som städas när vyn lämnas. Epic-release bygger på den färdiga appen.

## Outcome

Utförarens schema uppdateras utan omladdning när en brukare bokar i en annan flik. Det är initiativets demosignal.

## Done when

- `GET /api/events` skickar händelser enligt AD-17 till berörda användare och ger 401 utan session.
- Två flikar: när en brukare bokar eller avbokar uppdateras `/schedule` och `/bookings/:id` hos utföraren. När utföraren ändrar något uppdateras `/providers/:id` och `/my-bookings`.
- Efter att en vy har lämnats finns inga kvarvarande lyssnare, och strömmen stängs vid utloggning.
- Servertesterna i `node --test` är gröna. Allt är sammanslaget till main och körbart med startkommandot. Inga CSP-fel i konsolen.

## Boundaries

- Ingen optimistisk uppdatering och ingen delad cache (AD-8).

## References

- parent — _bmad-output/initiative-sola/initiative-sola.md, Requirements
- architecture — _bmad-output/initiative-sola/architecture-sola/architecture-sola.md, AD-5, AD-8, AD-14, AD-17

## Notes

- Waits on epic-foundation because: proxyn i sola dev som strömmar SSE (1.2); epikens stories får `after = ["1.2"]` när de planeras
- Waits on epic-provider-flow because: /schedule och de övriga vyerna som ska hämta om
