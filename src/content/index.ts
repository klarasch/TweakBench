console.log('TweakBench: Content Script Loaded');

import type { AppState } from '../types.ts';

const STORAGE_KEY = 'tweakbench_data';
const injectedStyles = new Map<string, HTMLStyleElement>();

// Ping Listener for Panel
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.type === 'PING') {
        console.log('TweakBench: PING received');
        sendResponse('PONG');
    }
});

function updateStyles(state: AppState) {
    console.log('TweakBench: Updating Styles', state);
    const activeSnippetIds = new Set<string>();

    // Defensive checks
    const themes = state.themes || [];
    const snippets = state.snippets || [];

    themes.forEach(theme => {
        if (!theme.isActive) return;

        theme.items.forEach(item => {
            if (!item.isEnabled) return;

            const snippet = snippets.find(s => s.id === item.snippetId);
            if (snippet && snippet.type === 'css') {
                activeSnippetIds.add(snippet.id);
                // console.log('TweakBench: Injecting snippet', snippet.id);
                injectOrUpdateStyle(snippet.id, snippet.content);
            }
        });
    });

    for (const [id, styleEl] of injectedStyles.entries()) {
        if (!activeSnippetIds.has(id)) {
            console.log('TweakBench: Removing snippet', id);
            styleEl.remove();
            injectedStyles.delete(id);
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
