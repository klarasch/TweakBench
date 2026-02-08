# What needs to be done

Note: [ASK] means that ALWAYS ask before doing it

## Big new things

### Add JS panels
Actually, it's already possible to inject JS through injecting ```<script>``` tag, but it's not clean. We'd need to discuss the impact and implications across the UI first. 

## Improvements (1 – least priority, 5 — highest priority)
[ ] 1 [ASK]: In theme detail and theme list, add "export merged CSS / JS"
[x] 3: Replace "Quick add" copy with "Add from Library"
[x] 4: Add ability to delete snippets in Library select mode
[x] 3: in the detail, unify the domain badge on theme detail with the one on theme list (so that when only 1 domain is configured, it's directly displayed - current: 1 domain, desired: example.com)

## Bugs (1 – non-critical, 5 – critical)

---

# Archive
[x] don't start with a library snippet (just local)
[x] domain mgmt
    * when creating a new theme, it should offer making it for a the domain of active tab
    * same for domain management — when adding a new domain, it should offer making it for a the domain of active tab
[x] add domain management trigger from the initial screen
[x] change browser dialogues to in-UI
[x] clean up overflow menus
[x] remove weird framer animations (side panel)
[x] enable reorder in stack
[x] make it possible to export the whole workspace
[x] make library scoped (show relevant in tabs and only show whole library on initial screen)
[x] when importing to an empty space, don't ask how to handle conflicts

## Improvements (1 – least priority, 5 — highest priority)
[x] 2: in zero state (no themes yet), offer to load an example
[x] 5: in overflow menu of a group, add option to duplicate the group
[x] 4: improve drag experience in themes list and theme detail
[x] 3: in all places where domain is configured, when there aren't any domains yet, user may not notice that they have to enter or click plus to offer the first one
[x] 5: add a way to import/export domain group (in import, don't make it another option, just update to "Import theme or group)
[x] 4: use same cursors for drag and drop in theme list as are in theme detail (pointer on hover, grabbing during movement)
[x] 3: cosmetic: collapsed group header should use the same size toggle as theme cards in theme list and match its alignment
[x] 2: add footer with credits and coffee link

## Bugs (1 – non-critical, 5 – critical)
[x] current: when duplicating a theme in a group, it becomes active and there are two active themes in the group; expected: the duplicate is inactive
[x] current: when importing to a zero state, dialogue asking how to handle conflicts is shown; expected: no dialogue is shown and the imported theme is activated
[x] current: when there is just 1 theme in a group, on its detail badge "Inactive (another theme in group is active)" is shown; expected: group inactive
[x] 3: cosmetic: outline button and filled button have slightly different heights
[x] 3: cosmetic: collapsed group header should use the same size toggle as theme cards in theme list