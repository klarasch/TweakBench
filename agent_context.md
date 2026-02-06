# Agent Context

## Architecture
- TweakBench is a browser extension for tweaking themes on web pages.
- `src/background`: Background scripts for the extension.
- `src/content`: Content scripts that run in the context of the web page.
- `src/store.ts`: Central state management using Zustand (likely).
- `src/components`: React components for the extension's UI.

## Conventions
- Uses TypeScript.
- Uses React for UI.
- Communicates between panel/popup and content scripts via messaging.
- **Copy**: Use sentence case for all UI labels, buttons, and copy.

## Current Task
- General maintenance and UI refinements.

## Decisions & Changes
- **Storage Optimization**: Added `immediate` flag to `storageService.save` to bypass debounce for UI actions. Reduced default debounce from 1000ms to 300ms.
- **Immediate Feedback**: Implemented `broadcastStateUpdate` messaging in `src/utils/messaging.ts` to push state changes to content scripts instantly.
- **Content Script Efficiency**: Refactored `updateStyles` in `src/content/index.ts` to use a Map for snippet lookups ($O(1)$) and added a message listener for `STATE_UPDATED`.
- **UI Cleanup (Modernization)**:
    - Replaced ON/OFF status buttons with modern switch toggles.
    - Implemented smart toggles that distinguish between "enabled" and "active on current tab" (pulsing green vs neutral dot).
    - Replaced redundant status badge dot with clearer switch-based feedback.
    - Standardized corner radius to `rounded-lg` across the theme list for visual consistency.
    - Reorganized group headers to swap Expand/Collapse and Group Label positions.
    - Theme names now use standard `text-sm` font size.
    - Moved "Delete" action into the overflow menu to reduce visual weight.
    - Repositioned header actions (Collapse all, Select) to the right side for better focus on the "Themes" title.
    - Moved domain group selection checkboxes to the left in selection mode to align with individual theme checkboxes.
