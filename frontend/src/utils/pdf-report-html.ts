/**
 * Struttura HTML del registro giornaliero, comune a Storico e Impostazioni.
 * Conserva la paginazione misurata nel browser e quella nativa expo-print.
 * Ogni scheda passa il PROPRIO formatter insulina/CHO: le differenze
 * originali non vengono normalizzate.
 */
import { Platform } from 'react-native';
import { COLONNE_PDF, scegliMisurePdf } from './pdf-measurement-selection';

export const generaHtmlRegistroPdf = (
  sezioniOrdinate: { title: string; data: any[] }[],
  tuttiIRecordPdf: any[],
  formattaInsulinaCho: (item: any) => string,
): string => {
      const righePerGiorno: string[] = [];
      sezioniOrdinate.forEach(sez => {
        let righe = "";
          const rG: Record<string, string> = {}; const rI: Record<string, string> = {}; const rN: Record<string, string> = {};
          COLONNE_PDF.forEach(m => { rG[m] = '-'; rI[m] = '-'; rN[m] = '-'; });
          const primaPerMomento = scegliMisurePdf(sez.data, tuttiIRecordPdf, sez.title);
          primaPerMomento.forEach((item: any, chiave: string) => {
            let col = '#34C759'; if (item.glicemia > 180) col = '#FF3B30'; if (item.glicemia < 70) col = '#FF9F0A';
            rG[chiave] = `<span style="color: ${col}; font-weight: bold;">${item.glicemia} mg/dL</span>`;
            rI[chiave] = formattaInsulinaCho(item);
            rN[chiave] = item.note ? `<span style="font-style: italic; color: #555;">${String(item.note).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}</span>` : '-';
          });
          let tG = ''; let tI = ''; let tN = '';
          COLONNE_PDF.forEach(m => { tG += `<td>${rG[m]}</td>`; tI += `<td>${rI[m]}</td>`; tN += `<td>${rN[m]}</td>`; });
          righe += `<tr><td class="cell-data" rowspan="3">${sez.title}</td><td class="cell-label">Glicemia</td>${tG}</tr><tr><td class="cell-label">Insulina</td>${tI}</tr><tr class="row-separator"><td class="cell-label">Note</td>${tN}</tr>`;
        righePerGiorno.push(righe);
      });

      const intestazioneTabella = '<thead><tr><th class="head-data">Data</th><th class="head-label">Parametro</th><th>Notte</th><th>Prima Colazione</th><th>Dopo Colazione</th><th>Spuntino</th><th>Prima Pranzo</th><th>Dopo Pranzo</th><th>Merenda</th><th>Prima Cena</th><th>Dopo Cena</th><th>Notte</th></tr></thead>';
      const titoloPrimaPagina = '<h1>Diabety - Registro Storico Giornaliero</h1>';
      const titoloAltrePagine = '<div style="height:10px;"></div>';
      const stileDocumento = `@page { size: A4 landscape; margin: 0; } body { font-family: sans-serif; color: #1c1c1e; padding: 0; margin: 0; background: #ffffff; } .pagina-pdf { box-sizing: border-box; width: 1122px; height: 793px; padding: 36px; background: #ffffff; overflow: hidden; } .pagina-pdf:not(:last-child) { page-break-after: always; break-after: page; } h1 { font-size: 18px; color: #0A66C2; margin: 0 0 10px 0; font-weight: bold; border-bottom: 2px solid #0A66C2; padding-bottom: 4px; } table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 5px; } th, td { border: 1px solid #c7c7cc; padding: 6px 4px; font-size: 10px; text-align: center; vertical-align: middle; word-wrap: break-word; } th { background-color: #f2f2f7; font-weight: bold; font-size: 9px; text-transform: uppercase; } .cell-data { font-weight: bold; background-color: #f0f5fa; color: #0A66C2; font-size: 10.5px; width: 42px; } .cell-label { font-weight: 600; background-color: #f2f2f7; text-align: left; padding-left: 5px; width: 60px; } .head-data { width: 42px; } .head-label { width: 60px; } .row-separator td { background-color: #ffffff; border-bottom: 1px solid #0A66C2; } .cell-data { border-bottom: 1px solid #0A66C2; }`;
      const creaPagina = (righe: string[], indice: number) => `<div class="pagina-pdf">${indice === 0 ? titoloPrimaPagina : titoloAltrePagine}<table>${intestazioneTabella}<tbody>${righe.join('')}</tbody></table></div>`;

      let pagine: string[][] = [];
      if (Platform.OS === 'web') {
        // Misura il layout effettivo con gli stessi CSS, larghezza e margini del PDF.
        // Non modifica il diario e non utilizza una stima fissa del numero di giorni.
        const misuratore = document.createElement('div');
        misuratore.style.cssText = 'position:absolute;left:0;top:0;width:1122px;visibility:hidden;pointer-events:none;z-index:-1;';
        const stileMisura = document.createElement('style');
        stileMisura.textContent = stileDocumento;
        misuratore.appendChild(stileMisura);
        const paginaMisura = document.createElement('div');
        paginaMisura.className = 'pagina-pdf';
        misuratore.appendChild(paginaMisura);
        document.body.appendChild(misuratore);
        try {
          let gruppoCorrente: string[] = [];
          for (const righeGiorno of righePerGiorno) {
            const indicePagina = pagine.length;
            paginaMisura.innerHTML = (indicePagina === 0 ? titoloPrimaPagina : titoloAltrePagine) + `<table>${intestazioneTabella}<tbody>${[...gruppoCorrente, righeGiorno].join('')}</tbody></table>`;
            const tabella = paginaMisura.querySelector('table');
            const limite = paginaMisura.getBoundingClientRect().bottom - 10;
            const entra = !!tabella && tabella.getBoundingClientRect().bottom <= limite;
            if (!entra && gruppoCorrente.length > 0) {
              pagine.push(gruppoCorrente);
              gruppoCorrente = [righeGiorno];
            } else if (!entra) {
              throw new Error('Una giornata contiene note troppo lunghe per entrare in una pagina A4. Riduci le note prima di esportare.');
            } else {
              gruppoCorrente.push(righeGiorno);
            }
            // Controlla anche il primo giorno della pagina nuova.
            if (!entra && pagine.length > 0) {
              paginaMisura.innerHTML = titoloAltrePagine + `<table>${intestazioneTabella}<tbody>${righeGiorno}</tbody></table>`;
              const tabellaNuova = paginaMisura.querySelector('table');
              if (!tabellaNuova || tabellaNuova.getBoundingClientRect().bottom > paginaMisura.getBoundingClientRect().bottom - 10) {
                throw new Error('Una giornata contiene note troppo lunghe per entrare in una pagina A4. Riduci le note prima di esportare.');
              }
            }
          }
          if (gruppoCorrente.length) pagine.push(gruppoCorrente);
        } finally {
          misuratore.remove();
        }
      } else {
        // Su dispositivi nativi la stampa usa il motore di impaginazione di expo-print.
        pagine = [righePerGiorno];
      }

      const corpoHtmlCompleto = pagine.map((righe, indice) => creaPagina(righe, indice)).join('');
      const stileNativo = Platform.OS === 'web' ? '' : '.pagina-pdf { height:auto; overflow:visible; } tbody tr { break-inside:avoid; page-break-inside:avoid; }';
      const htmlTemplateHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${stileDocumento}${stileNativo}</style></head><body>${corpoHtmlCompleto}</body></html>`;

      return htmlTemplateHTML;
};
