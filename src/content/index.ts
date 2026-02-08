console.log('TweakBench: Content Script Loaded');

import type { AppState } from '../types.ts';

const STORAGE_KEY = 'tweakbench_data';
const injectedStyles = new Map<string, HTMLStyleElement>();
const injectedElements = new Map<string, HTMLElement>();

let lastProcessedTimestamp: number = 0;
let lastProcessedGlobalEnabled: boolean | null = null;
let lastActiveThemeIds = new Set<string>();

let updateTimeout: any = null;
let transitionTimeout: any = null;
const TRANSITION_DURATION = 120; // ms
const TRANSITION_STYLE_ID = 'tb-transition-manager';

function setupTransition() {
    if (document.getElementById(TRANSITION_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = TRANSITION_STYLE_ID;
    style.textContent = `
        html.tb-transition-active {
            transition: opacity ${TRANSITION_DURATION}ms ease !important;
        }
        html.tb-switching {
            opacity: 0.92 !important;
        }
    `;
    document.head.appendChild(style);
}

function startTransition() {
    setupTransition();
    const html = document.documentElement;

    // Add both classes to start the fade out
    html.classList.add('tb-transition-active');
    html.classList.add('tb-switching');

    if (transitionTimeout) clearTimeout(transitionTimeout);

    // We remove the switching class quickly to trigger the fade back in
    // This creates a subtle "dip" in opacity that masks the content change
    transitionTimeout = setTimeout(() => {
        html.classList.remove('tb-switching');

        // Remove the transition property after the fade-in is complete
        setTimeout(() => {
            html.classList.remove('tb-transition-active');
        }, TRANSITION_DURATION);
    }, TRANSITION_DURATION / 2);
}

// Message Listener for State Updates
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'PING') {
        console.log('TweakBench: PING received');
        sendResponse('PONG');
    }

    if (message.type === 'STATE_UPDATED') {
        console.log('TweakBench: State Updated via messaging (Direct)');
        // Direct updates from panel/active tab bypass debounce for maximum snappiness
        updateStyles(message.state);
    }

    if (message.type === 'SCAN_CSS_VARIABLES') {
        console.log('TweakBench: Scanning CSS Variables');
        const variables: Record<string, Record<string, string>> = {};

        // Helper to add variable
        const addVar = (scope: string, name: string, value: string) => {
            if (!variables[scope]) variables[scope] = {};
            variables[scope][name] = value;
        };

        try {
            // 1. Scan via Stylesheets (if accessible)
            for (const sheet of Array.from(document.styleSheets)) {
                try {
                    // Check for CORS or access issues
                    if (!sheet.cssRules) continue;

                    for (const rule of Array.from(sheet.cssRules)) {
                        if (rule instanceof CSSStyleRule) {
                            const selector = rule.selectorText;
                            for (let i = 0; i < rule.style.length; i++) {
                                const propName = rule.style[i];
                                if (propName.startsWith('--')) {
                                    const value = rule.style.getPropertyValue(propName).trim();
                                    addVar(selector, propName, value);
                                }
                            }
                        }
                    }
                } catch (e) {
                    // This is common for external stylesheets (CDNs, etc.)
                }
            }

            // 2. Fallback/Supplement: Scan current computed root variables
            // This bypasses CORS because it reads the computed values of the element
            // Most CSS variables are defined on :root/html
            const rootStyle = window.getComputedStyle(document.documentElement);
            const bodyStyle = window.getComputedStyle(document.body);

            const scanElement = (style: CSSStyleDeclaration, scope: string) => {
                for (let i = 0; i < style.length; i++) {
                    const propName = style[i];
                    if (propName.startsWith('--')) {
                        const value = style.getPropertyValue(propName).trim();
                        addVar(scope, propName, value);
                    }
                }
            };

            scanElement(rootStyle, ':root');
            scanElement(bodyStyle, 'body');

        } catch (e) {
            console.error('TweakBench: Error scanning variables', e);
        }

        sendResponse({ variables });
    }
});

import { isDomainMatch } from '../utils/domains.ts';

function debouncedUpdate(state: AppState) {
    if (updateTimeout) clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        updateStyles(state);
    }, 10); // Very short debounce to catch nearly simultaneous storage/message updates
}

