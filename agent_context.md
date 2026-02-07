# Agent Context: TweakBench

## Project Overview
TweakBench is a browser extension tool (built with Vite, React, TypeScript) for "tweaking" web pages by injecting CSS and JS snippets (themes).

## Architecture
- **Popup/Panel**: React-based UI for managing themes and snippets.
- **Background**: Handles extension lifecycle and potentially messaging.
- **Content Script**: Responsible for injecting the "tweaks" (themes) into the target web pages.
- **Storage**: Uses `chrome.storage.local` to persist themes and snippets.
- **Store**: Likely a Redux or similar state management (Zustand mentioned in previous contexts) in `src/store.ts`.

## Theme Application Logic
- Themes are groups of snippets (CSS/JS).
- When a theme is toggled, the content script needs to update the injected styles/scripts on the active tab(s).

## Recent Performance Improvements
- A previous optimization (50da8b0e-e7c8-4143-9f60-4be2d1506d0a) addressed theme application latency.

## Performance Bottlenecks to Investigate
- `chrome.storage.onChanged` latency.
- Excessive DOM updates when injecting CSS.
- Message passing overhead.
- React re-renders in the panel.

## Implementation Guidelines
- Preserve sentence case in UI.
- Use subtle animations for transitions.
- Prefer small, targeted diffs.