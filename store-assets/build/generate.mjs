#!/usr/bin/env node
// Frames raw simulator/emulator captures into store marketing screenshots:
// gradient background, caption, device bezel.
//
//   node store-assets/build/generate.mjs <version> <platform> <locale>
//   node store-assets/build/generate.mjs 1.0 ios es
//   node store-assets/build/generate.mjs 1.0 android es
//
// Reads   store-assets/<version>/<platform-path>/<locale-dir>/
// Writes  store-assets/<version>/<platform-path>/<locale-dir>-framed/
//
// Raw captures are per-version because the UI changes between releases. To
// prepare 1.1: copy the folder, recapture what changed, rerun. Adding a locale
// is a caption array in captions.json, not new artwork.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(HERE, "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// Canvas matches each platform's source capture aspect, so the device frame
// keeps the same proportions and nothing is letterboxed.
// NOTE: Play Console documents a "long side <= 2x short side" limit that both
// of these exceed (2.17 and 2.22). Untested against a real upload — if Play
// rejects them, shrink the height here and rerun; nothing else changes.
const PLATFORMS = {
  ios: { path: "ios/6.9", width: 1320, height: 2868, deviceWidth: 1080, deviceTop: 620, radius: 76 },
  android: { path: "android/phone", width: 1080, height: 2400, deviceWidth: 880, deviceTop: 520, radius: 58 }
};

const LOCALE_DIRS = { es: "es-MX", en: "en-US" };

const [version, platformKey = "ios", localeKey = "es"] = process.argv.slice(2);

if (!version || !PLATFORMS[platformKey] || !LOCALE_DIRS[localeKey]) {
  console.error("Usage: generate.mjs <version> <ios|android> <es|en>");
  console.error("   eg: generate.mjs 1.0 ios es");
  process.exit(1);
}

const platform = PLATFORMS[platformKey];
const localeDir = LOCALE_DIRS[localeKey];
const srcDir = join(ASSETS, version, platform.path, localeDir);
const outDir = join(ASSETS, version, platform.path, `${localeDir}-framed`);

if (!existsSync(srcDir)) {
  console.error(`No captures at ${srcDir}`);
  process.exit(1);
}

const { slides } = JSON.parse(readFileSync(join(HERE, "captions.json"), "utf8"));

// Fail loudly on a capture that no slide references, rather than silently
// dropping it from the set.
const referenced = new Set(slides.map((s) => s.source));
const orphans = readdirSync(srcDir).filter((f) => f.endsWith(".png") && !referenced.has(f));
if (orphans.length) {
  console.warn(`Warning: not in captions.json, will not be framed: ${orphans.join(", ")}\n`);
}

mkdirSync(outDir, { recursive: true });
const tmpDir = join(HERE, ".tmp");
mkdirSync(tmpDir, { recursive: true });

// Inter is not installed system-wide, so this renders in SF Pro — the native
// App Store typeface, and close enough to the in-app Inter to stay coherent.
const html = (copy, imagePath, scale) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${platform.width}px; height: ${platform.height}px; overflow: hidden;
    font-family: -apple-system, "SF Pro Display", system-ui, sans-serif;
    background: linear-gradient(160deg, #4f46e5 0%, #4338ca 45%, #312e81 100%);
    position: relative;
  }
  /* Soft light source so the flat gradient does not read as a solid block. */
  body::before {
    content: ""; position: absolute; inset: 0;
    background: radial-gradient(circle at 22% 12%, rgba(255,255,255,.22) 0%, transparent 55%);
  }
  .copy { position: absolute; top: ${Math.round(150 * scale)}px; left: 0; right: 0;
          padding: 0 ${Math.round(90 * scale)}px; text-align: center; z-index: 2; }
  h1 { font-size: ${Math.round(88 * scale)}px; line-height: 1.12; font-weight: 700; color: #fff;
       letter-spacing: ${(-2.5 * scale).toFixed(2)}px; white-space: pre-line; }
  p { margin-top: ${Math.round(30 * scale)}px; font-size: ${Math.round(42 * scale)}px;
      line-height: 1.35; color: rgba(255,255,255,.72); }
  /* Bleeds past the bottom edge on purpose — a cropped device reads as
     intentional framing and buys screen height for the actual UI. */
  .device {
    position: absolute; top: ${platform.deviceTop}px; left: 50%; transform: translateX(-50%);
    width: ${platform.deviceWidth}px; padding: ${Math.round(14 * scale)}px;
    background: #0b0b0f; border-radius: ${platform.radius}px;
    box-shadow: 0 ${Math.round(50 * scale)}px ${Math.round(90 * scale)}px rgba(0,0,0,.42),
                0 0 0 2px rgba(255,255,255,.09);
    z-index: 2;
  }
  .device img { display: block; width: 100%; border-radius: ${platform.radius - 14}px; }
</style></head>
<body>
  <div class="copy"><h1>${copy.caption}</h1><p>${copy.sub}</p></div>
  <div class="device"><img src="file://${imagePath}"></div>
</body></html>`;

const scale = platform.width / 1320;
console.log(`${version} / ${platformKey} / ${localeDir} -> ${platform.width}x${platform.height}\n`);

let rendered = 0;

slides.forEach((slide, i) => {
  const copy = slide[localeKey];
  if (!copy) throw new Error(`${slide.source} has no "${localeKey}" copy in captions.json`);

  const imagePath = join(srcDir, slide.source);
  if (!existsSync(imagePath)) {
    console.warn(`  skip ${slide.source} — no capture in ${localeDir}/`);
    return;
  }

  const htmlPath = join(tmpDir, `${i}.html`);
  writeFileSync(htmlPath, html(copy, imagePath, scale));

  // Numeric prefix fixes upload order in App Store Connect and Play Console.
  const name = `${String(i + 1).padStart(2, "0")}-${slide.source.replace(/^\d+-/, "")}`;

  execFileSync(CHROME, [
    "--headless", "--disable-gpu", "--hide-scrollbars",
    "--force-device-scale-factor=1", "--allow-file-access-from-files",
    `--window-size=${platform.width},${platform.height}`,
    `--screenshot=${join(outDir, name)}`,
    `file://${htmlPath}`
  ], { stdio: "pipe" });

  console.log(`  ${name}  ${copy.caption.replace(/\n/g, " ")}`);
  rendered += 1;
});

rmSync(tmpDir, { recursive: true, force: true });
console.log(`\n${rendered} rendered -> ${outDir}`);