function updateStyles(state: AppState) {
    const globalEnabled = state.globalEnabled ?? true;
    const currentUrl = window.location.href;

    // 1. Pre-Match Orchestration
    const themes = state.themes || [];
    const activeThemesForThisTab = themes.filter(t => t.isActive && isDomainMatch(t.domainPatterns, currentUrl));
    const currentActiveThemeIds = new Set(activeThemesForThisTab.map(t => t.id));

    const hasMatch = currentActiveThemeIds.size > 0;
    const hasInjections = injectedStyles.size > 0 || injectedElements.size > 0;

    if (!hasMatch && !hasInjections && globalEnabled) {
        return;
    }

    // Deduplication check
    const latestChange = Math.max(
        ...state.themes.map(t => t.updatedAt || 0),
        ...state.snippets.map(s => s.updatedAt || 0)
    );

    const isDifferentGlobal = globalEnabled !== lastProcessedGlobalEnabled;
    const isNewerContent = latestChange > lastProcessedTimestamp;

    if (!isDifferentGlobal && !isNewerContent && latestChange > 0) {
        return;
    }

    lastProcessedTimestamp = Math.max(lastProcessedTimestamp, latestChange);
    lastProcessedGlobalEnabled = globalEnabled;

    // Determine if we need a transition (structural change vs content update)
    // We only transition if there's an effective change in what's being applied to this tab.
    const wasEffectivelyActive = lastProcessedGlobalEnabled && lastActiveThemeIds.size > 0;
    const isEffectivelyActive = globalEnabled && currentActiveThemeIds.size > 0;

    let needsTransition = false;
    if (lastProcessedGlobalEnabled !== null && wasEffectivelyActive !== isEffectivelyActive) {
        needsTransition = true;
    } else if (isEffectivelyActive) {
        // Check if the set of active themes changed while remaining effectively active
        // This covers group switching or adding/removing individual themes.
        if (currentActiveThemeIds.size !== lastActiveThemeIds.size) {
            needsTransition = true;
        } else {
            for (const id of currentActiveThemeIds) {
                if (!lastActiveThemeIds.has(id)) {
                    needsTransition = true;
                    break;
                }
            }
        }
    }
    lastActiveThemeIds = currentActiveThemeIds;

    // Batch all updates into a single frame
    requestAnimationFrame(() => {
        // Only trigger transition if actually requested AND needed
        if (needsTransition && (hasMatch || hasInjections)) {
            startTransition();
        }

        const activeSnippetIds = new Set<string>();
        const snippets = state.snippets || [];
        const snippetMap = new Map(snippets.map(s => [s.id, s]));

        if (globalEnabled) {
            themes.forEach(theme => {
                if (!theme.isActive) return;
                if (theme.domainPatterns && theme.domainPatterns.length > 0 && !isDomainMatch(theme.domainPatterns, currentUrl)) {
                    return;
                }

                theme.items.forEach(item => {
                    if (!item.isEnabled) return;
                    const snippet = snippetMap.get(item.snippetId);
                    if (snippet) {
                        const effectiveSnippet = {
                            ...snippet,
                            ...item.overrides,
                        };

                        activeSnippetIds.add(snippet.id);
                        if (snippet.type === 'css') {
                            injectOrUpdateStyle(snippet.id, effectiveSnippet.content);
                        } else if (snippet.type === 'html') {
                            injectOrUpdateHTML(snippet.id, effectiveSnippet);
                        }
                    }
                });
            });
        }

        // Cleanup in the same frame
        for (const [id, styleEl] of injectedStyles.entries()) {
            if (!activeSnippetIds.has(id)) {
                styleEl.remove();
                injectedStyles.delete(id);
            }
        }

        for (const [id, el] of injectedElements.entries()) {
            if (!activeSnippetIds.has(id)) {
                el.remove();
                injectedElements.delete(id);
            }
        }
    });
}

