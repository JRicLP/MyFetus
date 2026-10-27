import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACCESSIBLE_COLORS, ACCESSIBLE_TEXT } from '../theme/accessibility';

function relativeLuminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastAgainstWhite(hex: string) {
  return 1.05 / (relativeLuminance(hex) + 0.05);
}

test('paleta de texto e ações atende contraste AA sobre branco', () => {
  for (const color of [
    ACCESSIBLE_COLORS.primary,
    ACCESSIBLE_COLORS.secondary,
    ACCESSIBLE_COLORS.body,
    ACCESSIBLE_COLORS.muted,
    ACCESSIBLE_COLORS.danger,
    ACCESSIBLE_COLORS.warning,
    ACCESSIBLE_COLORS.success,
  ]) {
    assert.ok(contrastAgainstWhite(color) >= 4.5, `${color} não atende contraste AA`);
  }
});

test('texto permite ampliação consistente nas telas auditadas', () => {
  assert.equal(ACCESSIBLE_TEXT.maxFontSizeMultiplier, 1.5);
});
