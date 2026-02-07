## What needs to be done

# Big new things

## Add JS panels
Actually, it's already possible to inject JS through injecting ```<script>``` tag, but it's not clean. We'd need to discuss the impact and implications across the UI first. 

# Improvements (1 – least priority, 5 — highest priority)
[ ] 2: make it possible to create a new theme for the current domain from the initial screen
[ ] 2: in zero state (no themes yet), offer to load an example
[ ] 5: in overflow menu of a group, add option to duplicate the group
[ ] 4: improve drag experience in themes list and (currently, the motion is aggressively smoothing, making it feel sluggish and unnatural)
[ ] 3: in all places where domain is configured, when there aren't any domains yet, user may not notice that they have to enter or click plus to offer the first one
[ ] 5: add a way to import/export domain group (in import, don't make it a second option, just update to Import theme or group)

# Bugs (1 – non-critical, 5 – critical)
[x] current: when duplicating a theme in a group, it becomes active and there are two active themes in the group; expected: the duplicate is inactive
[x] current: when importing to a zero state, dialogue asking how to handle conflicts is shown; expected: no dialogue is shown and the imported theme is activated
[x] current: when there is just 1 theme in a group, on its detail badge "Inactive (another theme in group is active)" is shown; expected: group inactive
[ ] 3: cosmetic: outline button and filled button have slightly different heights

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
