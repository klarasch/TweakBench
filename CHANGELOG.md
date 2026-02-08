# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.7] - 2026-02-07

### Added
- **Starter Kit Expansion**: Added more library snippets for popular fonts (Roboto, Montserrat, Playfair Display) and simplified the "Scroll to top" utility.
- **Internal Changelog**: Established `INTERNAL_CHANGELOG.md` for team-facing change summaries.

### Fixed
- **Load Starter Kit**: Fixed the functionality and moved the JSON to `public/` for reliable fetching.
- **Import Flow**: Optimized "Import All" to skip the conflict handling dialogue when the target workspace is empty.
- **UI Refinement**: Fixed misleading "Group active" badge logic in theme headers and items when no other themes are active.
- **Bug Fix**: Duplicated themes in groups are now correctly created as inactive.

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
