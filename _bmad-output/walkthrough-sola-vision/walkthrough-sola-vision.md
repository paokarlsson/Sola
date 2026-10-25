# Genomgång: Solas vision

Mål för genomgången: granska Solas vision i [docs/design.md](../../docs/design.md) och [README.md](../../README.md), och ta fram user stories som Sola löser.

Aktuellt block: **1. Syfte**

Ram (användarens): bara möjligheter, inga hinder eller problem.

## [ ] 1. Syfte — pågår (omskrivet som möjligheter)

Sola ska vara ett frontendramverk lika heltäckande som Angular, React och Vue, men med noll beroenden i runtime och verktyg och utan byggsteg. Det är tänkt som det naturliga nästa steget från tre filer (`index.html`, `app.js`, `style.css`), så att en app kan växa utan omskrivning eller bundler. Tillsammans med Spola (Java, noll beroenden) ska det bli en fullstack helt utan beroenden, riktad särskilt mot offentlig sektor och reglerade branscher där granskningsbarhet och långsiktig förvaltning väger tungt.

**Möjligheterna i syftet:**

- **Webben som den är, fast hela vägen.** Alla som kan HTML, CSS och JavaScript kan redan Sola. Tröskeln in är i princip noll.
- **Appar som håller i tio år.** Inget byggsteg och inga beroenden betyder att en app från 2026 fortfarande startar 2036 – utan uppgraderingsprojekt.
- **Hela stacken går att granska.** Sola plus Spola blir en fullstack där varje rad som körs går att läsa, signera och arkivera. Det är unikt.
- **Ett eget segment.** Offentlig sektor, vård, finans och försvar har krav som de stora ramverken inte är byggda för. Sola kan bli förstahandsvalet där.
- **Perfekt för AI-skriven kod.** En liten, stabil, läsbar API-yta är lätt för AI-agenter att använda rätt – och lätt för människor att granska efteråt.

*Källa: sammanfattat från [docs/design.md](../../docs/design.md) (avsnitten Mål, Huvudidé, Positionering). Det finns ingen ticket eller spec.*

## [ ] 2. Översikt — ej besökt

Visionen bärs av fem ställen, läs dem i ordning:

- [design.md:15](../../docs/design.md#L15) — Mål: de tre nollorna (runtime, verktyg, byggsteg).
- [design.md:23](../../docs/design.md#L23) — Huvudidé: tre filer som växer, och arbetssättet "extrahera, uppfinn inte".
- [design.md:39](../../docs/design.md#L39) — Problemtabellen: vad som gör ont när appen växer och vad plattformen redan löser.
- [design.md:175](../../docs/design.md#L175) — Positionering: vem Sola är till för och varför.
- [README.md:1](../../README.md#L1) — Den publika ingången som sammanfattar allt ovan.

## [ ] 3. Principerna — ej besökt

De tre nollorna och "extrahera, uppfinn inte" är visionens kärna. Allt annat i dokumentet ska kunna härledas ur dem.

- [design.md:15-27](../../docs/design.md#L15-L27) — Mål och Huvudidé.
- [design.md:29-37](../../docs/design.md#L29-L37) — Lärdomar från React, Angular och Vue, och slutsatsen "ett API per sak".

## [ ] 4. Problemen Sola löser — ej besökt

Problemtabellen är det närmaste visionen har till krav: nio problem, varav ungefär hälften redan löses av plattformen. Här tas user stories fram.

- [design.md:39-53](../../docs/design.md#L39-L53) — Problemtabellen.

## [ ] 5. Vem det är till för — ej besökt

Positioneringen pekar ut målgrupper och löften (leveranskedjan, inga brytande ändringar, läsbart på en kväll, offentlig sektor).

- [design.md:175-180](../../docs/design.md#L175-L180) — Positionering.
- [design.md:5-13](../../docs/design.md#L5-L13) — Namnet och kopplingen till Spola.

## [ ] 6. Hur visionen hålls i praktiken — ej besökt

Verktyg och distribution är där löftet om noll beroenden och inget byggsteg prövas på riktigt.

- [design.md:121-136](../../docs/design.md#L121-L136) — Utvecklingsverktyg, bara Node.
- [design.md:138-173](../../docs/design.md#L138-L173) — Distribution och användning i en app.

## [ ] 7. Periferi — ej besökt

- [design.md:182-188](../../docs/design.md#L182-L188) — Idéer att utforska.
- [design.md:190-196](../../docs/design.md#L190-L196) — Nästa steg.
- [README.md](../../README.md) — stämmer README med designdokumentet?
