# Store assets

```
store-assets/
  build/                    generate.mjs + captions.json — the framing tool
  1.0/                      per app version; UI changes between releases
    ios/6.9/es-MX/          raw simulator captures      1320x2868
    ios/6.9/es-MX-framed/   generated, upload these
    android/phone/es-MX/    raw emulator captures       1080x2400
    android/phone/es-MX-framed/
  feature-graphic/          rarely changes, not versioned
  app-icon/
```

Only `*-framed/` gets uploaded. Raw captures are kept so a caption or layout
change never needs a new capture session.

## Generating

```bash
node store-assets/build/generate.mjs 1.0 ios es
node store-assets/build/generate.mjs 1.0 android es
```

Captions live in `build/captions.json`. **Array order is store display order** —
Apple and Google both show the first 2-3 in search results, so the two strongest
lead. Filenames are numbered on output to lock upload order.

## New version

```bash
cp -R store-assets/1.0 store-assets/1.1
```

Recapture only the screens that changed, then rerun for each platform. Anything
still accurate carries over.

## New locale

Add the key to each slide in `captions.json` and to `LOCALE_DIRS` in
`generate.mjs`, then capture the app **running in that language** — the captions
are translated but the UI in the screenshots is not. Shipping English captions
over a Spanish UI is worse than shipping neither.

## Known gaps

- **en-US not done.** Needs its own capture session with the app in English.
  Not required while the App Store listing is es-MX and Mexico-only.
- **Play Console size limit unverified.** Google documents a "long side must not
  exceed 2x the short side" rule; both canvases exceed it (2.17 and 2.22). No
  upload has been attempted. If Play rejects them, reduce `height` in
  `PLATFORMS` and rerun — nothing else changes.
- Rendered in SF Pro, not the in-app Inter, which is not installed system-wide.
