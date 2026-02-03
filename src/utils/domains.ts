export function isDomainMatch(patterns: string[], url: string): boolean {
    if (!patterns || patterns.length === 0) return false; // Empty list = Run Nowhere
    if (patterns.includes('<all_urls>')) return true;

    try {
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
                // Logic: if no slash after scheme, assume /*
                p = `${p}/*`;
            }

            // Escape regex characters except *
            const regexBody = p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
            return new RegExp(`^${regexBody}$`).test(url);
        });
    } catch (e) {
        // Invalid URL
        return false;
    }
}
