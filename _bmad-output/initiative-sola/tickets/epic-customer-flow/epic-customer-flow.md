---
type: epic
title: "Brukarens flöde: guards, boka, mina bokningar, avboka"
parent: initiative-sola
covers: [R5, R6, R7, R8, R12]
sources: []
companions: []
after: []
refined: false
risk: high
---

# Brukarens flöde: guards, boka, mina bokningar, avboka

## Description

Brukaren bokar, ser sina bokningar och avbokar (exempelapp Byggordning 4). Här kommer guards, formulär och asynkront state. Epiken äger guards på brukarens vyer och omdirigeringen till `/login?next=`.

## Outcome

En inloggad brukare bokar en ledig tid med ett meddelande, ser den under Mina bokningar och avbokar den.

## Done when

- En utloggad användare på `/book/:slotId` eller `/my-bookings` hamnar på `/login?next=` och kommer tillbaka efter inloggningen. En utförare på dessa routes skickas till `/`.
- En brukare bokar från `/providers/:id` via `/book/:slotId` med ett meddelande, och bokningen syns som `pending` på `/my-bookings`.
- Avbokning ger `cancelled` (AD-18), och tiden går att boka igen. Att boka en upptagen tid ger `slot-taken` med en svensk text.
- Brukarens API-anrop ger 403 för en utförare. Servertesterna i `node --test` är gröna.
- Det som har skrivits två gånger är utbrutet till `#sola`. Allt är sammanslaget till main och körbart med startkommandot. Inga CSP-fel i konsolen.

## Boundaries

- Att bekräfta och avvisa hör till epic-provider-flow.
- Ingen live-uppdatering. Den hör till epic-live.

## References

- parent — _bmad-output/initiative-sola/initiative-sola.md, Requirements
- architecture — _bmad-output/initiative-sola/architecture-sola/architecture-sola.md, AD-8, AD-10, AD-13, AD-14, AD-16, AD-18

## Notes

- Waits on epic-providers because: /providers/:id med lediga tider att boka från
- Waits on epic-login because: session, currentUser och 401 från servern
