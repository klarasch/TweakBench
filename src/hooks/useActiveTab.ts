import { useState, useEffect } from 'react';

export function useActiveTab() {
    const [activeTabUrl, setActiveTabUrl] = useState<string | null>(null);

    useEffect(() => {
        const checkTab = () => {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]?.url) {
                        setActiveTabUrl(tabs[0].url);
                    } else {
                        setActiveTabUrl(null);
                    }
                });
            } else {
                // Mock for local dev
                setActiveTabUrl('https://example.com');
            }
        };

        // Initial check
        checkTab();

        // Listen for updates (navigation)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleUpdate = (_tabId: number, changeInfo: any, tab: chrome.tabs.Tab) => {
            if (tab.active && changeInfo.url) {
                setActiveTabUrl(changeInfo.url);
            }
        };

        // Listen for activation (switching tabs)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleActivated = (activeInfo: any) => {
            chrome.tabs.get(activeInfo.tabId, (tab) => {
                if (tab.url) setActiveTabUrl(tab.url);
            });
        };

        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.onUpdated.addListener(handleUpdate);
            chrome.tabs.onActivated.addListener(handleActivated);

            return () => {
                chrome.tabs.onUpdated.removeListener(handleUpdate);
                chrome.tabs.onActivated.removeListener(handleActivated);
            };
        }
    }, []);

    return activeTabUrl;
}
