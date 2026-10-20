# DIABETY — Ultima modifica: finestra «Modifica Misurazione»

**Base:** `DIABETY con IOB(1).zip`.

- **Data/Ora:** barra unica orizzontale compatta (42 px), con modifica dei valori invariata.
- **Glicemia/Insulina/CHO:** tre riquadri affiancati e meno alti.
- **Insulina:** scelta Rapida/Basale tramite tendina sotto il campo numerico; «Non specificata» disponibile per le vecchie dosi nei casi originariamente previsti.
- **Nessun cambiamento** a record salvati, algoritmi, validazioni, grafica delle righe Storico, momenti, note, PDF, IOB o altri file.
- **File da sostituire:** solo `frontend/app/(tabs)/storico.tsx`.
- **Verifiche eseguite:** sintassi TSX e confronto differenziale del sorgente.
- **Da verificare:** build Vercel, interazioni reali su Web/iPhone/Android, salvataggio e ricalcolo IOB dopo modifica.
