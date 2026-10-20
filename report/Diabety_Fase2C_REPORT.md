# DIABETY Clean — Fase 2C: pulsanti informativi condivisi

## Base di partenza
Archivio ricevuto dall'utente: `salva data 18-10 creazio-app-main.zip` (snapshot già comprendente le Fasi 2A e 2B). La versione di riferimento non è quella di archivi precedenti.

## File nuovo
- `frontend/src/components/diabety-help-button.tsx`

## File da sostituire su GitHub
- `frontend/app/(tabs)/index.tsx`
- `frontend/app/(tabs)/bolo.tsx`
- `frontend/app/(tabs)/storico.tsx`
- `frontend/app/(tabs)/grafici.tsx`

## Intervento
Unificato il componente grafico di 9 pulsanti di aiuto, mantenendone le varianti preesistenti: Inserisci (25 px), Bolo (18 px), Storico (20 px), Grafici (6 icone da 17–23 px con differenti colori). Ciascuno continua a invocare il proprio gestore e ad aprire la finestra informativa già esistente. Etichette di accessibilità aggiunte dove assenti.

## Cosa NON è stato modificato
- Tutti i testi delle finestre informative.
- Calcoli glicemici/insulina/CHO; soglie mediche.
- Persistenza AsyncStorage, backup, PDF, filtri e pulizia dati.
- Diciture 90/91 giorni e loro frequenza di occorrenza.
- Database alimentare, `package.json`, file di configurazione Vercel e Expo.
- Schermate Expo Router che restano in `frontend/app/(tabs)`; nuovo componente dentro `frontend/src`.

## Verifiche locali
- Sintassi TypeScript/TSX di tutti i file sorgenti nel progetto: nessun errore di parsing.
- Numero di richiami alle finestre di aiuto invariato: 1 Inserisci + 1 Bolo + 1 Storico + 6 Grafici.
- Verifica delle stringhe sensibili `90 giorni`, `91 giorni`, `glicotrack_data`, `glicotrack_parametri_bolo` nei file modificati: occorrenze invariate.
- Solo 4 schermate e il nuovo componente modificati; tutti gli altri file del progetto uguali allo ZIP di partenza.

## Per GitHub/Vercel
1. Creare il nuovo file `frontend/src/components/diabety-help-button.tsx`.
2. Sostituire `index.tsx`, `bolo.tsx`, `storico.tsx`, `grafici.tsx` in `frontend/app/(tabs)`.
3. Fare commit; attendere `Ready` su Vercel.
4. Provare il pulsante `?` in Inserisci, Bolo, Storico e ciascuno dei sei grafici.

**Limite:** non è stato eseguito `npx expo export` né un test su browser o dispositivi mobili: il parsing e le verifiche statiche non garantiscono una build riuscita.
