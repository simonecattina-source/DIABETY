# DIABETY Clean — Fase 2H ampliata

**Sorgente di partenza:** `salva data 18-10 creazio-app-main(5).zip` (la versione indicata dall'utente come funzionante su Vercel).

## Scopo
Ampliare la ricerca dei duplicati e centralizzare in `frontend/src` gli elementi grafici e le funzioni di generazione PDF che erano effettivamente ripetuti, senza cambiare i valori calcolati o la grafica.

## Tre interventi effettivi

### 1. Pulsanti di chiusura (X) condivisi
- Nuovo file: `frontend/src/components/diabety-modal-close-button.tsx`.
- **7 pulsanti** sostituiti in: Inserisci, Bolo, Grafici, due finestre di Impostazioni, componente `diabety-dialog-heading.tsx` e componente `diabety-pdf-export-modal.tsx`.
- Icone, colori, dimensioni, callback di chiusura, etichette di accessibilità, hitSlop e stato `disabled` conservati. In particolare, la finestra di importazione backup **non può essere chiusa durante un'importazione**: la condizione precedente è mantenuta.

### 2. Selezione e ordinamento delle misurazioni nei PDF
- Nuovo file: `frontend/src/utils/pdf-measurement-selection.ts`.
- Condivise le funzioni **identiche** di Storico e Impostazioni relative a: colonne PDF, suddivisione tra `Notte iniziale` e `Notte finale`, selezione del primo record per momento, raggruppamento per data e ordinamento.
- Conservarne la logica originale è importante: nessuna modifica alla gestione delle fasce notturne, né alle regole di conservazione.

### 3. Costruzione HTML e impaginazione PDF
- Nuovo file: `frontend/src/utils/pdf-report-html.ts`.
- Unificata la struttura ripetuta della tabella PDF, compreso lo stile, le tre righe per giornata, la paginazione mediante misurazione reale nel browser e il percorso di stampa nativo.
- **Differenza intenzionale salvaguardata:** il rendering della cella Insulina/CHO è leggermente diverso nelle due schede originali. Il nuovo componente riceve la *stessa* funzione di formattazione specifica per ciascuna schermata, evitando di cambiare anche solo un carattere dell'HTML.
- L'esportazione/download PDF e il filtraggio per intervallo rimangono nelle rispettive schede, come prima.

## File per GitHub

**Creare** (3):

1. `frontend/src/components/diabety-modal-close-button.tsx`
2. `frontend/src/utils/pdf-measurement-selection.ts`
3. `frontend/src/utils/pdf-report-html.ts`

**Sostituire** (7):

1. `frontend/app/(tabs)/index.tsx`
2. `frontend/app/(tabs)/bolo.tsx`
3. `frontend/app/(tabs)/storico.tsx`
4. `frontend/app/(tabs)/grafici.tsx`
5. `frontend/app/(tabs)/impostazioni.tsx`
6. `frontend/src/components/diabety-dialog-heading.tsx`
7. `frontend/src/components/diabety-pdf-export-modal.tsx`

**Non vanno eliminati altri file.** Le cartelle `frontend/app`, `frontend/src`, le impostazioni Vercel e il percorso degli import rimangono dove sono.

## Verifiche realmente eseguite

- Confronto dei file prima/dopo: **7 file modificati, 3 creati, 0 rimossi**.
- **32 file TypeScript/JavaScript** verificati sintatticamente tramite trasformatore TypeScript: 0 errori.
- **57 riferimenti di import locali** verificati: tutti risolti.
- **16 casi di confronto HTML identico (uguaglianza byte per byte)** tra la vecchia logica PDF e quella condivisa, su due schede, su percorso Web e nativo, con dataset completi e ridotti.
- Dataset di prova di **28 record**, con doppioni nello stesso momento, date multiple, orari limite 00:00, 06:00, 22:29, 22:30, 23:59, note con caratteri speciali e CHO in formati diversi. Nel test Web è stato utilizzato un simulatore di layout per verificare anche più pagine; questo **non sostituisce** un test con browser reale.
- JSON da **665 alimenti** identico bit per bit al file originale.
- `package.json`, `app.json`, `vercel.json` e `tsconfig.json` identici al file originale.
- Nessuna modifica alle diciture **90/91 giorni**, ai salvataggi, ai backup, ai calcoli, al bolo e ai filtri.

## Ulteriori verifiche di ricerca

- Confrontati i blocchi di codice ripetuti tra le sei schede e i componenti condivisi. La duplicazione più estesa e significativa era la preparazione della tabella PDF nelle due schermate.
- Il trattamento di insulina/CHO risultava **non identico**: è stato preservato, non uniformato.
- Escluse altre refactorizzazioni di lettura/scrittura AsyncStorage, filtri temporali, calcoli insulinici e backup, perché richiederebbero un insieme separato di test di regressione e potrebbero alterare dati reali.

## Procedura GitHub e Vercel

1. Salva una copia del progetto corrente e, se possibile, un backup dei dati dell'app.
2. Aggiungi i tre nuovi file ai percorsi indicati e sostituisci i sette file già esistenti usando questo ZIP (non il vecchio ZIP della 2H).
3. Commit su GitHub e verifica **Ready** su Vercel.
4. In **Storico**, verifica `Visualizza HTML`, `Scarica PDF`, filtro `7/14/30/90/Tutti`, suddivisione delle due colonne Notte, e annullamento delle finestre senza cancellare dati.
5. In **Impostazioni**, ripeti la verifica di `Visualizza HTML` e `Scarica PDF` e controlla la X del popup di importazione **senza eseguire un'importazione reale**.
6. Verifica i pulsanti X delle guide in Inserisci, Bolo e Grafici; verifica inoltre la X nelle finestre informative di Impostazioni.
7. Su dispositivo nativo, quando possibile, verifica esportazione PDF e condivisione.

**Limiti dei test:** non è stata eseguita in questo ambiente una build Vercel reale, né una prova interattiva su Safari/iPhone/Android. I test di impaginazione Web usano un documento simulato: il motore del browser reale resta da verificare dopo il deploy.
