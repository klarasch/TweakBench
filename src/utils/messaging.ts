import type { AppState } from '../types.ts';

export const broadcastStateUpdate = (state: AppState) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'STATE_UPDATED',
                        state
                    }).catch(() => {
                        // Ignore errors for tabs that don't have the content script
                    });
                }
            });
        });
    }
};
