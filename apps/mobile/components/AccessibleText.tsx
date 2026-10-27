import React from 'react';
import { Text, TextProps } from 'react-native';
import { ACCESSIBLE_TEXT } from '../theme/accessibility';

type AccessibleTextProps = TextProps & {
  maxFontSizeMultiplier?: number;
};

export function AccessibleText({
  allowFontScaling = true,
  maxFontSizeMultiplier = ACCESSIBLE_TEXT.maxFontSizeMultiplier,
  ...props
}: AccessibleTextProps) {
  return (
    <Text
      {...props}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
    />
  );
}
