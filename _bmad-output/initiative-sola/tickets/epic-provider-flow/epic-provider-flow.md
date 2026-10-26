---
type: epic
title: "Utförarens flöde: schema, tider, bekräfta"
parent: initiative-sola
covers: [R6, R8, R9, R10, R12]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Utförarens flöde: schema, tider, bekräfta

## Description

Utföraren hanterar sina tider och bokningar, och vyerna laddas bara för utförare (exempelapp Byggordning 5). Epiken äger rollguarden för utförare.

## Outcome

En inloggad utförare lägger ut tider, ser veckoschemat och bekräftar eller avvisar en bokning.

## Done when

- `/slots` lägger ut och tar bort tider. Att ta bort en tid med en aktiv bokning ger 409 med en svensk text.
- `/schedule` visar veckans tider och bokningar, och `/bookings/:id` bekräftar eller avvisar en bokning enligt AD-18. En avvisad tid går att boka igen.
- En brukare eller en utloggad användare når inte utförarens vyer, och nätverkspanelen visar att deras moduler aldrig hämtas.
- Utförarens API-anrop ger 403 för en brukare. Servertesterna i `node --test` är gröna.
- Det som har skrivits två gånger är utbrutet till `#sola`. Allt är sammanslaget till main och körbart med startkommandot. Inga CSP-fel i konsolen.

## Boundaries

- Ingen live-uppdatering av schemat. Den hör till epic-live.

## References

- parent — _bmad-output/initiative-sola/initiative-sola.md, Requirements
- architecture — _bmad-output/initiative-sola/architecture-sola/architecture-sola.md, AD-10, AD-14, AD-16, AD-18

## Notes

- Waits on epic-login because: session och currentUser med roll
- Waits on epic-customer-flow because: guards i app.js och bokningar att bekräfta och avvisa
