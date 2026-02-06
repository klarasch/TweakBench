import type { AppState } from '../types.ts';

const STORAGE_KEY = 'tweakbench_data';

const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
let saveTimeout: any = null;

export const storageService = {
    async save(data: Partial<AppState>, options?: { immediate?: boolean }): Promise<void> {
        return new Promise((resolve, reject) => {
            if (saveTimeout) {
                clearTimeout(saveTimeout);
                saveTimeout = null;
            }

            const performSave = async () => {
                try {
                    if (isExtension) {
                        await chrome.storage.local.set({ [STORAGE_KEY]: data });
                    } else {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                    }
                    resolve();
                } catch (e) {
                    console.error('Storage Save Failed:', e);
                    reject(e);
                }
            };

            if (options?.immediate) {
                performSave();
            } else {
                saveTimeout = setTimeout(performSave, 300); // Reduced debounce to 300ms
            }
        });
    },

    async load(): Promise<Partial<AppState>> {
        if (isExtension) {
            const result = await chrome.storage.local.get(STORAGE_KEY);
            return result[STORAGE_KEY] || {};
        } else {
            const item = localStorage.getItem(STORAGE_KEY);
            return item ? JSON.parse(item) : {};
        }
    },

    async clear(): Promise<void> {
        if (isExtension) {
            await chrome.storage.local.remove(STORAGE_KEY);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }
};
