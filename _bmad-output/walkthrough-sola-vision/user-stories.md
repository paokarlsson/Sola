# User stories: vad Sola löser

Utkast från genomgången av Solas vision. Utgår från möjligheterna i block 1 i [walkthrough-sola-vision.md](walkthrough-sola-vision.md) och målgruppen *system som vill hålla nere förvaltningen*.

## Systemägare och förvaltare

1. **Som systemägare** vill jag att en app som byggs idag fortfarande startar om tio år utan ändringar, **så att** förvaltningsbudgeten går till nya funktioner i stället för uppgraderingar.
2. **Som förvaltare** vill jag uppgradera Sola genom att byta en rad i import map och se exakt vad som ändrats i `git diff`, **så att** en uppgradering tar minuter och går att granska.
3. **Som ny utvecklare i ett befintligt system** vill jag kunna läsa hela ramverket på en kväll, **så att** jag förstår systemet jag ska förvalta.

## Säkerhet och drift

4. **Som säkerhetsansvarig** vill jag att appen saknar tredjepartsberoenden, **så att** det inte finns några sårbarheter i leveranskedjan att bevaka.
5. **Som säkerhetsansvarig** vill jag att mallar aldrig använder `innerHTML`, **så att** XSS är uteslutet utan extra granskning.
6. **Som driftansvarig** vill jag servera appen som vanliga statiska filer med strikt CSP, **så att** driften blir enkel och säker.

## Utvecklare

7. **Som utvecklare som kan HTML och JavaScript** vill jag börja med tre filer och lägga till Sola först när det behövs, **så att** jag kommer igång utan att lära mig en verktygskedja.
8. **Som utvecklare** vill jag att gränssnittet uppdateras automatiskt när data ändras, **så att** jag slipper hålla DOM och data i synk för hand.
9. **Som utvecklare** vill jag dela upp appen i vyer som laddas vid behov utan bundler, **så att** appen kan växa utan att ett byggsteg behövs.
10. **Som utvecklare** vill jag köra alla tester med bara Node, **så att** inte heller testmiljön behöver förvaltas.

## AI och fullstack

11. **Som utvecklare som arbetar med AI-agenter** vill jag ha ett litet och stabilt API, **så att** genererad kod blir rätt och är lätt att granska.
12. **Som fullstackteam** vill jag att Sola och Spola delar mönster för sessioner och inloggning, **så att** hela stacken saknar beroenden.
