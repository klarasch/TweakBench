console.log('TweakBench: Content Script Loaded');

import type { AppState } from '../types.ts';

const STORAGE_KEY = 'tweakbench_data';
const injectedStyles = new Map<string, HTMLStyleElement>();
const injectedElements = new Map<string, HTMLElement>();

let updateTimeout: any = null;
let transitionTimeout: any = null;
const TRANSITION_DURATION = 250; // ms
const TRANSITION_STYLE_ID = 'tb-transition-manager';

function setupTransition() {
    if (document.getElementById(TRANSITION_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = TRANSITION_STYLE_ID;
    style.textContent = `
        .tb-transitioning, .tb-transitioning * {
            transition: background-color ${TRANSITION_DURATION}ms ease, 
                        color ${TRANSITION_DURATION}ms ease, 
                        border-color ${TRANSITION_DURATION}ms ease, 
                        opacity ${TRANSITION_DURATION}ms ease, 
                        filter ${TRANSITION_DURATION}ms ease !important;
        }
    `;
    document.head.appendChild(style);
}

function startTransition() {
    setupTransition();
    document.documentElement.classList.add('tb-transitioning');
    if (transitionTimeout) clearTimeout(transitionTimeout);
    transitionTimeout = setTimeout(() => {
        document.documentElement.classList.remove('tb-transitioning');
    }, TRANSITION_DURATION + 50);
}

// Message Listener for State Updates
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.type === 'PING') {
        console.log('TweakBench: PING received');
        sendResponse('PONG');
    }

    if (request.type === 'STATE_UPDATED') {
        console.log('TweakBench: State Updated via messaging');
        debouncedUpdate(request.state);
    }

    if (request.type === 'SCAN_CSS_VARIABLES') {
        console.log('TweakBench: Scanning CSS Variables');
        const variables: Record<string, Record<string, string>> = {};

        // Helper to add variable
        const addVar = (scope: string, name: string, value: string) => {
            if (!variables[scope]) variables[scope] = {};
            variables[scope][name] = value;
        };

        try {
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
                    console.warn('TweakBench: Cannot access stylesheet rules (likely CORS)', e);
                }
            }
        } catch (e) {
            console.error('TweakBench: Error scanning stylesheets', e);
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
    console.log('TweakBench: Updating Styles/HTML', state);
    startTransition();
    const activeSnippetIds = new Set<string>();

    // Prepare snippet map for O(1) lookup
    const snippets = state.snippets || [];
    const snippetMap = new Map(snippets.map(s => [s.id, s]));

    const themes = state.themes || [];
    const globalEnabled = state.globalEnabled ?? true;
    const currentUrl = window.location.href;

    if (!globalEnabled) {
        console.log('TweakBench: Global Disabled');
        // Fall through to cleanup (activeSnippetIds will be empty)
    } else {
        themes.forEach(theme => {
            if (!theme.isActive) return;
            // Check Domain Patterns
            if (theme.domainPatterns && theme.domainPatterns.length > 0 && !isDomainMatch(theme.domainPatterns, currentUrl)) {
                return;
            }

            theme.items.forEach(item => {
                if (!item.isEnabled) return;

                const snippet = snippetMap.get(item.snippetId);
                if (snippet) {
                    // Merge overrides
                    const effectiveSnippet = {
                        ...snippet,
                        ...item.overrides,
                        content: item.overrides?.content ?? snippet.content,
                        selector: item.overrides?.selector ?? snippet.selector,
                        position: item.overrides?.position ?? snippet.position
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

    // Cleanup CSS
    for (const [id, styleEl] of injectedStyles.entries()) {
        if (!activeSnippetIds.has(id)) {
            console.log('TweakBench: Removing CSS snippet', id);
            styleEl.remove();
            injectedStyles.delete(id);
        }
    }

    // Cleanup HTML
    for (const [id, el] of injectedElements.entries()) {
        if (!activeSnippetIds.has(id)) {
            console.log('TweakBench: Removing HTML snippet', id);
            el.remove();
            injectedElements.delete(id);
        }
    }
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
    // We ignore whitespace text nodes for this decision, but we might lose them if we unwrap.
    if (temp.children.length === 1) {
        newEl = temp.firstElementChild as HTMLElement;
    } else {
        newEl = document.createElement('div');
        newEl.innerHTML = snippet.content;
        isWrapped = true;
    }

    // 2. Tag it with metadata
    // We attach ID to the injected element (or wrapper).
    // Note: If user provided an ID in their HTML, we overwrite it. 
    // This is necessary for tracking.
    newEl.id = `tb-html-${id}`;
    newEl.setAttribute('data-tb-generated', isWrapped ? 'wrapped' : 'direct');
    newEl.setAttribute('data-tb-position', position);
    newEl.setAttribute('data-tb-selector', selector);
    newEl.setAttribute('data-tb-content-raw', snippet.content);

    // Check if we need to replace existing
    // Optimization: If content is same, do nothing
    if (el && inDOM) {
        // We use data-tb-content-hash or just compare innerHTML (risky but better than nothing)
        // Actually, comparing snippet.content directly with a stored attribute is cleanest.
        const lastContent = el.getAttribute('data-tb-content-raw');
        if (lastContent === snippet.content) {
            // Still check position/selector in case they changed
            const lastPosition = el.getAttribute('data-tb-position');
            const lastSelector = el.getAttribute('data-tb-selector');
            if (lastPosition === position && lastSelector === selector) {
                return; // Nothing changed
            }
        }
    }

    if (el && inDOM) {
        // Check if we strictly need to update (avoid flash)
        // If position/selector changed, we move.
        // If content changed, we replace.
        // For now, Replace is safest.

        // Match position?
        // If we just do replaceWith, position is preserved relative to siblings, 
        // BUT if the user changed 'position' (e.g. append -> prepend), replaceWith won't move it.
        // So we need to remove and re-insert if info changed.

        const lastPosition = el.getAttribute('data-tb-position');
        const lastSelector = el.getAttribute('data-tb-selector');

        if (lastPosition !== position || lastSelector !== selector) {
            el.remove();
            el = undefined; // Trigger insertion logic
        } else {
            // Same position/selector, just content update?
            // replaceWith keeps it in same spot.
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
