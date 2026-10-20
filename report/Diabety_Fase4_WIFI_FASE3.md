# DIABETY · Fase 3A — Monitoraggio continuità WebRTC

La versione introduce soltanto un monitor del collegamento Wi-Fi nel laboratorio già funzionante. Non aggiunge server o servizi esterni, non legge misurazioni, non aggiorna lo storico.

## Applicazione su GitHub

Nella cartella `frontend/src/components/`, sostituisci **solo** `diabety-wifi-lab.tsx` con quello incluso. `frontend/src/services/qr-lan-test.ts` e `frontend/app/(tabs)/sincronizzazione.tsx` rimangono invariati rispetto alla v0.3 che hai già pubblicato.

Non devi modificare `package.json`.

## Collaudo

1. Verifica il deploy Vercel.
2. Sul tablet MAIN seleziona il PC e genera l'offerta WebRTC come nella fase precedente.
3. Sul PC leggi i QR, genera la risposta e falla leggere al tablet MAIN.
4. Verifica il ping/pong.
5. Nella sezione **STEP 3A · Continuità della sessione**, controlla che «Risposte di prova» aumenti automaticamente ogni circa 15 secondi mentre entrambe le pagine restano aperte.
6. Passa a un'altra scheda, torna a DIABETY e controlla che riprenda il monitoraggio quando il canale è ancora attivo.

**Il browser NON può ricreare automaticamente la sessione dopo una chiusura completa:** in quel caso occorre ancora ripetere lo scambio QR. La Fase 3A non implementa la sincronizzazione di dati sanitari.
