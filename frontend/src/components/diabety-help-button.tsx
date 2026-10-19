/**
 * Pulsante informativo condiviso DIABETY.
 * Le varianti riproducono esattamente la grafica precedentemente presente
 * nelle rispettive schermate (Inserisci, Bolo, Storico, Grafici).
 * Non gestisce gli stati o i contenuti delle finestre: riceve solo onPress.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DIABETY_COLORS } from '@/src/theme/diabety';

type DiabetyHelpButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
  variant: 'inserisci' | 'bolo' | 'storico' | 'grafici';
  iconSize?: number;
  iconColor?: string;
};

export function DiabetyHelpButton({
  onPress, accessibilityLabel, variant, iconSize = 20, iconColor = DIABETY_COLORS.brandPrimary,
}: DiabetyHelpButtonProps) {
  if (variant === 'grafici') {
    return (
      <TouchableOpacity onPress={onPress} style={styles.graficiButton}
        accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
        <Ionicons name="help-circle-outline" size={iconSize} color={iconColor} />
      </TouchableOpacity>
    );
  }

  const wrapperStyle = variant === 'inserisci' ? styles.inserisciButton
    : variant === 'bolo' ? styles.boloButton : styles.storicoButton;
  const hitSlop = variant === 'inserisci'
    ? { top: 12, bottom: 12, left: 12, right: 12 }
    : variant === 'bolo' ? { top: 15, bottom: 15, left: 15, right: 15 } : undefined;
  const circleStyle = variant === 'inserisci' ? styles.inserisciCircle
    : variant === 'bolo' ? styles.boloCircle : undefined;
  const questionStyle = variant === 'inserisci' ? styles.inserisciQuestion
    : variant === 'bolo' ? styles.boloQuestion : styles.storicoQuestion;

  return (
    <TouchableOpacity onPress={onPress} style={wrapperStyle} hitSlop={hitSlop}
      accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      {variant === 'storico' ? <Text style={questionStyle}>?</Text> : (
        <View style={circleStyle}><Text style={questionStyle}>?</Text></View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Inserisci: 25 px, bordo 1.5, punto interrogativo 18 px.
  inserisciButton: { justifyContent: 'center', alignItems: 'center', width: 25, height: 25 },
  inserisciCircle: { width: 25, height: 25, borderWidth: 1.5, borderColor: DIABETY_COLORS.brandPrimary, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  inserisciQuestion: { fontSize: 18, fontWeight: '600', color: DIABETY_COLORS.brandPrimary, lineHeight: 23 },
  // Bolo: 18 px, con l'attuale margine e area di tocco.
  boloButton: { justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  boloCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: DIABETY_COLORS.brandPrimary, justifyContent: 'center', alignItems: 'center' },
  boloQuestion: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, lineHeight: 15, fontWeight: '800', color: DIABETY_COLORS.brandPrimary, textAlign: 'center' },
  // Storico: anello da 20 px, invariato.
  storicoButton: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: DIABETY_COLORS.brandPrimary, alignItems: 'center', justifyContent: 'center' },
  storicoQuestion: { color: DIABETY_COLORS.brandPrimary, fontSize: 12, fontWeight: '800' },
  // Grafici: la dimensione e il colore dell'icona restano specifici per grafico.
  graficiButton: { padding: 4, justifyContent: 'center', alignItems: 'center', opacity: 0.85 },
});
