#!/usr/bin/env node
// Publishes an EAS Update with EXPO_PUBLIC_* resolved from the EAS server-side
// environment, after checking those values agree with eas.json's build profile.
//
// Run it directly: `node scripts/publish-update.mjs production --message "..."`.
// Do NOT add it to package.json "scripts" — `packageJson:scripts` is a fingerprint
// source, so a new script changes runtimeVersion and the update stops matching any
// installed build. That happened on 2026-08-14 and made a fix undeliverable.
//
// Why this exists: `eas update` runs a local `expo export` that loads .env.local and
// inlines every EXPO_PUBLIC_* into the bundle, while eas.json's env block only feeds
// `eas build`. Publishing from a dev shell once shipped a LAN API URL to the App Store
// app. --environment makes EAS supply the values, which dotenv cannot override.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [profile, ...rest] = process.argv.slice(2);

if (!profile) {
  console.error('usage: node scripts/publish-update.mjs <profile> --message "what changed"');
  process.exit(1);
}

const easJson = JSON.parse(readFileSync(resolve(root, 'eas.json'), 'utf8'));
const build = easJson.build[profile];

if (!build) {
  console.error(`No build profile "${profile}" in eas.json — cannot verify its env.`);
  process.exit(1);
}

// Merge profile-level env with the platform-specific blocks some profiles use.
const expected = { ...build.env, ...build.ios?.env, ...build.android?.env };

const listed = spawnSync('npx', ['eas', 'env:list', profile], { cwd: root, encoding: 'utf8' });
const remote = Object.fromEntries(
  listed.stdout
    .split('\n')
    .filter((line) => line.startsWith('EXPO_PUBLIC_'))
    .map((line) => {
      const at = line.indexOf('=');
      return [line.slice(0, at), line.slice(at + 1).trim()];
    }),
);

// A key EAS does not define is not overridden by anything, so dotenv sets it from
// .env.local and the export inlines a dev value. eas.json cannot catch that: it only
// lists what it declares, and this is about what it does not.
const localEnv = resolve(root, '.env.local');
if (existsSync(localEnv)) {
  const orphans = readFileSync(localEnv, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^EXPO_PUBLIC_[A-Z0-9_]+=/.test(line))
    .map((line) => line.slice(0, line.indexOf('=')))
    .filter((key) => !(key in remote));

  if (orphans.length > 0) {
    console.error(`.env.local defines EXPO_PUBLIC_* keys the EAS "${profile}" environment does not.`);
    console.error('Nothing would override them, so your local values would ship:\n');
    for (const key of orphans) console.error(`  ${key}`);
    console.error(`\nEither remove them from .env.local, or add them with:`);
    console.error(`  npx eas env:create ${profile} --name <NAME> --value <VALUE> --type string --visibility plaintext --force`);
    process.exit(1);
  }
}

// eas.json drives builds, the EAS environment drives updates. They must not drift.
const drift = Object.keys(expected)
  .filter((key) => key.startsWith('EXPO_PUBLIC_'))
  .filter((key) => remote[key] !== expected[key]);

if (drift.length > 0) {
  console.error(`eas.json and the EAS "${profile}" environment disagree — refusing to publish:\n`);
  for (const key of drift) {
    console.error(`  ${key}\n    eas.json: ${expected[key]}\n    EAS:      ${remote[key] ?? '(not set)'}`);
  }
  console.error(`\nFix with: npx eas env:create ${profile} --name <NAME> --value <VALUE> --type string --visibility plaintext --force`);
  process.exit(1);
}

console.log(`EAS "${profile}" environment matches eas.json. Publishing with:`);
for (const [key, value] of Object.entries(remote)) {
  console.log(`  ${key}=${/KEY|DSN/.test(key) ? `${value.slice(0, 12)}…` : value}`);
}
console.log('');

// Always --clear-cache: eas update reuses a cached export, so a publish that only
// changes env silently republishes the previous bundle. That is how the LAN API URL
// survived a "corrected" republish on 2026-08-14.
const args = ['eas', 'update', '--branch', profile, '--environment', profile, ...rest];
if (!args.includes('--clear-cache')) args.push('--clear-cache');

const result = spawnSync('npx', args, { cwd: root, stdio: 'inherit' });

if (result.status === 0) {
  console.log('\nVerify before trusting it: the published Runtime version must match the');
  console.log('installed build, and the launchAsset hash must differ from the previous update.');
  console.log('  npx expo-updates fingerprint:generate --platform ios');
  console.log('  curl -s -H "expo-platform: ios" -H "expo-protocol-version: 1" \\');
  console.log('    -H "accept: multipart/mixed" https://u.expo.dev/update/<id> | grep -o \'"launchAsset":{[^}]*}\'');
}

process.exit(result.status ?? 1);
