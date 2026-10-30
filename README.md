# DIABETY 

**Diario digitale per la registrazione e la consultazione dei dati glicemici.**

DIABETY è un'app realizzata con **Expo, React Native e Expo Router**, utilizzabile via web e progettata per un'interfaccia adatta a smartphone, tablet e computer.

**Apri l'app:** [DIABETY su Vercel](https://creazione-app-diabety.vercel.app/)

## Funzionalità principali

- **Inserisci:** registrazione di glicemia, insulina, carboidrati (CHO), data, orario, momento della giornata e note.
- **Bolo:** sezione con parametri configurabili, calcoli matematici informativi e visualizzazione della stima dell'insulina ancora attiva (IOB), quando disponibile.
- **Alimenti:** consultazione del database di alimenti con valori di carboidrati, ricerca e preferiti.
- **Storico:** consultazione e modifica delle misurazioni registrate, con filtri temporali.
- **Grafici:** rappresentazioni dell'andamento glicemico, delle medie e delle misurazioni per momento della giornata.
- **Impostazioni:** esportazioni, backup, importazione dei dati, trasferimento manuale mediante QR code e guida integrata.

## Dati, backup e trasferimento

I dati personali registrati nell'app sono conservati **localmente sul dispositivo/browser** tramite AsyncStorage. Il progetto non prevede la sincronizzazione automatica dei dati fra dispositivi.

Dalla sezione **Impostazioni** sono disponibili:

- Esportazione dello storico nei formati previsti dall'app, inclusi PDF, Excel e CSV.
- **Esporta backup** e **Importa backup**, per salvare e ripristinare i dati gestiti dall'app.
- **Trasferimento Dati con QR code**, con procedura manuale fra dispositivi.

**Importante:** i dati conservati nel browser possono andare persi se vengono rimossi i dati del sito o dell'app installata. Prima di reinstallare l'app, cambiare dispositivo o cancellare i dati del browser, è opportuno esportare un backup. Lo storico è inoltre soggetto alla regola di conservazione e pulizia automatica prevista dall'app.

## Tecnologie

- Expo / React Native / React Native Web
- Expo Router
- TypeScript
- AsyncStorage per l'archiviazione locale
- Vercel per la pubblicazione della versione web

## Struttura del progetto

```text
DIABETY/
├── frontend/
│   ├── app/
│   │   └── (tabs)/           # Schermate principali
│   ├── constants/
│   │   └── alimenti_database.json
│   ├── src/
│   │   ├── components/      # Componenti condivisi
│   │   ├── services/        # Servizi di esportazione e trasferimento
│   │   └── utils/           # Funzioni di supporto e calcolo
│   ├── app.json
│   ├── package.json
│   └── vercel.json
├── report/                   # Report tecnici del progetto
├── tests/                    # Materiale di test
└── README.md
```

## Pubblicazione su Vercel

Il codice sorgente si trova nel repository **[simonecattina-source/DIABETY](https://github.com/simonecattina-source/DIABETY)**, branch `main`.

Configurazione del progetto Vercel:

| Impostazione | Valore |
| --- | --- |
| Root Directory | `frontend` |
| Framework Preset | `Other` |
| Build Command | `npx expo export` |
| Output Directory | `dist` |

Le modifiche pubblicate sul branch `main` vengono distribuite tramite il collegamento GitHub–Vercel, quando l'integrazione e i deployment sono configurati correttamente.

## Note per la manutenzione

- **Non modificare le chiavi AsyncStorage senza una migrazione dei dati:** eventuali cambiamenti possono rendere non accessibili le informazioni precedentemente salvate.
- Prima di intervenire sui dati o sulle procedure di importazione, eseguire un backup e verificare la compatibilità del formato.
- Mantenere distinte le indicazioni testuali sui periodi di visualizzazione dello storico e la logica di conservazione automatica.
- Per il contesto tecnico della pulizia conservativa della versione Clean, vedere [`report/Diabety_Clean_REPORT.md`](report/Diabety_Clean_REPORT.md).

## Avvertenza

DIABETY è uno strumento di registrazione, consultazione e analisi personale. Le eventuali stime matematiche visualizzate **non costituiscono una prescrizione terapeutica né sostituiscono il parere di un professionista sanitario**.
