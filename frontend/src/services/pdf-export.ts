import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Procedura identica per il PDF di Storico e Impostazioni.
 * Le schede continuano a gestire filtri, contenuto HTML e avvisi di errore.
 * ATTENZIONE: non modificare qui l'impaginazione senza prove su Web e mobile.
 */
export async function esportaRegistroPdfDaHtml(
  htmlTemplateHTML: string,
  modalita: 'html' | 'pdf',
  mostraAvviso: (messaggio: string) => void,
): Promise<void> {
  if (Platform.OS === 'web') {
    if (modalita === 'html') {
      const blob = new Blob([htmlTemplateHTML], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const finestra = window.open(url, '_blank');
      if (!finestra) {
        URL.revokeObjectURL(url);
        mostraAvviso('Il browser ha bloccato la nuova finestra. Consenti i popup per visualizzare il documento.');
        return;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else {
      // Renderizza il documento in un elemento HTML reale e misurabile.
      // Non usare position:fixed: html2canvas può catturare una pagina vuota.
      // @ts-ignore - html2pdf.js non include dichiarazioni TypeScript proprie.
      const modulo = await import('html2pdf.js');
      const html2pdf = modulo.default || modulo;
      const docPdf = new DOMParser().parseFromString(htmlTemplateHTML, 'text/html');
      const contenitore = document.createElement('div');
      contenitore.setAttribute('aria-hidden', 'true');
      contenitore.style.cssText = [
        'position:absolute', 'left:0', 'top:0', 'width:1122px',
        'background:#ffffff', 'color:#1c1c1e', 'font-family:Arial,sans-serif',
        'padding:0', 'margin:0', 'opacity:1', 'visibility:visible',
        'pointer-events:none', 'z-index:9999'
      ].join(';');
      const stilePdf = document.createElement('style');
      stilePdf.textContent = docPdf.querySelector('style')?.textContent || '';
      contenitore.appendChild(stilePdf);
      const corpoPdf = document.createElement('div');
      corpoPdf.innerHTML = docPdf.body.innerHTML;
      contenitore.appendChild(corpoPdf);
      document.body.appendChild(contenitore);
      try {
        // Ogni pagina viene acquisita separatamente. In questo modo i salti
        // di pagina CSS non possono creare una pagina bianca intermedia.
        const elementiPagina = Array.from(corpoPdf.querySelectorAll<HTMLElement>('.pagina-pdf'));
        if (!elementiPagina.length) throw new Error('Nessuna pagina disponibile per il PDF.');
        let pdfFinale: any = null;
        for (let indice = 0; indice < elementiPagina.length; indice++) {
          const pagina = elementiPagina[indice];
          pagina.style.breakAfter = 'auto';
          pagina.style.pageBreakAfter = 'auto';
          // Nel contenitore resta visibile soltanto la pagina da acquisire.
          // Non usare display:none sulla pagina attiva.
          elementiPagina.forEach((elemento, j) => {
            elemento.style.display = j === indice ? 'block' : 'none';
          });
          await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
          if (!pagina.querySelector('table') || pagina.getBoundingClientRect().height < 10) {
            throw new Error(`La tabella della pagina ${indice + 1} non è stata renderizzata.`);
          }
          const operazione = html2pdf().set({
            margin: 0,
            filename: 'Registro_Diabety.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
              scale: 2, useCORS: true, backgroundColor: '#ffffff',
              scrollX: 0, scrollY: 0, windowWidth: 1200, logging: false
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
            pagebreak: { mode: [] }
          }).from(pagina);
          const canvas = await operazione.toCanvas().get('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx || canvas.width < 10 || canvas.height < 10) {
            throw new Error(`Impossibile acquisire la pagina ${indice + 1}.`);
          }
          const larghezza = Math.min(canvas.width, 500);
          const altezza = Math.min(canvas.height, 500);
          const campione = ctx.getImageData(0, 0, larghezza, altezza).data;
          let pixelScuri = 0;
          for (let k = 0; k < campione.length; k += 16) {
            if (campione[k] < 235 || campione[k + 1] < 235 || campione[k + 2] < 235) {
              if (++pixelScuri > 20) break;
            }
          }
          if (pixelScuri <= 20) {
            throw new Error(`La pagina ${indice + 1} risulta vuota.`);
          }
          if (indice === 0) {
            // html2pdf crea il PDF e fornisce l'istanza jsPDF già inclusa
            // nella dipendenza: non occorre installare nuove librerie.
            pdfFinale = await operazione.toPdf().get('pdf');
            // Rimuove eventuali pagine extra prodotte dagli arrotondamenti.
            while (pdfFinale.getNumberOfPages() > 1) pdfFinale.deletePage(pdfFinale.getNumberOfPages());
          } else {
            pdfFinale.addPage('a4', 'landscape');
            pdfFinale.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, 297, 210);
          }
        }
        if (!pdfFinale) throw new Error('Impossibile completare il PDF.');
        pdfFinale.save('Registro_Diabety.pdf');
      } finally {
        contenitore.remove();
      }
    }
  } else {
    if (modalita === 'html') {
      mostraAvviso('La visualizzazione HTML è disponibile nella versione web.');
    } else {
      const { uri } = await Print.printToFileAsync({ html: htmlTemplateHTML });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Esporta Report Medico PDF' });
    }
  }
}
