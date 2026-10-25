# Sola – ett webbramverk utan beroenden

*Sammanfattning av designsamtal, oktober 2026*

## Namnet

**Sola** = Solid + Ola, på samma sätt som **Spola** = Spring + Ola.

- Solid är det ramverk som ligger närmast Solas design: signals, komponenter som körs en gång, ingen virtual DOM.
- Sola är Spola utan p – syskonnamn som hör ihop.
- Kort, utan å/ä/ö, går att uttala på alla språk.

Spola är en Spring-ersättare i Java med noll beroenden. Sola är samma idé för frontend. Tillsammans kan de bli en **fullstack helt utan beroenden**.

## Mål

Ett lika heltäckande ramverk som Angular, React och Vue – men med:

- **Noll beroenden i runtime.**
- **Noll beroenden i utvecklingsverktygen.** Node (22 eller senare) är det enda tillåtna.
- **Inget byggsteg.** Det som körs i webbläsaren är exakt det du skrev.

## Huvudidé

> Sola är det naturliga nästa steget från tre filer: `index.html`, `app.js` och `style.css`. Man ska aldrig behöva skriva om appen eller lägga till ett byggsteg när den växer.

**Arbetssätt:** uppfinn inte ramverket, extrahera det. Bygg en riktig liten app i ren HTML/JS/CSS tills det gör ont. När samma lösning skrivs för andra gången flyttas den in i Sola.

## Lärdomar från befintliga ramverk

| Ramverk | Smart | Dumt |
|---|---|---|
| React | UI som funktion av state, komponenter som funktioner | Virtual DOM, omrendering, hooks-regler, `useEffect`-fällor, komplexa Server Components |
| Angular | Verkligen komplett, TypeScript-first, DI | zone.js, NgModules, RxJS överallt – Angular har själva backat från det mesta |
| Vue | Finkornig reaktivitet, lättlästa komponentfiler | Två parallella API:er, kantfall i Proxy-reaktiviteten |

**Slutsats:** branschen har landat i signals med finkornig uppdatering utan virtual DOM. Ha ett API för varje sak – parallella vägar splittrar ekosystemet.

## Problem som uppstår när en app växer

| Problem | Löst av plattformen? | Sola behövs för |
|---|---|---|
| Data och DOM hamnar ur synk | Nej | Signals |
| JS-filen blir för stor | Ja – ES-moduler | – |
| Samma HTML upprepas | Nej | Komponenter |
| Listor ändras | Nej | Nycklade listor |
| CSS krockar | Mest – `@scope`, nesting, layers | En konvention |
| Event listeners läcker | Nej | Livscykel och städning |
| Flera vyer | Delvis – Navigation API, URLPattern | Tunn router |
| Serverdata | Nej | Mönster för asynkront state |
| Formulär | Mest – `FormData`, inbyggd validering | Tunt lager |

Ungefär hälften löser plattformen redan. Sola fyller bara luckorna.

## Teknisk kärna

### Signals

Signals är **inte native**. TC39-förslaget ligger i Stage 1 sedan april 2024 och har inte implementerats i någon webbläsare.

- Sola skriver egna `signal`, `computed` och `effect` (cirka 100–200 rader).
- Håll API:t nära förslagets begrepp men bakom ett tunt eget lager, så att insidan kan bytas om signals blir native.

### Mallar

Tagged template literals – `` html`...` `` – i stället för JSX eller eget templatespråk. Kräver ingen kompilering.

- Mallen tolkas en gång och cachas i en `WeakMap` (strängdelarna är samma objekt varje gång), sedan klonas den via `<template>`.
- Varje hål blir en textnod eller ett attribut, aldrig `innerHTML`. XSS är uteslutet från start.
- Kompatibelt med strikt CSP och Trusted Types.
- Samma `html` kan rendera till en sträng i Node, vilket ger SSR utan separat system.

### Komponenter

Vanliga funktioner som körs **en gång** och returnerar DOM-noder. Signals uppdaterar sedan exakt de noder som berörs.

```js
export function Counter({ start = 0 }) {
  const count = signal(start);
  return html`<button onclick=${() => count.set(count.get() + 1)}>
    Klick: ${count}
  </button>`;
}
```

- Effekter registreras i komponentens ägare och städas bort automatiskt när komponenten tas bort.
- Funktioner snarare än Custom Elements som grund: props blir riktiga värden, inget globalt register.
- Valfritt `define('min-knapp', Counter)` för den som vill bädda in i vanlig HTML.

### Routing

En routetabell, Navigation API, URLPattern och dynamisk `import()`.

