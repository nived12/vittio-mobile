#!/usr/bin/env node
// Publishes an EAS Update with EXPO_PUBLIC_* taken from eas.json's build profile.
//
// Run it directly: `node scripts/publish-update.mjs production --message "..."`.
// Do NOT add it to package.json "scripts" — `packageJson:scripts` is a fingerprint
// source, so a new script changes runtimeVersion and the update stops matching any
// installed build. That happened on 2026-08-14 and made a fix undeliverable.
//
// `eas update` runs a local `expo export` that loads .env.local and inlines every
// EXPO_PUBLIC_* into the bundle — eas.json's env block only applies to `eas build`.
// Publishing straight from a dev shell once shipped a LAN API URL to the App Store
// app. Values set here win, because dotenv never overrides an existing shell var.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [branch, ...rest] = process.argv.slice(2);

if (!branch) {
  console.error('usage: node scripts/publish-update.mjs <branch> --message "what changed"');
  process.exit(1);
}

const easJson = JSON.parse(readFileSync(resolve(root, 'eas.json'), 'utf8'));
const profile = easJson.build[branch];

if (!profile) {
  console.error(`No build profile "${branch}" in eas.json — cannot resolve its env.`);
  process.exit(1);
}

// Merge profile-level env with the platform-specific blocks some profiles use.
const env = { ...profile.env, ...profile.ios?.env, ...profile.android?.env };
const publicVars = Object.keys(env).filter((k) => k.startsWith('EXPO_PUBLIC_'));

if (!env.EXPO_PUBLIC_API_URL) {
  console.error(`Profile "${branch}" has no EXPO_PUBLIC_API_URL — refusing to publish.`);
  process.exit(1);
}

console.log(`Publishing to "${branch}" with env from eas.json build.${branch}:`);
for (const key of publicVars) {
  const value = env[key];
  console.log(`  ${key}=${key.includes('KEY') || key.includes('DSN') ? `${value.slice(0, 12)}…` : value}`);
}
console.log('');

// Always --clear-cache: eas update reuses a cached export, so a publish that only
// changes env silently republishes the previous bundle. That is how the LAN API URL
// survived a "corrected" republish on 2026-08-14.
const args = ['eas', 'update', '--branch', branch, ...rest];
if (!args.includes('--clear-cache')) args.push('--clear-cache');

const result = spawnSync('npx', args, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, ...env },
});

process.exit(result.status ?? 1);
