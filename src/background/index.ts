// Background service worker
import type { AppState } from '../types.ts';

const STORAGE_KEY = 'tweakbench_data';

// Helper: Simple Glob Matching (Duplicated to avoid shared import complexity for now)
function isDomainMatch(patterns: string[], url: string): boolean {
    if (!patterns || patterns.length === 0) return true;
    if (patterns.includes('<all_urls>')) return true;

    // Safety check for invalid urls (e.g. chrome://)
    let hostname = '';
    try {
        hostname = new URL(url).hostname;
    } catch (e) {
        return false;
    }

    return patterns.some(pattern => {
        let p = pattern.trim();

        // CASE 1: Simple Domain Suffix Match
        if (!p.includes('*') && !p.includes('://') && !p.includes('/')) {
            return hostname === p || hostname.endsWith('.' + p);
        }

        // CASE 2: Advanced/Glob Match
        if (!p.includes('://')) {
            p = `*://${p}`;
        }
        if (p.split('://')[1] && !p.split('://')[1].includes('/')) {
            p = `${p}/*`;
        }

        const regexBody = p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        return new RegExp(`^${regexBody}$`).test(url);
    });
}

async function updateBadge(tabId: number, url: string) {
    if (!url) return;

    try {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const data = result[STORAGE_KEY] as AppState;
        if (!data || !data.globalEnabled) {
            chrome.action.setBadgeText({ tabId, text: '' });
            return;
        }

        const activeThemesCount = data.themes.filter(theme => {
            if (!theme.isActive) return false;
            if (theme.domainPatterns && theme.domainPatterns.length > 0) {
                return isDomainMatch(theme.domainPatterns, url);
            }
            return true; // No patterns = Global (unless we changed that logic? logic says default is global)
        }).length;

        if (activeThemesCount > 0) {
            chrome.action.setBadgeText({ tabId, text: activeThemesCount.toString() });
            chrome.action.setBadgeBackgroundColor({ tabId, color: '#22c55e' }); // Green-500
        } else {
            chrome.action.setBadgeText({ tabId, text: '' });
        }
    } catch (e) {
        console.error('Badge update failed', e);
    }
}

// Listeners
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        updateBadge(tabId, tab.url);
    }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
        updateBadge(activeInfo.tabId, tab.url);
    }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[STORAGE_KEY]) {
        // Update current tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id && tabs[0].url) {
                updateBadge(tabs[0].id, tabs[0].url);
            }
        });
    }
});

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => console.error(error));
