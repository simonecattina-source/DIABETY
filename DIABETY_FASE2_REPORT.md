# DIABETY Clean — Fase 2A: tema condiviso

## Base di lavoro
Versione locale `DIABETY_Clean_progetto_completo.zip` (archivio precedentemente consegnato e confermato funzionante dall’utente). Questa **non** è una sincronizzazione in tempo reale con GitHub.

## Modifiche
- **Nuovo** `frontend/src/theme/diabety.ts`: palette attuale riunita in un unico file, senza variazioni dei valori.
- **Aggiornate** le sei schede `frontend/app/(tabs)/index.tsx`, `bolo.tsx`, `alimenti.tsx`, `storico.tsx`, `grafici.tsx`, `impostazioni.tsx`: il vecchio blocco locale `COLORS` viene sostituito con il riferimento alla palette centralizzata.
- **Aggiornato** `frontend/app/(tabs)/_layout.tsx`: colori della barra di navigazione derivati dalla stessa palette.
- **Aggiornato** `frontend/src/components/diabety-alert.tsx`: colori degli avvisi condivisi derivati dalla palette.
- **Grafici**: conservata *esattamente* la diversa trasparenza del bordo (`rgba(255, 255, 255, 0.06)`).

## Nessuna modifica
- Nessuna dipendenza installata e `frontend/package.json` **invariato**.
- `frontend/src/theme.ts` **invariato**: ancora necessario per la schermata di errore.
- Database alimentare, chiavi AsyncStorage, calcoli bolo e CHO, storico, PDF, backup, categorie, testi, filtri e **diciture 90/91 giorni invariati**.
- Non sono stati cambiati il layout, le icone, le dimensioni, né i colori visivi.

## Installazione via GitHub
1. Conserva una copia della versione GitHub funzionante.
2. Crea il nuovo `frontend/src/theme/diabety.ts` con il file del pacchetto.
3. Sostituisci i **sette file delle schede e barra di navigazione**, più `frontend/src/components/diabety-alert.tsx` con quelli del pacchetto (8 file esistenti + 1 nuovo).
4. Esegui commit e verifica `Ready` su Vercel. Controlla l’avvio, le 6 schede, i popup e lo stile delle schermate.

**Nota:** poiché questo ZIP parte dall’archivio Clean e non legge l’ultimo commit GitHub, se hai modificato successivamente uno dei file interessati, non sostituirlo alla cieca: occorre prima integrare i cambiamenti.

## Verifiche
- I valori di tutti i token originali estratti da ogni scheda sono stati confrontati con quelli della nuova palette.
- Verifica sintattica TypeScript/TSX e import relativi eseguita sul pacchetto generato.
- Build Vercel / test end-to-end non eseguiti qui.
