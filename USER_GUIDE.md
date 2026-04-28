# ThemeBench User Guide

ThemeBench is a browser extension that allows you to customize the web using CSS and JS snippets. This guide explains how to use the extension effectively.

## Core Concepts

### Themes
A **Theme** is a collection of snippets (CSS or JS) that work together to modify a website. You can enable or disable themes individually.

### Snippets
Snippets are the building blocks of themes.
- **CSS Snippets**: Used for styling (e.g., hiding elements, changing colors).
- **JS Snippets**: Used for logic (e.g., modifying DOM, adding keyboard shortcuts).

### Domain Groups
Domain groups allow you to organize themes that apply to the same websites. Inside a domain group, **only one theme can be active at a time**. This is useful for creating multiple versions of a site theme (e.g., "Work Mode", "Clean Mode").

---

## Getting Started

1. **Open the Side Panel**: Click the ThemeBench icon in your browser toolbar or use the side panel shortcut.
2. **Create a Theme**: Click the "Create new" button. You can choose to apply it to the current website automatically.
3. **Add Snippets**: Inside a theme, you can create new snippets or add existing ones from your **Library**.

---

## Managing Themes

### Enabling/Disabling Themes
Toggle the switch on a theme card to enable or disable it.
- **Global Toggle**: The top-most toggle in the status bar turns the entire system on or off.
- **System Off Modal**: If the global system is off and you try to enable a theme, ThemeBench will ask if you want to re-enable the entire system or only enable that specific theme.

### Domain Configuration
Click on the globe icon or the domain badge on a theme/group to configure where it runs.
- **Run everywhere**: The theme will be injected into all websites.
- **Specific Domains**: Use patterns like `google.com` or `*.github.com`.

### Reordering & Grouping
- **Drag and Drop**: You can reorder themes by dragging them.
- **Grouping**: Drag a theme over another to create a group, or drag it into an existing group.
- **Detaching**: Drag a theme out of a group to make it a standalone theme again.

---

## Export & Import

- **Export Workspace**: Back up all your themes and snippets from the main screen overflow menu.
- **Import Data**: Drag and drop a JSON export file into the side panel to import it. You can choose to merge, skip duplicates, or replace all current data.

---

## Advanced Tips

- **Search**: Press `Cmd+F` (Mac) or `Ctrl+F` (Windows) inside a theme to search through your snippets.
- **Library**: The snippet library stores all your snippets. Adding a snippet to a theme creates a link; editing it will update it in all themes unless you create a local copy.
- **Undo**: Most destructive actions (like deleting or reordering) can be undone using the toast notification that appears at the bottom.
