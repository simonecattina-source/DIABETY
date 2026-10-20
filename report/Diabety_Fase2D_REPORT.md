# DIABETY Clean — Fase 2D

## Versione di riferimento
Archivio fornito dall’utente: `salva data 18-10 creazio-app-main(1).zip` (Fase 2C installata e confermata operativa su Vercel).

## Obiettivo e modifica
Estratta in un solo componente React Native la struttura ripetuta delle schede esplicative presenti nelle finestre informative delle schede **Inserisci** e **Bolo**.

**Nuovo file:** `frontend/src/components/diabety-info-card.tsx`

**File esistenti modificati:**
- `frontend/app/(tabs)/index.tsx` — 6 riquadri informativi sostituiti con il componente condiviso.
- `frontend/app/(tabs)/bolo.tsx` — 3 riquadri informativi sostituiti con il componente condiviso.

Il componente accetta `variant="inserisci"` e `variant="bolo"`, conservando **due palette e misure originali distinte**. I testi esplicativi, la legenda della glicemia, gli esempi del bolo e gli avvisi terapeutici rimangono all’interno delle schermate e sono invariati.

## Elementi esclusi dalla modifica
- Nessun cambio alla navigazione Expo Router o alla cartella `frontend` usata da Vercel.
- Nessun cambio ad algoritmi, calcoli, impostazioni terapeutiche, AsyncStorage, storico, backup, PDF, categorie o alimenti.
- Nessuna modifica a `package.json`, dipendenze, `app.json`, `vercel.json` o `tsconfig.json`.
- **Diciture “90 giorni” e “91 giorni” conservate esattamente**. Nessun intervento sulla logica di conservazione.
- Tutti i file diversi dai due TSX indicati risultano byte per byte identici allo ZIP di partenza. È stato aggiunto soltanto il nuovo componente.

## Controlli eseguiti
- Parsing sintattico TypeScript/TSX di tutti i 25 file JS/TS nel progetto, senza errori.
- Risoluzione statica degli import locali `@/`, senza collegamenti mancanti.
- Confronto con lo ZIP originale: soltanto i due file dichiarati sono modificati.
- 9 riquadri totali: icone, titoli, colori, dimensioni e stili originali preservati.
- Descrizioni dei riquadri e tutte le occorrenze delle diciture 90/91 nei due file identiche.
- Database da 665 alimenti e file di configurazione di Expo/Vercel immutati.

**Limite dei test:** non è stata eseguita la build Vercel o una prova interattiva nei browser/dispositivi; il controllo sintattico non equivale a una compilazione completa con dipendenze installate.

## Istruzioni per GitHub
Usare lo ZIP **solo modifiche**, con percorsi `frontend/...`:

1. Creare `frontend/src/components/diabety-info-card.tsx`.
2. Sostituire `frontend/app/(tabs)/index.tsx`.
3. Sostituire `frontend/app/(tabs)/bolo.tsx`.
4. Eseguire commit sul branch collegato a Vercel.
5. Verificare `Ready` e aprire le finestre `?` di Inserisci e Bolo: controllare i sei riquadri della guida Inserisci, i tre della guida Bolo, la legenda glicemica e gli esempi. Verificare anche il salvataggio di una misurazione e il comportamento del Bolo senza usare dati reali per test invasivi.

**Nessuna modifica necessaria a `package.json` o alle impostazioni Vercel.**
