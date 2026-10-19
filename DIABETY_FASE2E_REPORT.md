# DIABETY Clean — Fase 2E + pulsanti «Ho capito» uniformati

## Base del pacchetto
Archivio dell'utente: `salva data 18-10 creazio-app-main(2).zip` (Fase 2D verificata su Vercel).
Questo pacchetto **contiene già tutta la Fase 2E** e la nuova uniformazione dei pulsanti: non è necessario caricare prima lo ZIP della sola Fase 2E.

## Modifiche incluse

### Fase 2E — intestazioni
- Nuovo `frontend/src/components/diabety-page-header.tsx`.
- Intestazioni condivise di Inserisci, Bolo, Storico, Grafici e Alimenti, preservando le varianti di stile originali.
- Intestazione della scheda Impostazioni non modificata.

### Pulsante «Ho capito» uniforme
- Nuovo `frontend/src/components/diabety-help-close-button.tsx`.
- Quattro finestre informative dei pulsanti «?»: Inserisci, Bolo, Storico e Grafici.
- **Stesso pulsante**: ciano `#00E5FF`, testo scuro, carattere bold, angoli arrotondati, dicitura `Ho capito`.
- La precedente scritta `Chiudi` in Grafici diventa `Ho capito`, per uniformare le finestre informative.
- I popup si chiudono con le stesse funzioni e continuano ad avere la X di chiusura.
- Nessuna modifica alle finestre di importazione, eliminazione o esportazione PDF.

## File da creare su GitHub
- `frontend/src/components/diabety-page-header.tsx`
- `frontend/src/components/diabety-help-close-button.tsx`

## File da sostituire su GitHub
- `frontend/app/(tabs)/index.tsx`
- `frontend/app/(tabs)/bolo.tsx`
- `frontend/app/(tabs)/storico.tsx`
- `frontend/app/(tabs)/grafici.tsx`
- `frontend/app/(tabs)/alimenti.tsx`

## Istruzioni
1. Apri il file ZIP e individua i percorsi indicati.
2. Crea i due file nuovi in `frontend/src/components`.
3. Sostituisci interamente i cinque file delle schede in `frontend/app/(tabs)`.
4. Esegui commit su GitHub e attendi `Ready` su Vercel.
5. Prova i popup `?` in Inserisci, Bolo, Storico e Grafici; verifica che il nuovo pulsante `Ho capito` chiuda ogni finestra.
6. Verifica anche le intestazioni delle cinque schermate, incluse ricerca alimenti e navigazione.

**Non modificare** la Root Directory Vercel (`frontend`), `package.json` o le dipendenze.

## Controlli automatici
- 27 file TS/TSX/JS: nessun errore sintattico di transpilation.
- Collegamenti `@/src` del componente condiviso e callback delle quattro finestre controllati.
- Diff controllato contro lo ZIP originale: **soltanto i sette file elencati** risultano nuovi o modificati.
- `impostazioni.tsx`, database (665 alimenti), `package.json`, salvataggi, PDF e backup invariati.
- Diciture **90/91 giorni** inalterate.
- Build Vercel e prove interattive **non ancora effettuate**.
