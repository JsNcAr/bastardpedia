# 0004. Defer the Android (Capacitor) build

Date: 2026-10-16

## Status

Accepted

## Context

ChronoTeach is Android-first and ships a Capacitor app with a signed-release
flow. This project is a desktop website with an app option. Its features are
reading, filtering and keeping personal lists, and none of them needs native
APIs.

## Decision

Ship an installable PWA (vite-plugin-pwa). It installs from Chrome and Edge on
desktop and Android, and from Safari on iOS. No `android/` project and no
`release:publish` step for now. When there's a reason for a store app,
`docs/ROADMAP.md` describes adding Capacitor 8 along ChronoTeach's lines.

## Consequences

**Accepted.** Much less to maintain: no signing key, no Gradle, no APK uploads.

**Cost.** No Play Store presence, and none of the native extras (share
targets, widgets) until Capacitor is added.
