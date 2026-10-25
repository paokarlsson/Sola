# Sola

**Ett webbramverk utan beroenden.**

Sola är ett frontendramverk med samma ambition som Angular, React och Vue – men med noll beroenden i runtime, noll beroenden i utvecklingsverktygen och inget byggsteg. Det som körs i webbläsaren är exakt det du skrev. Sola är byggt för system som vill hålla nere förvaltningen: inga beroenden att uppdatera och inga migreringar mellan ramverksversioner.

Namnet kommer från **Solid + Ola**, på samma sätt som syskonprojektet [Spola](https://github.com/paokarlsson) (Spring + Ola) är en Spring-ersättare i Java utan beroenden. Tillsammans ska de bli en fullstack helt utan beroenden.

> **Status:** Designfas. Ingen kod är skriven ännu – se [docs/design.md](docs/design.md) för den fullständiga designen.

## Idén

Sola är det naturliga nästa steget från tre filer: `index.html`, `app.js` och `style.css`. Man ska aldrig behöva skriva om appen eller lägga till ett byggsteg när den växer.

Ramverket uppfinns inte, det **extraheras**: en riktig liten app byggs i ren HTML/JS/CSS tills det gör ont. När samma lösning skrivs för andra gången flyttas den in i Sola. Ungefär hälften av problemen som uppstår när en app växer löser webbplattformen redan – Sola fyller bara luckorna.

## Principer

- **Noll beroenden** – både i runtime och i verktygen. Node 24 eller senare är det enda som krävs.
- **Inget byggsteg** – native ES-moduler, import maps och dynamisk `import()` i stället för bundler.
- **Ett API per sak** – parallella vägar splittrar ekosystemet.
- **Läsbart på en kväll** – hela runtime i en fil.
- **Säkert från start** – inga `innerHTML`, kompatibelt med strikt CSP och Trusted Types.

## Så är det tänkt att se ut

```js
import { signal, html, mount } from '#sola';

export function Counter({ start = 0 }) {
  const count = signal(start);
  return html`<button onclick=${() => count.set(count.get() + 1)}>
    Klick: ${count}
  </button>`;
}
```

- **Signals** – egna `signal`, `computed` och `effect`, nära TC39-förslaget men bakom ett tunt lager.
- **Mallar** – tagged template literals (`` html`...` ``) som tolkas en gång, cachas och klonas via `<template>`. Fungerar även för SSR i Node.
- **Komponenter** – vanliga funktioner som körs en gång och returnerar DOM-noder. Signals uppdaterar exakt de noder som berörs, utan virtual DOM.
- **Routing** – en routetabell ovanpå Navigation API, URLPattern och `import()`, med guards för inloggning.

## Användning i en app

Sola levereras som en enda fil som checkas in i appen:

```
min-app/
  index.html
  app.js
  style.css
  vendor/
    sola-1.0.0.js
```

```html
<script type="importmap">
  { "imports": { "#sola": "/vendor/sola-1.0.0.js" } }
</script>
<link rel="stylesheet" href="style.css">
<script type="module" src="app.js"></script>
```

Uppgradering är en rad i import map, och `git diff` visar exakt vad som ändrats.

## Verktyg

Ett enda CLI byggt enbart på Node: `sola dev`, `sola test`, `sola build` och `sola update` – devserver med live reload, tester med `node:test`, och produktionsbygge utan bundling.

## Nästa steg

1. Välj en exempelapp med listor, formulär, flera vyer och serverdata.
2. Bygg den i ren HTML/JS/CSS med en enkel Node-devserver.
3. Extrahera signals och `html` när det första gör ont.
4. Fortsätt extrahera komponenter, router och guards i den ordning behoven uppstår.
5. Planera integrationen med Spola: servering, sessioner och auth.

## Läs mer

- [docs/design.md](docs/design.md) – sammanfattning av designsamtalen: lärdomar från andra ramverk, teknisk kärna, verktyg, distribution och positionering.
- [docs/user-stories.md](docs/user-stories.md) – user stories: vilka behov Sola möter för förvaltare, säkerhet och drift, utvecklare och fullstackteam.
- [docs/exempelapp.md](docs/exempelapp.md) – exempelappen, ett bokningssystem för brukare och utförare, som Sola ska brytas ut ur.
