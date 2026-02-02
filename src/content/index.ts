console.log('TweakBench: Content Script Loaded');

import type { AppState } from '../types.ts';

const STORAGE_KEY = 'tweakbench_data';
const injectedStyles = new Map<string, HTMLStyleElement>();
const injectedElements = new Map<string, HTMLElement>();

// Ping Listener for Panel
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.type === 'PING') {
        console.log('TweakBench: PING received');
        sendResponse('PONG');
    }
});

function updateStyles(state: AppState) {
    console.log('TweakBench: Updating Styles/HTML', state);
    const activeSnippetIds = new Set<string>();

    // Defensive checks
    const themes = state.themes || [];
    const snippets = state.snippets || [];
    const globalEnabled = state.globalEnabled ?? true;

    if (!globalEnabled) {
        console.log('TweakBench: Global Disabled');
        // Fall through to cleanup (activeSnippetIds will be empty)
    } else {
        themes.forEach(theme => {
            if (!theme.isActive) return;

            theme.items.forEach(item => {
                if (!item.isEnabled) return;

                const snippet = snippets.find(s => s.id === item.snippetId);
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
        console.warn(`TweakBench: Target not found for HTML snippet ${id} (${selector})`);
        return;
    }

    // Check if we need to move the element
    let needsMove = false;
    if (inDOM && el) {
        // Simple check: is the parent correct?
        // This doesn't cover "position within parent" (e.g. before/after), 
        // but it covers the main issue of wrong target.
        // To fully support re-ordering, we'd need to check siblings or force re-insert.
        // For now, let's force re-insert if the parent doesn't match the target (for append/prepend)
        // or if the parent doesn't match target's parent (for before/after).

        let expectedParent: Element | null = target;
        if (position === 'before' || position === 'after' || position === 'beforebegin' || position === 'afterend') {
            expectedParent = target.parentElement;
        }

        if (el.parentElement !== expectedParent) {
            needsMove = true;
        } else {
            // Even if parent matches, position might have changed (e.g. append -> prepend).
            // We can store the last position config on the element to check.
            const lastPosition = el.getAttribute('data-tb-position');
            const lastSelector = el.getAttribute('data-tb-selector');
            if (lastPosition !== position || lastSelector !== selector) {
                needsMove = true;
            }
        }
    }

    if (!inDOM || needsMove) {
        if (el && needsMove) {
            el.remove(); // Refreshes the insertion
        }

        if (!el || needsMove) {
            el = document.createElement('div');
            el.id = `tb-html-${id}`;
            el.setAttribute('data-tb-generated', 'true');
        }

        // Update metadata
        el.setAttribute('data-tb-position', position);
        el.setAttribute('data-tb-selector', selector);
        el.innerHTML = snippet.content;

        // Position logic
        if (position === 'append' || position === 'beforeend') {
            target.appendChild(el);
        } else if (position === 'prepend' || position === 'afterbegin') {
            target.prepend(el);
        } else if (position === 'before' || position === 'beforebegin') {
            target.parentNode?.insertBefore(el, target);
        } else if (position === 'after' || position === 'afterend') {
            target.parentNode?.insertBefore(el, target.nextSibling);
        }

        injectedElements.set(id, el);
    } else if (el) {
        // Update content if changed (and position was fine)
        if (el.innerHTML !== snippet.content) {
            el.innerHTML = snippet.content;
        }
    }
}

chrome.storage.local.get([STORAGE_KEY], (result) => {
    console.log('TweakBench: Initial Load', result);
    const data = result[STORAGE_KEY] as AppState;
    if (data) {
        updateStyles(data);
    }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[STORAGE_KEY]) {
        console.log('TweakBench: Storage Changed', changes[STORAGE_KEY].newValue);
        updateStyles(changes[STORAGE_KEY].newValue as AppState);
    }
});
