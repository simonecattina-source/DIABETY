import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DIABETY_COLORS } from '@/src/theme/diabety';

type NoticeVariant = 'inserisci' | 'impostazioni' | 'storico' | 'storicoGenerale';
type NoticeTone = 'success' | 'error';

type DiabetyStatusNoticeProps = {
  message: string;
  variant: NoticeVariant;
  tone?: NoticeTone;
};

/**
 * Notifica temporanea DIABETY, con uno stile condiviso per tutte le schede.
 * Soltanto i margini dipendono dalla posizione originale nella schermata.
 * Testi, visibilita, durata e logica rimangono nelle schede chiamanti.
 */
export function DiabetyStatusNotice({ message, variant, tone = 'success' }: DiabetyStatusNoticeProps) {
  const isError = tone === 'error';
  const positionStyle = variant === 'inserisci'
    ? styles.inserisci
    : variant === 'impostazioni'
      ? styles.impostazioni
      : variant === 'storicoGenerale'
        ? styles.storicoGenerale
        : styles.storico;

  return (
    <View
      style={[styles.notice, positionStyle, isError && styles.noticeError]}
      accessible
      accessibilityLabel={message}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.accent, isError && styles.accentError]} />
      <Text style={[styles.message, isError && styles.messageError]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Look DIABETY: la stessa card scura e lo stesso bordo in ogni schermata.
  notice: {
    backgroundColor: '#111B27',
    borderColor: '#29465B',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Manteniamo il verde per i salvataggi riusciti e il rosso per le eliminazioni.
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: DIABETY_COLORS.success,
  },
  accentError: { backgroundColor: DIABETY_COLORS.error },
  noticeError: { borderColor: '#69404A' },
  message: {
    fontFamily: 'Plus Jakarta Sans',
    color: DIABETY_COLORS.success,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  messageError: { color: DIABETY_COLORS.error },
  // Le sole varianti sono le distanze, necessarie per non spostare i controlli.
  inserisci: { marginBottom: 12, width: '100%' },
  impostazioni: { marginBottom: 16, width: '100%' },
  storico: { marginTop: 15 },
  storicoGenerale: { marginHorizontal: 16, marginBottom: 12 },
});
