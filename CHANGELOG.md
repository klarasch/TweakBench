# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.9] - 2026-03-09

### Changed
- **Rebranding**: App renamed to ThemeBench. Main page title changed from "Tweaks" to "Themes".
- **Export Format**: Transitioned the single-theme export format from JavaScript (`.js`) to JSON (`.json`) for better reliability, smaller file sizes, and unified import logic.

### Added
- **Export Group**: Added "Export group" option to the domain group overflow (kebab) menu, allowing users to export all themes and snippets within a group as a single JSON file.
- **Inline Renaming**: Double-clicking a theme name in the list now triggers an inline rename mode, allowing for faster editing without opening the full theme detail.
- **Rename Action**: Added a "Rename" option to the theme overflow (kebab) and context menus.

## [0.1.8] - 2026-02-08

### Changed
- **Theme Listing UX**: The primary action when clicking a theme tile in the list now enables/disables the theme directly, rather than entering the edit mode. To edit a theme, a new hover-triggered pencil icon button has been added to the tiles, and an "Edit theme" option has been added to the theme's overflow (kebab) menu.

### Fixed
- **Theme Creation**: New themes now correctly start with an empty state (no default snippet added). This fix resolves a regression from previous versions.

### Build
- **Readable Builds**: Disabled minification and obfuscation for extension review purposes. Filename hashing is removed, and CSS/JS are now output in a readable format.

## [0.1.7] - 2026-02-07

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
