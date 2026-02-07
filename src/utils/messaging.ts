import type { AppState } from '../types.ts';

export const broadcastStateUpdate = (state: AppState) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
        // Optimization: Only broadcast to the ACTIVE tab for instant feedback.
        // Other tabs will receive the update via chrome.storage.onChanged.
        // This significantly reduces IPC overhead when many tabs are open.
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
