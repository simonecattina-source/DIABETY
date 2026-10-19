/**
 * Intestazione delle schede DIABETY con riquadro scuro e barra ciano.
 * Si limita al layout: titoli, sottotitoli e pulsanti rimangono nelle schede.
 * Le varianti conservano esattamente i margini e gli angoli precedenti.
 * Impostazioni ha un'intestazione differente e non usa questo componente.
 */
import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { DIABETY_COLORS } from '@/src/theme/diabety';

type DiabetyPageHeaderProps = {
  variant: 'inserisci' | 'bolo' | 'storico' | 'grafici' | 'alimenti';
  children: ReactNode;
};

export function DiabetyPageHeader({ variant, children }: DiabetyPageHeaderProps) {
  const isCompactAccent = variant === 'storico' || variant === 'alimenti';
  const containerStyles = [
    styles.container,
    (variant === 'bolo' || variant === 'grafici') && styles.bottom16,
    variant === 'storico' && styles.storico,
    variant === 'alimenti' && styles.bottom13,
  ];

  return (
    <View style={containerStyles}>
      <View style={[styles.accent, isCompactAccent ? styles.accent3 : styles.accent4]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#101B28',
    borderWidth: 1,
    borderColor: '#26536A',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottom16: { marginBottom: 16 },
  bottom13: { marginBottom: 13 },
  storico: { marginHorizontal: 12, marginBottom: 10 },
  accent: { width: 3, height: 43, backgroundColor: DIABETY_COLORS.brandPrimary },
  accent3: { borderRadius: 3 },
  accent4: { borderRadius: 4 },
});
