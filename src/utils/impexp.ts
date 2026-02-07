import type { Theme, Snippet, SnippetType } from '../types';

// === EXPORT LOGIC ===

export const exportThemeToJS = (theme: Theme, allSnippets: Snippet[]): string => {
    // 1. Gather relevant snippets
    const itemsWithSnippets = theme.items.map(item => {
        const snippet = allSnippets.find(s => s.id === item.snippetId);
        return { item, snippet };
    }).filter(x => x.snippet !== undefined);

    // 2. Build Metadata Block
    const metadata = `/* ==TweakBench ThemeData==
@name ${theme.name}
@version 1.0
@author User
@match ${theme.domainPatterns.join(',')}
==/TweakBench ThemeData== */`;

    // 3. Build Snippet Blocks
    const snippetBlocks = itemsWithSnippets.map(({ item, snippet }, index) => {
        if (!snippet) return '';

        // Determine content (use override if present)
        const contentToUse = item.overrides?.content ?? snippet.content;
        const selectorToUse = item.overrides?.selector ?? (snippet as any).selector ?? 'body'; // fallback
        const positionToUse = item.overrides?.position ?? (snippet as any).position ?? 'append';

        const snippetMeta = `    // ==TweakBench Snippet==
    // @name ${snippet.name}
    // @type ${snippet.type}
    // @id ${snippet.id}
    ${snippet.type === 'html' ? `// @selector ${selectorToUse}` : ''}
    ${snippet.type === 'html' ? `// @position ${positionToUse}` : ''}
    // @enabled ${item.isEnabled}
    // ==/TweakBench Snippet==`;

        let injectionCode = '';
        if (snippet.type === 'css') {
            injectionCode = `
    const css_${index} = \`${contentToUse.replace(/`/g, '\\`')}\`;
    if (${item.isEnabled}) {
        const style = document.createElement('style');
        style.textContent = css_${index};
        style.id = 'tb-style-${index}';
        document.head.append(style);
    }
`;
        } else {
            injectionCode = `
    const html_${index} = \`${contentToUse.replace(/`/g, '\\`')}\`;
    if (${item.isEnabled}) {
        const target = document.querySelector('${selectorToUse}');
        if (target) {
            const pos = '${positionToUse}';
            if (pos === 'prepend') target.insertAdjacentHTML('afterbegin', html_${index});
            else if (pos === 'append') target.insertAdjacentHTML('beforeend', html_${index});
            else if (pos === 'before') target.insertAdjacentHTML('beforebegin', html_${index});
            else if (pos === 'after') target.insertAdjacentHTML('afterend', html_${index});
        }
    }
`;
        }

        return `${snippetMeta}\n${injectionCode}`;
    }).join('\n');

    // 4. Combine into final JS
    return `${metadata}\n\n(function() {\n    'use strict';\n${snippetBlocks}\n})();`;
};

export const exportThemeToCSS = (theme: Theme, allSnippets: Snippet[]): string => {
    const cssSnippets = theme.items.map(item => {
        const snippet = allSnippets.find(s => s.id === item.snippetId);
        return { item, snippet };
    })
        .filter(x => x.snippet !== undefined && x.snippet.type === 'css' && x.item.isEnabled);

    return cssSnippets.map(({ item, snippet }) => {
        if (!snippet) return ''; // Should be filtered out already
        const content = item.overrides?.content ?? snippet.content;
        return `/* Snippet: ${snippet.name} */\n${content}`;
    }).join('\n\n');
};

// === IMPORT LOGIC ===

export interface ImportedThemeData {
    name: string;
    domainPatterns: string[];
    snippets: Array<{
        name: string;
        type: SnippetType;
        content: string;
        selector?: string;
        position?: string;
        enabled: boolean;
        originalId?: string;
    }>;
}

