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
- Current Version: 0.1.8

## Current Task
- Finalizing starter kit and documentation.

## Decisions & Changes
- **Import/Export Reliability**: Remapped `groupId` during imports to ensure isolation. Added `activeThemeId` to export format.
- **Starter Kit**: Created `starter_kit.json` demonstrating domain groups (Wikipedia fonts/colors), HTML injection (ChatGPT focus badge), and typography improvements.
- **Versioning**: Bumped to 0.1.5 to reflect import/export fixes and starter kit additions.
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

## Other instructions
- Try to maintain clean and scalable code
- Maintain this document
– Always decide whether user guide needs to be updated and do it if needed
– Maintain a changelog for new features and changes
— Maintain a non-public changelog with one-liner summarizations of changes
– Always suggest a new version number when appropriate
– Always take a look at todo.md to check whether there are any tasks that can be done together with the current task (in controlled, relevant way — decide on reasonable chunks and don't do too unrelated things) and maintain todo.md accordingly
— Ask for clarifications when needed