```js
const routes = [
  { path: '/',          view: () => import('./views/home.js') },
  { path: '/login',     view: () => import('./views/login.js') },
  { path: '/users/:id', view: () => import('./views/user.js'), guard: requireLogin },
];
```

- Routern lyssnar på `navigate`-eventet och matchar med `URLPattern`.
- Aktuell route är en signal – allt som visar URL-parametrar uppdateras automatiskt.
- `import()` per vy ger koduppdelning utan bundler.
- Kontrollera webbläsarstöd för Navigation API och URLPattern. En fallback med History API är cirka 30 rader.

### Auth guards

```js
export const user = signal(null);

export const requireLogin = (to) =>
  user.get() ? true : `/login?next=${encodeURIComponent(to.pathname)}`;
```

- En guard returnerar `true` eller en omdirigeringsadress och körs innan vyn laddas.
- Eftersom `user` är en signal körs guarden om vid utloggning och omdirigerar direkt.
- **Guards är UX, inte säkerhet.** Servern (Spola) måste kontrollera behörighet vid varje anrop.
- **Sessionen ligger i en HttpOnly-cookie** som servern sätter, aldrig i `localStorage`.

## Utvecklingsverktyg – bara Node

| Behov | Lösning |
|---|---|
| Devserver | `node:http` + `fs.watch` (se `server.mjs`) |
| Live reload | Server-Sent Events; CSS byts utan omladdning |
| Tester | `node:test` (assertions, mocking, snapshots, coverage) |
| DOM-tester | Riktig Chrome headless via CDP och Nodes inbyggda `WebSocket` |
| TypeScript | Node strippar typer; typkontroll via JSDoc i editorn, eller `typescript` som enda devDependency (har själv noll beroenden) |
| CLI | `util.parseArgs`, `util.styleText`, `fs.glob` |
| Produktion | Ingen bundling: native ES-moduler, import maps, `modulepreload`, hashade filnamn, brotli via `node:zlib` |
| Minifiering | Hoppa över – brotli tar det mesta av vinsten |

Ett enda CLI: `sola dev`, `sola test`, `sola build`, `sola update`.

**Prioritering:** devserver och live reload först (litet, nytta direkt). Webbläsartester via CDP sist (mest jobb).

## Distribution

- **GitHub Releases** med **immutable releases** påslaget är sanningskällan. Filer och taggar kan inte ändras efter publicering, och varje release får en signerad attestering.
- **jsDelivr** för den som vill importera direkt från CDN: `cdn.jsdelivr.net/gh/konto/sola@v1.0.0/sola.js`, gärna med SRI-hash.
- **npm** som valfritt komplement – ett paket utan beroenden blir bara en fil i `node_modules`.
- **Undvik GitHub Packages** för publika paket: kräver inloggning även för att installera.
- **Undvik `raw.githubusercontent.com`** för import – serveras som `text/plain`.
- `sola update` hämtar senaste release via GitHubs API och verifierar SHA-256 med `node:crypto` (cirka 40 rader).

## Användning i en app

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

```js
import { signal, html, mount } from '#sola';
```

- Filen checkas in i git – `git diff` visar exakt vad som ändrats vid varje uppgradering.
- Uppgradering är en rad i import map.
- Fungerar offline och med `script-src 'self'`.
- Samma specifier i `package.json` (`"imports": { "#sola": "./vendor/sola-1.0.0.js" }`) gör att appkoden också fungerar i Node för tester.

## Positionering

- **Säkerhet i leveranskedjan:** inga npm-beroenden att granska.
- **Ramverket som inte behöver uppgraderas:** löfte om inga brytande ändringar under lång tid.
- **Läsbart på en kväll:** hela runtime i en fil.
- **Offentlig sektor och reglerade branscher:** WCAG/DOS-lagen, granskningsbarhet och långsiktig förvaltning – tillsammans med Spola en fullstack helt utan beroenden.

## Idéer att utforska

- Klicka på ett element i webbläsaren och hamna i rätt fil i editorn.
- Tillgänglighetsvarningar i dev-läge (knapp utan namn, input utan label).
- Testöverlägg i devsidan som visar gröna och röda tester bredvid appen.
- Signals som synkas till URL, `localStorage` eller servern med en rad.
- Mappstrukturen som router.

## Nästa steg

1. Välj en exempelapp med listor, formulär, flera vyer och serverdata (t.ex. ärendehantering eller bokning).
2. Bygg den i ren HTML/JS/CSS med `server.mjs` som devserver.
3. Extrahera signals och `html` när det första gör ont.
4. Fortsätt extrahera komponenter, router och guards i den ordning behoven uppstår.
5. Planera integrationen med Spola: servering, sessioner och auth.
