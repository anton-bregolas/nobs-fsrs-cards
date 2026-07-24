# Changelog

All notable changes to this project will be documented in this file.

## [0.1.3](https://github.com/bregolas/nobscards/compare/v0.1.2...v0.1.3) (2026-07-24)

### ✨ Features

* add text-to-speech interface to cards ([0aa90e9](https://github.com/bregolas/nobscards/commit/0aa90e923bd2da503f2844e1cfc4e7c246e2a682))
* add TTS UI to cards, group with translation UI ([0aa90e9](https://github.com/bregolas/nobscards/commit/0aa90e923bd2da503f2844e1cfc4e7c246e2a682))
* add Web Speech API support (default TTS) ([0aa90e9](https://github.com/bregolas/nobscards/commit/0aa90e923bd2da503f2844e1cfc4e7c246e2a682))
* add Google Cloud API support (optional TTS) ([0aa90e9](https://github.com/bregolas/nobscards/commit/0aa90e923bd2da503f2844e1cfc4e7c246e2a682))
* add Azure API support (optional TTS) ([0aa90e9](https://github.com/bregolas/nobscards/commit/0aa90e923bd2da503f2844e1cfc4e7c246e2a682))
* a11y: add accessible popover names & aria-live announcements ([0aa90e9](https://github.com/bregolas/nobscards/commit/0aa90e923bd2da503f2844e1cfc4e7c246e2a682))

### 🧪 Tests

* add TTS test suite ([0aa90e9](https://github.com/bregolas/nobscards/commit/0aa90e923bd2da503f2844e1cfc4e7c246e2a682))

### ♻️ Chores

* **release:** 0.1.3 ([3953f31](https://github.com/bregolas/nobscards/commit/3953f31898dc967a29e30b8bd093c29cd098215e))

## [0.1.2](https://github.com/bregolas/nobscards/compare/v0.1.1...v0.1.2) (2026-07-22)

### ✨ Features

* add keyboard shortcuts for card actions ([ba2008f](https://github.com/bregolas/nobscards/commit/ba2008fc46ef9be9c45a113dce6218587f58d310))

### 🐛 Bug Fixes

* prevent focus & tabbing for hidden elements ([cdc7a4d](https://github.com/bregolas/nobscards/commit/cdc7a4d1cb9b818d5a55c1cb156d12706bf8d256))

### 🧪 Tests

* update test suite with nav & focus changes ([13620f7](https://github.com/bregolas/nobscards/commit/13620f76ce3bd57879d8d23d6767da5d9f419ec3))
* increase coverage to ~80% ([00ce070](https://github.com/bregolas/nobscards/commit/00ce070c093fe1bddf7f727f73a81e8fc946174d))

### ⚙️ Continuous Integrations

* update deploy pipeline to use node 24 ([16194e4](https://github.com/bregolas/nobscards/commit/16194e4a5336011f7ebbfb2e1c32103a68ee7560))

### 💎 Styles

* fix overengineering & pixel artifact ([a238ae3](https://github.com/bregolas/nobscards/commit/a238ae31056c0d8925095b6e2ffbf3331f0d1916))

### 📚 Documentation

* update README with keyboard shortcuts ([ba2008f](https://github.com/bregolas/nobscards/commit/ba2008fc46ef9be9c45a113dce6218587f58d310))

### ♻️ Chores

* **release:** 0.1.2 ([571f4ca](https://github.com/bregolas/nobscards/commit/571f4ca3bd37b7e392511d65c4cccde231f71504))

## [0.1.1](https://github.com/bregolas/nobscards/compare/v0.1.0...v0.1.1) (2026-07-20)

### ✨ Features

* add PWA & full offline functionality ([d7331b4](https://github.com/bregolas/nobscards/commit/d7331b442bca622f8296e50d4c1b924e6e73f206))
* update app favicon, add icons for app manifest ([d7331b4](https://github.com/bregolas/nobscards/commit/d7331b442bca622f8296e50d4c1b924e6e73f206))

### 🔨 Build

* add vite-plugin-pwa to handle PWA & auto-inject service worker during the build ([d7331b4](https://github.com/bregolas/nobscards/commit/d7331b442bca622f8296e50d4c1b924e6e73f206))

### ♻️ Chores

* **release:** 0.1.1 ([20eccbb](https://github.com/bregolas/nobscards/commit/20eccbb3b352087ab10565a50b25ef0a8e356fef))

## [0.1.0](https://github.com/bregolas/nobscards/compare/v0.1.0) (2026-07-19)

### ✨ Features

* integrate FSRS spaced repetition algorithm ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* add free spaced repetition scheduler via ts-fsrs ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* add SRS review buttons rated Skip / Again / Hard / Good / Easy ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* implement SRS review commit on card change ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* persist uncommitted SRS ratings on tab close or refresh ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* implement priority display of SRS due-date cards ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* optionally add custom learning intervals for Again and Good ratings ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* auto-rate cards based on match percentage and input attempts ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* add independent sort preferences for Favorites and Learned tables ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* add SRS rating column in Favorites table ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* optionally auto-add rated words to Favorites ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* track ex-favorites to prevent auto-re-adding removed words ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* localize app to English, Russian, and Serbian ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))

### 🐛 Bug Fixes

* multiple synonyms in Phrasebook mode questions ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* bottom match status text wrapping ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* adjust Settings unit labels based on language ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))

### 📦 Refactors

* remove placeholder logic prioritizing Favorites ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* rename localStorage variables for clarity ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* separate sorting order storage for Favorites and Learned ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))

### 🧪 Tests

* add smoke test for App component rendering ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))

### 🔨 Build

* add vitest with happy-dom test environment ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* add commit-and-tag-version for release management ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))

### ⚙️ Continuous Integrations

* create custom pipeline for local build and commit ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* create custom pipeline for GitHub deploy and release ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))

### ♻️ Chores

* **release:** 0.1.0 ([b434a8d](https://github.com/bregolas/nobscards/commit/b434a8d2fe9ee7d0da23e6af31c8375afcc1f26c))
* rename project to No BS FSRS / nobs-fsrs-cards ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
* update README with FSRS and license documentation ([35ebbe8](https://github.com/bregolas/nobscards/commit/35ebbe85db20de41e7f87eb00938349317ad0bae))
