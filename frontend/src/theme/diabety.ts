/**
 * Palette condivisa DIABETY.
 * I valori coincidono con quelli delle schermate attuali: questo refactoring
 * non introduce nuove scelte grafiche o modifiche funzionali.
 *
 * Non sostituisce src/theme.ts, ancora utilizzato dalla schermata di errore.
 */
export const DIABETY_COLORS = {
  background: '#0A0A0C',
  surfaceSecondary: '#13131A',
  brandPrimary: '#00E5FF',
  brandSecondary: '#7D52FF',
  onSurface: '#FFFFFF',
  muted: '#7E7E86',
  success: '#00E676',
  warning: '#FF9100',
  error: '#FF5252',
  borderGlass: 'rgba(255, 255, 255, 0.08)',
  borderGlassBright: 'rgba(255, 255, 255, 0.15)',
  // I Grafici usano volutamente un bordo più trasparente.
  borderGlassCharts: 'rgba(255, 255, 255, 0.06)',
  bgUtility: '#1A1A24',
  borderUtility: '#3A3A4A',
  tabInactive: '#636366',
};

export const DIABETY_ALERT_COLORS = {
  overlay: 'rgba(0,0,0,0.84)',
  border: '#32606B',
  iconBackground: '#10242C',
  label: '#99ADBB',
  panelBackground: '#0C2029',
  panelBorder: '#244651',
  message: '#DEE8EE',
  onButton: '#06171D',
  warning: '#FFB86B',
  error: '#FF7373',
};
