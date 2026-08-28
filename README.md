# Sagsstyring — internt system

Internt ticket-/sagssystem til at oprette og følge kundesager (support-rettelser
og nye hjemmesidebyggerier), med en offentlig statusside som kunder kan følge.

## Kom i gang

```bash
npm install
cp .env.example .env.local   # udfyld/tilpas værdierne
npm run seed                 # opretter din første medarbejder-login
npm run dev                  # kører på http://localhost:4100
```

Login: brugernavn/adgangskode fra `SEED_USERNAME` / `SEED_PASSWORD` i `.env.local`.

## Funktioner

- **Sager**: to typer — *support/rettelse* (faste statusser: Henvendelse
  modtaget → Arbejde på henvendelse er i gang → Lukket) og *nyt
  hjemmesidebyggeri* (I selv definerer status-roadmappet, fx Opstartet →
  I design → I udvikling → Klar til gennemsyn → Live).
- Hver sag får et unikt sagsnummer, fx `NS-2026-0001`.
- **Interne noter**: synlige for alle medarbejdere, tidsstemplet med navn.
- **Hemmelige noter**: skjult som standard (prikker), klik "Vis" for at se i
  30 sekunder ad gangen. Slettes automatisk og permanent, når sagen lukkes.
- **Aktivitetslog**: hver note, statusændring, oprettelse og lukning logges
  automatisk med medarbejdernavn, hvad der skete, og tidspunkt.
- **Kunde-statusside** (offentlig, intet login): `/track/<sagsnummer>` — viser
  kun titel og status-roadmap, ingen interne oplysninger.
- **SMS + e-mail ved oprettelse**: kunden får automatisk en besked med link
  til deres statusside, når en sag oprettes.

## Aktivér rigtig SMS/e-mail-afsendelse

Lige nu logges SMS/e-mails bare til konsollen (se terminalen, hvor
`npm run dev` kører), så hele systemet virker uden nogen konto. For at sende
rigtige beskeder:

1. Opret en konto hos en SMS-udbyder, fx [GatewayAPI](https://gatewayapi.com)
   (dansk), og sæt `GATEWAYAPI_API_KEY` i `.env.local`.
2. Opret en konto hos [Resend](https://resend.com) til e-mail, og sæt
   `RESEND_API_KEY` + `RESEND_FROM_EMAIL` i `.env.local`.
3. Genstart serveren. Ingen kodeændringer nødvendige.

## Tilføje flere medarbejdere

Kør `npm run seed` igen med andre værdier for `SEED_NAME` / `SEED_USERNAME` /
`SEED_PASSWORD` i `.env.local` — den opretter en ny medarbejder (eller
opdaterer adgangskoden, hvis brugernavnet allerede findes). Der er endnu
ingen brugerflade til at oprette medarbejdere — det kan tilføjes senere.

## Data

Alt gemmes i `data/db.json` (oprettes automatisk). Ingen ekstern database
nødvendig. Tag jævnligt en kopi af filen som backup.

## Deploy til rigtig drift

Lige nu kører systemet kun lokalt. Når I er klar til at bruge det i drift,
kan det deployes til fx [Vercel](https://vercel.com) — dog bør
`data/db.json`-løsningen på det tidspunkt udskiftes med en rigtig database
(fx Postgres via Vercel/Neon), da fil-baseret lagring ikke er velegnet til
en server, der kan genstarte eller skalere til flere instanser.
