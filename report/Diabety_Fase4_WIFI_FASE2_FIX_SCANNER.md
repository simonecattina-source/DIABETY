# DIABETY — correzione diagnostica QR Fase 2 (v0.3)

## File da sostituire su GitHub

- `frontend/src/components/diabety-wifi-lab.tsx`
- `frontend/src/services/qr-lan-test.ts`

Non modificare altri file. Il report aggiornato è `REPORT_SINCRONIZZAZIONE.md` e può essere aggiunto o sostituito facoltativamente, senza influire sul build.

## Prova sul PC e sul tablet

1. Apri la scheda Sincronizzazione su entrambi.
2. Tablet MAIN: «1 · Genera offerta dal MAIN».
3. PC: «2 · Leggi offerta del MAIN». Se non vedi l'anteprima video, verifica webcam e permessi nel browser Chrome (icona fotocamera vicino alla barra indirizzi). Cambia fotocamera dal pulsante se necessario.
4. Tablet: «Mostra QR semplice per verificare la webcam del PC». Il PC deve scrivere «TEST WEBCAM SUPERATO» se lo riconosce.
5. Torna ai QR tecnici dell'offerta; scansiona ogni QR e passa al successivo quando il conteggio aumenta. La v0.3 contiene più QR, ma meno densi.
6. Se il PC non possiede webcam, la scansione diretta non può avvenire. L'alternativa «Incolla codice completo» evita la fotocamera, ma richiede di trasportare il testo dal tablet al PC con un mezzo disponibile.

Se la v0.3 non funziona, annota il messaggio esatto mostrato sotto «Stato fotocamera» e «Stato del collegamento». 

**Fase sperimentale:** nessuna glicemia o informazione sanitaria viene letta o sincronizzata. I due file sono stati controllati sintatticamente; test reali su Vercel e dispositivi ancora necessari.
