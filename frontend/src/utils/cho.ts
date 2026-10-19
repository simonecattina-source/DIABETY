/**
 * Lettura unica dei CHO per DIABETY.
 * Accetta un numero o un testo con virgola/punto decimale, da 0 a 9999 g.
 * Rifiuta valori negativi, infiniti, non numerici e stringhe ambigue.
 * I dati vengono salvati come numeri; la formattazione visiva usa la virgola.
 */
export const leggiValoreCho = (valore: unknown): number | null => {
  if (typeof valore === 'number') {
    return Number.isFinite(valore) && valore >= 0 && valore <= 9999 ? valore : null;
  }
  if (typeof valore !== 'string') return null;
  const testo = valore.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(testo)) return null;
  const numero = Number(testo.replace(',', '.'));
  return Number.isFinite(numero) && numero >= 0 && numero <= 9999 ? numero : null;
};

export const formattaCho = (valore: unknown): string | null => {
  const numero = leggiValoreCho(valore);
  return numero === null ? null : String(numero).replace('.', ',');
};

/** Una sola formattazione della cella Insulina/CHO per entrambi i PDF. */
export const formattaInsulinaChoPdf = (item: { insulina?: unknown; cho?: unknown }): string => {
  const insulina = item.insulina === null || item.insulina === undefined ? '' : String(item.insulina);
  const insulinaPdf = insulina && insulina !== '-'
    ? `<span style="font-weight: 600;">${insulina.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`
    : '';
  const cho = formattaCho(item.cho);
  const choPdf = cho === null ? '' : `<span style="font-weight: normal;">${cho} CHO</span>`;
  return [insulinaPdf, choPdf].filter(Boolean).join(' - ') || '-';
};
