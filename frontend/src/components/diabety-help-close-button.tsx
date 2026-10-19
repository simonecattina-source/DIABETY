/**
 * Pulsante di conferma comune alle finestre informative dei pulsanti "?".
 * Presentazione soltanto: ogni schermata mantiene la propria funzione onPress.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { DIABETY_COLORS } from '@/src/theme/diabety';

type DiabetyHelpCloseButtonProps = {
  onPress: () => void;
};

export function DiabetyHelpCloseButton({ onPress }: DiabetyHelpCloseButtonProps) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Ho capito, chiudi guida"
    >
      <Text style={styles.label}>Ho capito</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 12,
    backgroundColor: DIABETY_COLORS.brandPrimary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14,
    fontWeight: '800',
    color: '#06171D',
  },
});
