# DIABETY Clean — Fase 2G unificata (notifiche premium)

## Riscontro
Le notifiche di Inserisci, Storico e Impostazioni erano già condivise a livello di componente, ma conservavano sfondi verdi, varianti stilistiche e font di dimensioni differenti. Questo aggiornamento uniforma **la sola grafica** delle quattro occorrenze.

## Nuovo stile
- Sfondo blu-nero `#111B27`, uguale alle card premium delle schermate.
- Bordo sottile blu petrolio `#29465B`, angoli arrotondati da 14 px.
- Testo comune **Plus Jakarta Sans, 14 px, grassetto**, centrato.
- Piccola barra laterale verde per conferme e rossa per eliminazioni/errori.
- Colori semantici esistenti del tema DIABETY: verde `#00E676` e rosso `#FF5252`.
- Gli unici margini diversi dipendono dalla posizione originale dei messaggi nelle schede.

## File nel pacchetto GitHub

**Da creare** (se non hai applicato la precedente Fase 2G) oppure **sostituire** (se già esistente):
- `frontend/src/components/diabety-status-notice.tsx`

**Da sostituire** (se non hai ancora applicato la precedente Fase 2G):
- `frontend/app/(tabs)/index.tsx`
- `frontend/app/(tabs)/storico.tsx`
- `frontend/app/(tabs)/impostazioni.tsx`

> Questo ZIP **sostituisce completamente** la precedente Fase 2G. Non occorre applicare entrambi.

## Garanzie e controlli
- Il solo componente grafico è cambiato rispetto al precedente pacchetto della Fase 2G.
- Testi, stati, timer (3 secondi, 1,5 secondi e 3,5 secondi a seconda del punto), e funzioni di salvataggio, eliminazione, backup e PDF sono identici.
- Tutti gli altri file del progetto completo derivano esattamente dal progetto Fase 2G preparato con l'ultimo ZIP dell'utente.
- Database alimentare, diciture 90/91 giorni, impostazioni Vercel e `package.json` invariati.
- Verificati collegamenti degli import locali e sintassi statica; la build Vercel e i test nell'app rimangono da eseguire.

## Dopo il commit
Attendi **Ready** su Vercel, poi verifica che le notifiche in Inserisci, Storico e Impostazioni abbiano identico sfondo, bordo, testo e barra laterale, mantenendo verde per le conferme e rosso per le eliminazioni.
