# Voice Check

A frontend prototype for Smart India Hackathon 2026 — **SIH26104: AI-Powered
Real-Time Detection and Prevention of Voice-Cloning Impersonation Attacks.**

Check whether a voice sounds genuine or shows signs of being AI-generated.

## What it does

- **Real microphone input** via the Web Audio API
- **Live waveform** that is flat in silence and moves when you speak
- A **single mic interaction**: tap to start, tap to stop
- A **calm result** (human / uncertain / suspicious / AI) driven by a
  replaceable `DetectionEngine`
- Light/dark theme, history, lightweight analytics, settings

The classification is a **demo stand-in**. The real anti-spoofing model will
implement the same `DetectionEngine` interface and replace the demo without
touching the UI or the audio pipeline.

## Quick start

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run dev      # start the Vite dev server
npm run build    # typecheck + production build
npm run lint     # oxlint
npm run preview  # preview the production build
```

## Structure

```
src/
├── components/
│   ├── layout/        # app shell (header, footer)
│   ├── navigation/    # lightweight menu
│   ├── voice/         # mic control
│   ├── waveform/      # live waveform
│   ├── status/        # result presentation
│   └── ui/            # button, page header
├── pages/             # Overview, Voice Check, History, Analytics, ...
├── hooks/             # useMicrophone, useAudioAnalyzer
├── services/
│   └── detection/     # DetectionEngine + DemoDetectionEngine
├── lib/               # theme, store, router, navigation config
├── types/             # voice domain types
└── utils/
```