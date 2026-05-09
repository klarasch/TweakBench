# Agent Context: ThemeBench

## Project Overview
ThemeBench is a browser extension tool (built with Vite, React, TypeScript) for "tweaking" web pages by injecting CSS and JS snippets (themes).

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

## Recent Features & UX Improvements
- 2026-04-28: Implemented theme detaching from group to root level with dynamic insertion preview.
- 2026-04-28: Implemented System Off Confirmation Modal for theme activation.
- 2026-04-28: Added `bulkUpdateThemes` to the store.
- Theme tiles in the main list now toggle active state on click.
- Hover-triggered pencil icon and context menu option for editing themes.
- **Double-click to rename** for themes in the main list (with event propagation fix to avoid accidental toggling).
- Versatile "Rename" option in kebab and context menus.
- "Export group" option in the domain group overflow menu.
- **Custom Tooltip System**: Standardized on a custom `Tooltip` component (replacing native `title` attributes) for all interactive elements.
- **Standardized UI Colors**: Standardized interactive icons and metadata text to `text-slate-400` for consistent visibility.
- **Expanded Drop Zone**: The file drag-and-drop area in the ThemeList now covers the full UI height, especially improved for the zero-state experience.
- **System Off Confirmation Modal**: When the global system is off, enabling a theme prompts a modal asking whether to re-enable the entire system or only that specific theme.
- **UI Simplification**: Removed the "Active on this tab" text label from the UI to reduce clutter, relying on pulsing dots and green border indicators for match feedback.
- **Responsive Theme/Domain Layout**: Optimized for long names; themes now take priority, and domain lists switch to a compact count label (e.g., "3 Domains") when space is limited. Full domain lists are accessible via tooltips.


## Performance Bottlenecks to Investigate
- `chrome.storage.onChanged` latency.
- Excessive DOM updates when injecting CSS.
- Message passing overhead.
- React re-renders in the panel.

## Implementation Guidelines
- Preserve sentence case in UI.
- Use subtle animations for transitions.
- Prefer small, targeted diffs.

## Other instructions (DO NOT EDIT THIS SECTION)
- Maintain other sections of this document
– Always decide whether user guide needs to be updated and do it if needed
– Maintain CHANGELOG.md for new features and changes
— Maintain INTERNAL_CHANGELOG.md with short timestamped summarizations of changes and decisions
– Always suggest a new version number when appropriate
– Always take a look at todo.md to check whether there are any tasks that can be done together with the current task (in controlled, relevant way — decide on reasonable chunks and don't do too unrelated things) and update todo.md accordingly