function injectOrUpdateStyle(id: string, content: string) {
    let styleEl = injectedStyles.get(id);

    const inDOM = styleEl && styleEl.isConnected;

    if (!inDOM) {
        const existing = document.getElementById(`tb-style-${id}`);
        if (existing instanceof HTMLStyleElement) {
            styleEl = existing;
        } else {
            styleEl = document.createElement('style');
            styleEl.id = `tb-style-${id}`;
            document.head.appendChild(styleEl);
        }
        injectedStyles.set(id, styleEl);
    }

    if (!styleEl) return;

    if (!styleEl.isConnected) {
        document.head.appendChild(styleEl);
    }
    if (styleEl.textContent !== content) {
        styleEl.textContent = content;
        styleEl.setAttribute('data-updated', Date.now().toString());
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function injectOrUpdateHTML(id: string, snippet: any) {
    let el = injectedElements.get(id);

    // Check if we lost the reference but it's still in DOM
    if (!el || !el.isConnected) {
        const existing = document.querySelector(`[data-tb-snippet-id="${id}"]`);
        if (existing instanceof HTMLElement) {
            el = existing;
            injectedElements.set(id, el);
        }
    }

    const inDOM = el && el.isConnected;

    // HTML injection is trickier because we need a target selector.
    // Default to body if no selector.
    const selector = snippet.selector || 'body';
    const position = snippet.position || 'beforeend';

    // Find target
    const target = document.querySelector(selector);
    if (!target) {
        console.debug(`TweakBench: Target not found for HTML snippet ${id} (${selector}) - This is normal if the element isn't on the page.`);
        return;
    }

    // 1. Parse Content to decide on Element or Wrapper
    const temp = document.createElement('div');
    temp.innerHTML = snippet.content;

    let newEl: HTMLElement;
    let isWrapped = false;

    // Logic: If exactly one Element child, use it directly. Otherwise wrap in DIV.
    if (temp.children.length === 1) {
        newEl = temp.firstElementChild as HTMLElement;
    } else {
        newEl = document.createElement('div');
        newEl.innerHTML = snippet.content;
        isWrapped = true;
    }

    // 2. Tag it with metadata without stomping on user ID
    // We use data-tb-snippet-id for tracking instead of id property.
    newEl.setAttribute('data-tb-snippet-id', id);
    newEl.classList.add('tb-snippet');

    // If user provided an ID, keep it. Otherwise set a stable default.
    if (!newEl.id) {
        newEl.id = `tb-snippet-${id}`;
    }

    newEl.setAttribute('data-tb-generated', isWrapped ? 'wrapped' : 'direct');
    newEl.setAttribute('data-tb-position', position);
    newEl.setAttribute('data-tb-selector', selector);
    newEl.setAttribute('data-tb-content-raw', snippet.content);

    // Check if we need to replace existing
    if (el && inDOM) {
        const lastContent = el.getAttribute('data-tb-content-raw');
        if (lastContent === snippet.content) {
            const lastPosition = el.getAttribute('data-tb-position');
            const lastSelector = el.getAttribute('data-tb-selector');
            if (lastPosition === position && lastSelector === selector) {
                return; // Nothing changed
            }
        }
    }

    if (el && inDOM) {
        const lastPosition = el.getAttribute('data-tb-position');
        const lastSelector = el.getAttribute('data-tb-selector');

        if (lastPosition !== position || lastSelector !== selector) {
            el.remove();
            el = undefined;
        } else {
            el.replaceWith(newEl);
            injectedElements.set(id, newEl);
            return;
        }
    }

    // Insert New (or Moved)
    if (position === 'append' || position === 'beforeend') {
        target.appendChild(newEl);
    } else if (position === 'prepend' || position === 'afterbegin') {
        target.prepend(newEl);
    } else if (position === 'before' || position === 'beforebegin') {
        target.parentNode?.insertBefore(newEl, target);
    } else if (position === 'after' || position === 'afterend') {
        target.parentNode?.insertBefore(newEl, target.nextSibling);
    }

    injectedElements.set(id, newEl);
}

chrome.storage.local.get([STORAGE_KEY], (result) => {
    console.log('TweakBench: Initial Load', result);
    const data = result[STORAGE_KEY] as AppState;
    if (data) {
        debouncedUpdate(data);
    }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[STORAGE_KEY]) {
        console.log('TweakBench: Storage Changed', changes[STORAGE_KEY].newValue);
        debouncedUpdate(changes[STORAGE_KEY].newValue as AppState);
    }
});
