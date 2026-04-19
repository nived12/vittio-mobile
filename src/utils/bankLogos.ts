import React from 'react';
import type { SvgProps } from 'react-native-svg';

// ── Local SVG imports ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Afirme: React.FC<SvgProps> = require('../../assets/images/banks/afirme.svg').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Azteca: React.FC<SvgProps> = require('../../assets/images/banks/azteca.svg').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Banamex: React.FC<SvgProps> = require('../../assets/images/banks/banamex.svg').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Banbajio: React.FC<SvgProps> = require('../../assets/images/banks/banbajio.svg').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Banorte: React.FC<SvgProps> = require('../../assets/images/banks/banorte.svg').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Banregio: React.FC<SvgProps> = require('../../assets/images/banks/banregio.svg').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Bbva: React.FC<SvgProps> = require('../../assets/images/banks/bbva.svg').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Hsbc: React.FC<SvgProps> = require('../../assets/images/banks/hsbc.svg').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Inbursa: React.FC<SvgProps> = require('../../assets/images/banks/inbursa.svg').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Nu: React.FC<SvgProps> = require('../../assets/images/banks/nu.svg').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Revolut: React.FC<SvgProps> = require('../../assets/images/banks/revolut.svg').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Santander: React.FC<SvgProps> = require('../../assets/images/banks/santander.svg').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Scotiabank: React.FC<SvgProps> = require('../../assets/images/banks/scotiabank.svg').default;

// Maps the logo_url field returned by GET /api/v1/banks to a local SVG component.
// The API returns paths like "banks/bbva.svg" — we strip the prefix and extension to look up here.
const BANK_LOGO_MAP: Record<string, React.FC<SvgProps>> = {
  afirme: Afirme,
  azteca: Azteca,
  banamex: Banamex,
  banbajio: Banbajio,
  banorte: Banorte,
  banregio: Banregio,
  bbva: Bbva,
  hsbc: Hsbc,
  inbursa: Inbursa,
  nu: Nu,
  revolut: Revolut,
  santander: Santander,
  scotiabank: Scotiabank,
};

/**
 * Resolve a bank logo_url (e.g. "banks/bbva.svg") to a local SVG component.
 * Returns null if not found — callers should render a fallback icon.
 */
export function getBankLogoComponent(logoUrl: string | null | undefined): React.FC<SvgProps> | null {
  if (!logoUrl) return null;
  // Strip "banks/" prefix and ".svg" extension
  const key = logoUrl.replace(/^banks\//, '').replace(/\.svg$/, '').toLowerCase();
  return BANK_LOGO_MAP[key] ?? null;
}
