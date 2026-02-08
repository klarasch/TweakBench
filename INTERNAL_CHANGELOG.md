# Internal Changelog

- Created robust `starter_kit.json` with domain groups and HTML injection.
- Fixed `groupId` remapping during import to ensure collection isolation.
- Added `activeThemeId` to export format for full state restoration.
- Implemented `loadExampleData` in store and integrated it into zero-state UI.
- Fixed bug where duplicating themes in groups resulted in multiple active themes.
- Optimized import flow to skip conflict dialog when workspace is empty.
- Expanded library snippets with popular font families (Roboto, Montserrat, Playfair).
- Simplified "Scroll to top" utility snippet for better UX.
- Bumped version to 0.1.7.
- (Refactor) Introduced Tailwind shorthand classes (`.btn-ghost-muted`, `.icon-button`, etc.) in `index.css`.
- (Refactor) Decomposed `ThemeList.tsx` by moving all modal JSX to `ThemeListModals.tsx`.
- (Refactor) Decomposed `ThemeDetail.tsx` by extracting search and selection logic into custom hooks (`useThemeDetailSearch`, `useThemeDetailSelection`).
- (Refactor) Decomposed `ThemeDetail.tsx` by consolidating all dialogs into `ThemeDetailModals.tsx`.
- Standardized domain management UI by creating `DomainConfigSection.tsx` and integrating it into both creation and configuration modals.
- Updated `ThemeList.tsx` to handle more robust domain configuration during item and group creation.
- Fixed focus issue in creation modals by making `autoFocus` in `DomainListEditor` optional and disabled by default.
- Fixed critical "Import all data" bug by reverting `Theme.items` to required and fixing validation logic.
- Robustly handled theme item remapping and duplicate skipping in `importAllData` action.

