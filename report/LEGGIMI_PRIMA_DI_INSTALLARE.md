# DIABETY — correzione visualizzazione STIMA MATEMATICA (20 ottobre 2026)

**BASE:** ZIP fornito dall'utente `PROVA PER IBOin.zip`, senza reimportare prototipi precedenti.

## Cosa cambiare su GitHub

1. Sostituire `frontend/app/(tabs)/bolo.tsx` con il file omonimo dello ZIP.
2. Aggiungere `frontend/src/utils/calcolo-bolo.ts` (se non esiste). Se esiste già, confrontarlo prima di sovrascrivere.
3. Non modificare gli altri file. Configurazione Vercel invariata, Root Directory `frontend`.

## Comportamento

- La scheda mostra il totale **puramente matematico** (quota CHO + quota correzione) solo quando input e parametri sono validi.
- Quote teoriche separatamente nel pannello `Rivedi dati`.
- IOB separata; nessuna sottrazione di IOB.
- `Bolo consigliato` sempre non abilitato: non esiste output terapeutico validato.
- Blocchi conservativi per glicemia bassa, glicemia sotto target, quantità non valide, configurazione incompleta e limite massimo superato (senza arrotondamenti automatici né dosi alternative).
- La modifica dei parametri blocca temporaneamente la stima fino a `Salva e blocca`.
- Nessun salvataggio automatico né registro dosi aggiuntivo.
- Nessuna modifica a Inserisci, Storico, grafici, PDF, backup o impostazioni.

## ATTENZIONE

Il totale è una simulazione aritmetica, non una prescrizione né un'indicazione di dosaggio. Non usare l'output per decidere somministrazioni. L'IOB è un modello informativo, non una misura clinica. Servono controlli clinici e tecnici prima di qualunque funzione di raccomandazione terapeutica.

## Verifiche

Test automatici non terapeutici sul modulo matematico e controllo sintattico del componente React Native. Build completa Expo/Vercel e test dispositivi rimangono da effettuare.
