# DIABETY Clean — Fase 2B: popup PDF condiviso

Fonte: `zip aggiornato.zip` caricato dall’utente, con Fase 2A presente.

## Modifiche

- **NUOVO** `frontend/src/components/diabety-pdf-export-modal.tsx` — unico popup PDF utilizzato da Storico e Impostazioni.
- **AGGIORNATO** `frontend/app/(tabs)/storico.tsx` — il popup esistente usa il componente condiviso, mantenendo il filtro `filtroAttivo` e i callback HTML/PDF originali.
- **AGGIORNATO** `frontend/app/(tabs)/impostazioni.tsx` — il popup esistente usa il componente condiviso, mantenendo il filtro `filtroPdfSelezionato` e i callback HTML/PDF originali.

## Invariato

- Testi e stili della finestra PDF, ordine dei pulsanti, azioni e animazione.
- Esportazioni effettive, calcoli, backup, storici e ogni chiave AsyncStorage.
- Le diciture `90 giorni` e `91 giorni`, nonché ogni logica temporale.
- Ogni altro file del progetto: identico byte per byte allo ZIP caricato.
- Nessuna modifica a `package.json` o dipendenze.

## GitHub

1. Aggiungi `frontend/src/components/diabety-pdf-export-modal.tsx` (crea il percorso se necessario).
2. Sostituisci `frontend/app/(tabs)/storico.tsx`.
3. Sostituisci `frontend/app/(tabs)/impostazioni.tsx`.
4. Esegui il commit e controlla la build Vercel. Poi prova **Visualizza HTML**, **Scarica PDF** e **Annulla** in entrambe le schede.

## Verifiche

- Confronto byte per byte dei file non interessati: positivo.
- Verifica del wiring dei callback e dei filtri: positiva.
- Controllo delle diciture 90/91: positivo.
- Controllo sintattico TypeScript/TSX/JavaScript di 23 file: **0 errori** (parser TypeScript, non sostituisce type-check o build).
- Database JSON verificato: **665 alimenti**.
- Build Vercel e test interattivi: da eseguire dopo il commit.