export const parseThemeFromJS = (jsContent: string): ImportedThemeData | null => {
    // 1. Parse Theme Metadata
    const themeMetaRegex = /\/\* ==TweakBench ThemeData==([\s\S]*?)==\/TweakBench ThemeData== \*\//;
    const themeMatch = jsContent.match(themeMetaRegex);
    if (!themeMatch) return null;

    const themeBlock = themeMatch[1];
    const nameMatch = themeBlock.match(/@name\s+(.+)/);
    const matchMatch = themeBlock.match(/@match\s+(.+)/);

    const name = nameMatch ? nameMatch[1].trim() : 'Imported Theme';
    const domainPatterns = matchMatch ? matchMatch[1].trim().split(',') : ['<all_urls>'];

    // 2. Parse Snippets
    // We'll split by the snippet markers

    // Note: The above regex is a bit complex for a single pass because of the code block.
    // A simpler approach is to find all snippet meta blocks, then extract the variables from the code logic?
    // Actually, since we generated the code, we know the structure.
    // BUT the user might edit it.
    //
    // Alternative robust strategy:
    // The CODE part is just for "standalone" execution. For "Import", we mainly care about the METADATA + Content.
    // However, the CONTENT is stored in the variable `const css_X = ...`. Extracting that reliably with regex is tricky if it contains backticks.

    // Let's iterate block by block.
    const snippets: ImportedThemeData['snippets'] = [];

    let match;
    // Reset lastIndex just in case
    const globalSnippetRegex = /\/\/ ==TweakBench Snippet==([\s\S]*?)\/\/ ==\/TweakBench Snippet==/g;

    while ((match = globalSnippetRegex.exec(jsContent)) !== null) {
        const metaBlock = match[1];
        const sNameMatch = metaBlock.match(/@name\s+(.+)/);
        const sTypeMatch = metaBlock.match(/@type\s+(.+)/);
        const sSelectorMatch = metaBlock.match(/@selector\s+(.+)/);
        const sPositionMatch = metaBlock.match(/@position\s+(.+)/);
        const sEnabledMatch = metaBlock.match(/@enabled\s+(.+)/);
        const sIdMatch = metaBlock.match(/@id\s+(.+)/); // Optional original ID

        const sName = sNameMatch ? sNameMatch[1].trim() : 'Untitled Snippet';
        const sType = (sTypeMatch ? sTypeMatch[1].trim() : 'css') as SnippetType;
        const sSelector = sSelectorMatch ? sSelectorMatch[1].trim() : undefined;
        const sPosition = sPositionMatch ? sPositionMatch[1].trim() : undefined;
        const sEnabled = sEnabledMatch ? sEnabledMatch[1].trim() === 'true' : true;

        // Finding content: Look for the const declaration immediately following the meta block
        // const [type]_[index] = `[CONTENT]`;
        const contentStartIndex = match.index + match[0].length;
        // Search forward until we find a backtick
        const remaining = jsContent.slice(contentStartIndex);
        const backtickStart = remaining.indexOf('`');

        let content = '';
        if (backtickStart !== -1) {
            // Find closing backtick - simplified assumption: no escaped backticks inside? 
            // In our export we did .replace(/`/g, '\\`'), so we can look for unescaped backtick?
            // Or just iterate.
            let i = backtickStart + 1;
            let finalBacktick = -1;
            while (i < remaining.length) {
                if (remaining[i] === '`' && remaining[i - 1] !== '\\') {
                    finalBacktick = i;
                    break;
                }
                i++;
            }

            if (finalBacktick !== -1) {
                const rawContent = remaining.slice(backtickStart + 1, finalBacktick);
                // Unescape backticks (replace \` with `)
                content = rawContent.replace(/\\`/g, '`');
            }
        }

        snippets.push({
            name: sName,
            type: sType,
            content,
            selector: sSelector,
            position: sPosition,
            enabled: sEnabled,
            originalId: sIdMatch ? sIdMatch[1].trim() : undefined
        });
    }

    return {
        name,
        domainPatterns,
        snippets
    };
};

// === EXPORT/IMPORT ALL DATA ===

export interface ExportedData {
    version: string;
    exportedAt: number;
    data: {
        themes: Theme[];
        snippets: Snippet[];
        globalEnabled: boolean;
        activeThemeId: string | null;
    };
}

export const exportAllData = (themes: Theme[], snippets: Snippet[], globalEnabled: boolean, activeThemeId: string | null): string => {
    const exportData: ExportedData = {
        version: '1.0',
        exportedAt: Date.now(),
        data: {
            themes,
            snippets,
            globalEnabled,
            activeThemeId
        }
    };
    return JSON.stringify(exportData, null, 2);
};

export const importAllData = (jsonContent: string): ExportedData['data'] | null => {
    try {
        const parsed = JSON.parse(jsonContent) as ExportedData;

        // Detect if it's a full backup or a group export
        const isGroupExport = (parsed as any).type === 'group';
        const data = isGroupExport ? (parsed as any).data : (parsed as any).data || parsed;

        // Validate structure
        if (!data.themes || !Array.isArray(data.themes)) {
            return null;
        }

        // Basic validation of required fields
        const hasValidThemes = data.themes.every((t: any) =>
            t.id && t.name && Array.isArray(t.domainPatterns) && Array.isArray(t.items)
        );

        if (!hasValidThemes) return null;

        // If it's a full backup, it should have snippets too
        if (data.snippets && !Array.isArray(data.snippets)) return null;

        return {
            themes: data.themes,
            snippets: data.snippets || [],
            globalEnabled: data.globalEnabled ?? true,
            activeThemeId: data.activeThemeId ?? null
        };
    } catch (e) {
        console.error('Failed to parse import data:', e);
        return null;
    }
};

export const exportGroupToJSON = (groupId: string, allThemes: Theme[], allSnippets: Snippet[]): string => {
    const groupThemes = allThemes.filter(t => t.groupId === groupId);
    const snippetIds = new Set<string>();
    groupThemes.forEach(t => t.items.forEach(item => snippetIds.add(item.snippetId)));
    const groupSnippets = allSnippets.filter(s => snippetIds.has(s.id));

    const exportData = {
        version: '1.0',
        type: 'group',
        exportedAt: Date.now(),
        data: {
            themes: groupThemes,
            snippets: groupSnippets,
            groupId // Include to preserve group identity if possible
        }
    };
    return JSON.stringify(exportData, null, 2);
};
