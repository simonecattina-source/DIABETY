/**
 * Riquadro esplicativo condiviso DIABETY (Inserisci e Bolo).
 * Contiene solo la presentazione: i testi e la logica restano nelle schermate.
 * Le due varianti riproducono esattamente gli stili delle versioni precedenti.
 */
import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DIABETY_COLORS } from '@/src/theme/diabety';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type DiabetyInfoCardProps = {
  variant: 'inserisci' | 'bolo';
  icon: IconName;
  iconColor?: string;
  title: string;
  children: ReactNode;
};

export function DiabetyInfoCard({
  variant, icon, iconColor = DIABETY_COLORS.brandPrimary, title, children,
}: DiabetyInfoCardProps) {
  const isInserisci = variant === 'inserisci';
  return (
    <View style={isInserisci ? styles.inserisciCard : styles.boloCard}>
      <View style={isInserisci ? styles.inserisciHeader : styles.boloHeader}>
        <Ionicons name={icon} size={isInserisci ? 19 : 20} color={iconColor} />
        <Text style={isInserisci ? styles.inserisciTitle : styles.boloTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  inserisciCard: { marginBottom: 10, backgroundColor: '#151F2B', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#30485E', width: '100%' },
  inserisciHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 7 },
  inserisciTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: '700', color: '#FFFFFF', flexShrink: 1 },
  boloCard: { marginBottom: 12, backgroundColor: '#080F18', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#344C63', width: '100%' },
  boloHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  boloTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: '#FFFFFF', flexShrink: 1 },
});
