# Exempelapp: bokningssystem

Sola tas fram genom att bygga en riktig app i ren HTML/JS/CSS och bryta ut ramverket ur den (se [design.md](design.md)). Den här appen är den appen.

## Varför ett bokningssystem

Det är en typisk verksamhetsapp bakom inloggning – precis där Sola gör störst nytta: en SPA med flera vyer, två roller med olika behörighet, routing med parametrar, återanvända komponenter, allt via ett API och delar som laddas vid behov. Och den ska kunna leva länge med liten förvaltning.

## Roller

- **Brukare** – hittar en utförare, ser lediga tider, bokar, ser och avbokar sina bokningar.
- **Utförare** – lägger ut och tar bort tider, ser sitt schema och sina bokningar, bekräftar eller avvisar.

Domänen hålls generell: en utförare kan vara en frisör, en fysioterapeut eller en hemtjänstpersonal.

## Vyer

| Route | Roll | Innehåll |
|---|---|---|
| `/` | Alla | Startsida med utförare och tjänster |
| `/login` | Alla | Inloggning |
| `/utforare/:id` | Alla | En utförares tjänster och lediga tider |
| `/boka/:tidId` | Brukare | Bekräfta bokning, lägg till meddelande |
| `/mina-bokningar` | Brukare | Kommande och tidigare bokningar, avboka |
| `/schema` | Utförare | Veckoschema med tider och bokningar |
| `/tider` | Utförare | Lägg ut och ta bort tider |
| `/bokningar/:id` | Utförare | En bokning – bekräfta eller avvisa |

Utförarens vyer laddas bara för den som är inloggad som utförare.

## Datamodell

```
Användare  { id, namn, roll: 'brukare' | 'utforare' }
Tjänst     { id, utforareId, namn, minuter }
Tid        { id, utforareId, start, slut, ledig }
Bokning    { id, tidId, tjanstId, brukareId, status: 'väntar' | 'bekräftad' | 'avvisad' | 'avbokad', meddelande }
```

## API

JSON över REST. Sessionen ligger i en HttpOnly-cookie som servern sätter.

| Metod och sökväg | Roll | Gör |
|---|---|---|
| `POST /api/login`, `POST /api/logout` | Alla | Logga in och ut |
| `GET /api/me` | Inloggad | Aktuell användare |
| `GET /api/utforare`, `GET /api/utforare/:id` | Alla | Utförare och deras tjänster |
| `GET /api/utforare/:id/tider?fran&till` | Alla | Lediga tider |
| `GET /api/bokningar` | Inloggad | Egna bokningar (brukare) eller bokningar hos mig (utförare) |
| `POST /api/bokningar` | Brukare | Boka en tid |
| `DELETE /api/bokningar/:id` | Brukare | Avboka |
| `PATCH /api/bokningar/:id` | Utförare | Bekräfta eller avvisa |
| `POST /api/tider`, `DELETE /api/tider/:id` | Utförare | Lägg ut och ta bort tider |
| `GET /api/handelser` | Inloggad | Server-Sent Events när en bokning ändras |

Under utvecklingen är servern en liten Node-server med data i minnet. Senare tar Spola över.

## Vad appen kräver av Sola

| I appen | Sola behöver |
|---|---|
| Inloggning, roller, utloggning | `user`-signal och guards |
| Alla routes ovan | Router med URLPattern och parametrar |
| Lediga tider, schema, bokningslistor | Signals och nycklade listor |
| Boka, lägga ut tider | Formulär |
| Tidskort, statusmärke, veckovy, dialog | Komponenter |
| Hämta och spara via API | Asynkront state |
| Utförarens vyer bara för utförare | `import()` per vy |
| Schemat uppdateras när någon bokar | Effekter som städas bort när vyn lämnas |

## Koppling till user stories

Appen ger konkreta exempel på [user stories](user-stories.md) 6–10 (statiska filer, tre filer att börja med, automatisk uppdatering, vyer som laddas vid behov, tester i Node) och 12 (inloggning som Spola sedan tar över).

## Byggordning

Varje steg byggs i ren HTML/JS/CSS. När samma lösning skrivs för andra gången flyttas den in i Sola.

1. **Grund:** `index.html`, `app.js`, `style.css` och en devserver med API och data i minnet.
2. **Utförare och tider:** startsidan och `/utforare/:id` – första listorna och första routingen.
3. **Inloggning:** `/login`, sessionscookie och guards.
4. **Brukarens flöde:** boka, mina bokningar, avboka – formulär och asynkront state.
5. **Utförarens flöde:** schema, tider, bekräfta – laddas vid behov.
6. **Live:** schemat uppdateras via Server-Sent Events.

## Utanför ramen

Betalning, notiser via mejl och sms, återkommande tider och flera tidszoner.
