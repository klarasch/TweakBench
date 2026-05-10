# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.11] - 2026-04-28

### Added
- **Domain Group Naming**: Domain groups can now be named for better organization. Double-click the group header or use the context menu to rename a group. This feature is fully backwards compatible with older backup files.

### Changed
- **UI Simplification**: Removed the "Active on this tab" text label from the UI to reduce clutter, relying on pulsing dots and green border indicators for match feedback.
- **Responsive Theme/Domain Layout**: Optimized for long names; themes now take priority, and domain lists switch to a compact count label (e.g., "3 Domains") when space is limited. Full domain lists are accessible via tooltips.
- **Consistent Toggle Width**: Standardized the `Toggle` component width using a grid-stack technique to ensure consistent alignment in lists regardless of its state (ON/OFF).

## [0.1.10] - 2026-04-28

### Added
- **System Off Confirmation Modal**: A new interaction that prevents users from accidentally enabling themes while the global system is off.
- **Undo Support**: All drag-and-drop operations now show an "Undo" toast that allows users to instantly revert changes.
- **Panel State Persistence**: The plugin now remembers which view (list or theme detail) was open when the side panel is closed, and restores it when reopened.
- **Wipe All Data**: Added an option to completely wipe all themes and snippets via the main screen overflow menu, protected by a confirmation dialog.
- **New Tooltip System**: Custom `Tooltip` component using React Portals for better viewport management and z-index handling. Integrated into toggles and all interactive elements.
- **Expanded Drop Zone**: The file drag-and-drop area in the ThemeList now covers the full UI height, especially improved for the zero-state experience.

### Improved
- **Drag and Drop Reordering**: Overhauled theme list drag-and-drop to support reordering within groups, dragging themes out of groups (detach), and dragging themes into groups (attach).
- **Visual Feedback**: Groups now highlight with a blue ring when receiving a theme drop. Detaching a theme shows a green ring indicator.
- **Snappier Toggles**: Adjusted click-delay for theme names to 150ms for faster activation feedback.
- **Library UX**: Changed snippet renaming in the library to double-click for consistency with the theme list.
- **Theme Detail Navigation**: Made expand/collapse animations immediate and persistent per-theme.

### Fixed
- Fixed a conflict where double-clicking a theme name to rename it would also toggle the theme's enabled state.
- Fixed an issue where pressing the spacebar while renaming a theme would trigger unwanted behaviors.
- Resolved a major memory leak caused by large state logging and un-cleared internal timeouts.
- 2026-05-09 09:00:00 UTC - Fixed version mismatch: updated `public/manifest.json` to `0.1.11` to match `package.json`.
- 2026-05-09 09:07:00 UTC - Fixed responsiveness for long theme and domain names. Implemented prioritized name layout and compact domain count labels with full-list tooltips in `ThemeItem`, `ThemeGroup`, and `ThemeHeader`.

## [0.1.9] - 2026-03-09

### Added
- **Starter Kit Expansion**: Added more library snippets for popular fonts (Roboto, Montserrat, Playfair Display) and simplified the "Scroll to top" utility.
- **Internal Changelog**: Established `INTERNAL_CHANGELOG.md` for team-facing change summaries.

### Fixed
- **Load Starter Kit**: Fixed the functionality and moved the JSON to `public/` for reliable fetching.
- **Import Flow**: Optimized "Import All" to skip the conflict handling dialogue when the target workspace is empty.
- **UI Refinement**: Fixed misleading "Group active" badge logic in theme headers and items when no other themes are active.
- **Bug Fix**: Duplicated themes in groups are now correctly created as inactive.
- **Reordering Precision**: Fixed issues with drag and drop sensitivity, specifically making it easier to target the first list position and distinguishing between root and group drops.

### Refined
- **Improved Reordering Mechanics**: Overhauled theme and group reordering to use standard sortable behavior (closestCenter) for a more native and predictable feel.
- **Natural Shifting**: Themes and groups now shift smoothly using built-in transitions, eliminating manual drop spacers.
- **Robust Nested Reordering**: Hardened reordering logic to correctly handle themes within and between domain groups.
- **Visual Feedback**: Added subtle background tint and border highlighting exclusively for **Domain Groups** when accepting a theme. Removed redundant highlights from individual themes.
- **Group Detachment**: Added "Detach from group" option to theme context menus.
- **Import Safety**: Added confirmation dialogue and danger styling for "Replace" import mode.
- **Theme Creation**: Hidden domain configuration and updated modal titles when adding themes directly to a domain group.

### Refactored
- **Tailwind Shorthands**: Introduced `@apply` classes in `index.css` for consistent styling across buttons, cards, and icons.
- **ThemeList Component**: Decomposed the massive `ThemeList.tsx` by extracting import/export logic into `useThemeListImportExport` hook and modal UI into `ThemeListModals.tsx`.
- **ThemeDetail Component**: Simplified `ThemeDetail.tsx` by extracting search and selection logic into custom hooks and consolidating modals.
- **Improved Creation Dialogues**: Replaced "Detected domain" quick-add with a full domain configuration section in Theme and Group creation modals, ensuring consistency with the main configuration UI. "Run everywhere" now defaults to **OFF**.


## [0.1.6] - 2026-02-07

## [0.1.5] - 2026-02-07

## [0.1.4] - 2026-02-06

### Changed
- Repositioned header actions (Collapse all, Select) to the right side.
- Moved domain group selection checkboxes to the left in selection mode.
- Standardized corner radius to `rounded-lg` across the theme list.

### Fixed
- Fixed issue where cursor position in editors was reset after reordering snippets.
- Corrected snippet usage count display logic.

## [0.1.3] - 2026-02-06

### Added
- Domain Groups (formerly Switch Groups) for mutual exclusivity and shared rules.
- Drag and drop reordering for themes and groups.
- Snippet duplication and detachment.
- **Rebranding:** App renamed from TweakBench to ThemeBench. Updated all user-facing names, manifest, exported files, internal logs, and project metadata.
