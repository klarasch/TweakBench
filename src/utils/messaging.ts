import type { AppState } from '../types.ts';

export const broadcastStateUpdate = (state: AppState) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
        // Optimization: For the active tab, we send the full state for "instant" feel.
        // Other tabs will catch the update via chrome.storage.onChanged.
        // This avoids background creep (many messages) while keeping the active tab snappy.
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (tab?.id) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'STATE_UPDATED',
                    state
                }).catch(() => {
                    // Ignore errors for tabs that don't have the content script
                });
            }
        });
    }
};
