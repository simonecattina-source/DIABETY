/**
 * Pulsante di chiusura (X) delle finestre DIABETY.
 * Centralizza solo la struttura, non i comportamenti: ogni finestra
 * conserva la propria callback, le dimensioni, il colore e le protezioni.
 */
import React from 'react';
import { TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type DiabetyModalCloseButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
  iconSize: number;
  iconColor: string;
  style?: StyleProp<ViewStyle>;
  hitSlop?: React.ComponentProps<typeof TouchableOpacity>['hitSlop'];
  disabled?: boolean;
};

export function DiabetyModalCloseButton({
  onPress,
  accessibilityLabel,
  iconSize,
  iconColor,
  style,
  hitSlop,
  disabled,
}: DiabetyModalCloseButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={style}
      hitSlop={hitSlop}
      disabled={disabled}
    >
      <Ionicons name="close" size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
}
