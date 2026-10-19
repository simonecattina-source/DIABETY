# DIABETY Clean — Fase 2F

## Base utilizzata
Archivio: `salva data 18-10 creazio-app-main(3).zip` (Fase 2E unificata confermata funzionante dall'utente su Vercel).

## Intervento
Centralizzata la struttura ripetuta delle **intestazioni dei tre popup dello Storico**:
- Guida allo Storico;
- Modifica Misurazione;
- Svuota lo Storico.

Il nuovo componente `frontend/src/components/diabety-dialog-heading.tsx` conserva per tutte e tre le finestre: titoli, sottotitoli, icone (dimensioni e colori), grafica dell'intestazione, linea divisoria e comandi di chiusura. La variante di eliminazione mantiene sfondo e bordo rossi dell'icona. I contenuti delle finestre e gli handler restano dentro `storico.tsx`.

## File da applicare su GitHub
1. **Creare** `frontend/src/components/diabety-dialog-heading.tsx`.
2. **Sostituire** `frontend/app/(tabs)/storico.tsx`.

Nessun altro file esistente è stato modificato. Non si cambia `package.json` e non servono nuove dipendenze. La root di Vercel resta `frontend`; le schermate restano in `frontend/app/(tabs)`.

## File non modificati
- Tutte le altre schermate, compresa Impostazioni.
- `frontend/constants/alimenti_database.json` (665 alimenti).
- Tema, popup di avviso, altri componenti condivisi, configurazioni e dipendenze.
- Logica di misurazioni, salvataggio/eliminazione, esportazione e backup.
- Diciture e regole già esistenti per **90 e 91 giorni**.

## Verifiche automatiche eseguite
- Confronto byte per byte dell'intero progetto rispetto allo ZIP di partenza: modificato **solo `storico.tsx`**, più **un nuovo componente**.
- Parsing sintattico di tutti i file TypeScript/TSX dell'app e della cartella `src`: nessun errore di sintassi rilevato.
- Import interni con alias `@/`: nessun percorso mancante.
- Presenza immutata di tutte le etichette e delle funzioni sensibili esaminate.
- Il database contiene ancora 665 record.

**Limite:** non sono state eseguite una build Expo/Vercel né prove di interazione sul dispositivo. Il parsing non sostituisce un typecheck con tutte le dipendenze installate.

## Test dopo il commit su GitHub
Attendere `Ready` su Vercel, quindi aprire in **Storico**:
1. la guida informativa `?` e chiuderla con `X` e `Ho capito`;
2. la finestra di modifica di una misurazione e annullare senza salvare;
3. la conferma `Svuota` e usare **Annulla** (non eliminare dati reali).

Verificare che icone, titoli e separatori siano identici a prima. Non è necessario modificare le impostazioni Vercel.
