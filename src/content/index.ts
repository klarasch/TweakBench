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

// Helper: Simple Glob Matching
// Helper: Simple Glob Matching
// Helper: Simple Glob Matching
function isDomainMatch(patterns: string[], url: string): boolean {
    if (!patterns || patterns.length === 0) return false; // Empty list = Run Nowhere
    if (patterns.includes('<all_urls>')) return true;

    const u = new URL(url);
    const hostname = u.hostname;

    return patterns.some(pattern => {
        let p = pattern.trim();

        // CASE 1: Simple Domain Suffix Match (e.g. "google.com")
        // No wildcards, no scheme, no path. Handles "google.com" -> "www.google.com" and "google.com"
        if (!p.includes('*') && !p.includes('://') && !p.includes('/')) {
            return hostname === p || hostname.endsWith('.' + p);
        }

        // CASE 2: Advanced/Glob Match
        // Auto-handle missing scheme
        if (!p.includes('://')) {
            p = `*://${p}`;
        }
        // Auto-handle missing path
        if (p.split('://')[1] && !p.split('://')[1].includes('/')) {
            {/* Logic: if no slash after scheme, assume /* */ }
            p = `${p}/*`;
        }

        // Escape regex characters except *
        // Improvement: *.domain.com should match domain.com? Use (?:.*\.)? for *.
        // Ideally we'd replace `*.` with `(?:.*\.)?` and `*` with `.*`
        // But let's stick to standard Glob `*` = `.*` logic for predictability if they use wildcards.

        const regexBody = p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        return new RegExp(`^${regexBody}$`).test(url);
    });
}

function updateStyles(state: AppState) {
    console.log('TweakBench: Updating Styles/HTML', state);
    const activeSnippetIds = new Set<string>();

    // Defensive checks
    const themes = state.themes || [];
    const snippets = state.snippets || [];
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
    // Store content hash/string to avoid re-renders if identical?
    // Actually, we are replacing the element, so we can't easily compare existing.
    // We could check if existing el matches?

    // Check if we need to replace existing
    // If existing exists, we just replace it.
    // Optimization: If content is same, do nothing?
    // Hard to check because `el.innerHTML` might not match `snippet.content` if we unwrapped.
    // `el.outerHTML` tracking is better.
    // Let's simplified approach: Always replace if it exists (reactivity).

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
        updateStyles(data);
    }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[STORAGE_KEY]) {
        console.log('TweakBench: Storage Changed', changes[STORAGE_KEY].newValue);
        updateStyles(changes[STORAGE_KEY].newValue as AppState);
    }
});
