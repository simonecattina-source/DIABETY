import { DiabetyModalCloseButton } from '@/src/components/diabety-modal-close-button';
/**
 * Intestazione condivisa delle finestre di dialogo DIABETY.
 * Questa estrazione preserva il layout delle tre finestre dello Storico:
 * Guida, Modifica misurazione e Svuota lo Storico.
 * Non contiene logica di gestione dati o di conferma delle operazioni.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DIABETY_COLORS } from '@/src/theme/diabety';

type DiabetyDialogHeadingProps = {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onClose: () => void;
  closeLabel: string;
  danger?: boolean;
};

export function DiabetyDialogHeading({
  title, subtitle, icon, onClose, closeLabel, danger = false,
}: DiabetyDialogHeadingProps) {
  return (
    <>
      <View style={styles.heading}>
        <View style={[styles.iconBox, danger && styles.dangerIconBox]}>
          <Ionicons
            name={icon}
            size={danger ? 24 : 23}
            color={danger ? DIABETY_COLORS.error : DIABETY_COLORS.brandPrimary}
          />
        </View>
        <View style={styles.textBox}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
                <DiabetyModalCloseButton onPress={onClose} accessibilityLabel={closeLabel} iconSize={24} iconColor="#93A7B9" />
      </View>
      <View style={styles.divider} />
    </>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 45, height: 45, backgroundColor: '#0B2B39', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dangerIconBox: { backgroundColor: '#351B23', borderColor: '#69333C', borderWidth: 1 },
  textBox: { flex: 1 },
  title: { fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 11, color: '#93A7B9', marginTop: 3 },
  divider: { height: 1, backgroundColor: '#26536A' },
});
