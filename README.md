# DIABETY — progetto Expo Router

Questa è la versione **DIABETY Clean**, derivata dall'archivio con popup personalizzati.

## Pubblicazione

- Repository GitHub: `simonecattina-source/creazio-app` (branch `main`).
- In Vercel mantenere **Root Directory** `frontend`, **Framework Preset** `Other`, **Build Command** `npx expo export`, **Output Directory** `dist`.
- Le schermate sono in `frontend/app/(tabs)/`; i componenti condivisi in `frontend/src/components/`.
- I dati alimentari usati dall'app sono in `frontend/constants/alimenti_database.json`.
- L'app conserva localmente le proprie informazioni tramite AsyncStorage. Non cambiare le chiavi di archiviazione senza progettare una migrazione dei dati.

## Pulizia conservativa

Sono stati rimossi soltanto file di esempio o file del precedente sistema GlicoTrack che **non risultano importati o richiamati dalle schermate correnti**, insieme a documentazione e test obsoleti. La vecchia API FastAPI di esempio è stata esclusa dal pacchetto Clean perché non è collegata al frontend Vercel; se viene utilizzata in un deployment separato, conservare l'originale.

Non sono stati modificati il codice delle schede, i calcoli, la gestione della conservazione, le chiavi AsyncStorage, i testi 90/91 giorni, il database o le impostazioni native.

I file `src/theme.ts`, `src/navigation.ts`, `src/query-client.ts`, `src/components/error-boundary.tsx` e i tool `frontend/scripts/cmd-guard*` **sono mantenuti**, perché sono ancora collegati al layout o potrebbero essere necessari alla configurazione dell'ambiente.

Per i dettagli completi di file rimossi e verifiche, vedere `DIABETY_CLEAN_REPORT.md` (distribuito anche separatamente).
