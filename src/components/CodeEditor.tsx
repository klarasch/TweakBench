import React, { useCallback, useEffect, useRef, useImperativeHandle } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { EditorView, Decoration, ViewPlugin, ViewUpdate } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
// Imports needed for prettier
import * as prettier from "prettier/standalone";
import * as parserPostcss from "prettier/plugins/postcss";
import * as parserHtml from "prettier/plugins/html";

import { autocompletion } from '@codemirror/autocomplete';
import type { Snippet } from '../types';

interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    mode?: 'css' | 'html';
    placeholder?: string;
    className?: string;
    autoHeight?: boolean;
    onFocus?: () => void;
    snippets?: Snippet[];
    searchQuery?: string;
    currentMatch?: { from: number; to: number } | null;
}

// Re-adding CodeEditorRef interface and forwardRef implementation
export interface CodeEditorRef {
    focus: () => void;
    format: () => Promise<void>;
    getCursorPosition: () => { from: number; to: number } | null;
    setCursorPosition: (from: number, to: number) => void;
}

export const CodeEditor = React.forwardRef<CodeEditorRef, CodeEditorProps>((props, ref) => {
    const {
        value,
        onChange,
        mode = 'css',
        placeholder,
        className,
        autoHeight = false,
        onFocus,
    } = props;
    // Re-implemented detailed extensions and imperative handle
    const editorRef = React.useRef<any>(null);



    // ... (in CodeEditor component)

    const handleFormat = useCallback(async () => {
        try {
            const formatted = await prettier.format(value, {
                parser: mode === 'css' ? 'css' : 'html',
                plugins: [parserPostcss, parserHtml],
                tabWidth: 4,
                useTabs: false,
            });
            onChange(formatted);
        } catch (e) {
            console.error("Formatting failed:", e);
        }
    }, [value, mode, onChange]);

    useImperativeHandle(ref, () => ({
        focus: () => {
            editorRef.current?.view?.focus();
        },
        format: handleFormat,
        getCursorPosition: () => {
            const view = editorRef.current?.view;
            if (!view) return null;
            const selection = view.state.selection.main;
            return { from: selection.from, to: selection.to };
        },
        setCursorPosition: (from: number, to: number) => {
            const view = editorRef.current?.view;
            if (!view) return;
            view.dispatch({
                selection: { anchor: from, head: to }
            });
        }
    }));

    // Native brute-force listener to intercept before browser
    const containerRef = useRef<HTMLDivElement>(null);
    const handleFormatRef = useRef(handleFormat);

    // Update ref when handleFormat changes
    useEffect(() => {
        handleFormatRef.current = handleFormat;
    }, [handleFormat]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onKeyDown = (e: KeyboardEvent) => {
            // Priority 1: Cmd+Shift+F / Ctrl+Shift+F (Explicitly Requested)
            const isCmdShiftF = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.code === 'KeyF' || e.key.toLowerCase() === 'f');

            // Priority 2: Opt+Shift+F (Mac) / Alt+Shift+F (Win) - Standard VS Code format & Backup
            const isOptShiftF = e.altKey && e.shiftKey && (e.code === 'KeyF' || e.key.toLowerCase() === 'f');

            // Priority 3: Cmd+S / Ctrl+S - Format on Save (Common User Habit)
            const isSaveShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's';

            if (isCmdShiftF || isOptShiftF || isSaveShortcut) {
                console.log(`Formatting triggered via native capture! (Shortcut: ${isCmdShiftF ? 'Cmd+Shift+F' : isOptShiftF ? 'Opt+Shift+F' : 'Cmd+S'})`);
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation(); // REALLY stop it
                handleFormatRef.current();
            }
        };

        // Capture phase is crucial to run before browser defaults
        container.addEventListener('keydown', onKeyDown, { capture: true });

        return () => {
            container.removeEventListener('keydown', onKeyDown, { capture: true });
        };
    }, []);

    const cssVariableCompletions = useCallback((context: any) => {
        if (mode !== 'css' || !props.snippets) return null;

        const word = context.matchBefore(/--[\w-]*/);
        if (!word) return null;
        if (word.from === word.to && !context.explicit) return null;

        const variables = new Map<string, string>();

        props.snippets.forEach(snippet => {
            if (snippet.type !== 'css') return;
            const regex = /--([-\w]+):\s*([^;]+)/g;
            let match;
            while ((match = regex.exec(snippet.content)) !== null) {
                variables.set(`--${match[1]}`, match[2].trim());
            }
        });

        const options = Array.from(variables.entries()).map(([name, val]) => ({
            label: name,
            type: 'variable',
            detail: val
        }));

        return {
            from: word.from,
            options
        };
    }, [mode, props.snippets]);

    // Search highlighting extension
    const searchHighlightExtension = React.useMemo(() => {
        if (!props.searchQuery || props.searchQuery.trim() === '') {
            return [];
        }

        const searchMark = Decoration.mark({ class: 'cm-search-match' });
        const currentSearchMark = Decoration.mark({ class: 'cm-search-match-current' });

        const decorations = (view: EditorView) => {
            const decorations: any[] = [];
            const query = props.searchQuery!.toLowerCase();
            const text = view.state.doc.toString().toLowerCase();

            let pos = 0;
            while ((pos = text.indexOf(query, pos)) !== -1) {
                const from = pos;
                const to = pos + query.length;

                // Check if this is the current match
                const isCurrentMatch = props.currentMatch &&
                    props.currentMatch.from === from &&
                    props.currentMatch.to === to;

                decorations.push(
                    (isCurrentMatch ? currentSearchMark : searchMark).range(from, to)
                );

                pos = to;
            }

            return Decoration.set(decorations);
        };

        return ViewPlugin.fromClass(class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.decorations = decorations(view);
            }

            update(update: ViewUpdate) {
                this.decorations = decorations(update.view);
            }
        }, {
            decorations: v => v.decorations
        });
    }, [props.searchQuery, props.currentMatch]);

    const extensions = React.useMemo(() => [
        mode === 'css' ? css() : html(),
        EditorView.theme({
            "&": {
                backgroundColor: "#0f172a", /* slate-900 */
                color: "#cbd5e1", /* slate-300 */
                fontSize: "12px",
                height: autoHeight ? "auto" : "100%",
            },
            ".cm-scroller": {
                fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
            },
            ".cm-gutters": {
                backgroundColor: "#020617", /* slate-950 */
                color: "#475569", /* slate-600 */
                border: "none",
                borderRight: "1px solid #1e293b", /* slate-800 */
            },
            "&.cm-focused .cm-cursor": {
                borderLeftColor: "#38bdf8" /* sky-400 */
            },
            ".cm-activeLine": {
                backgroundColor: "#1e293b50" /* slate-800 with opacity */
            },
            ".cm-activeLineGutter": {
                backgroundColor: "#1e293b", /* slate-800 */
                color: "#e2e8f0"
            },
            ".cm-search-match": {
                backgroundColor: "#fbbf2480", /* yellow-400 with opacity */
                borderRadius: "2px"
            },
            ".cm-search-match-current": {
                backgroundColor: "#fb923c", /* orange-400 */
                borderRadius: "2px",
                outline: "1px solid #f97316" /* orange-500 */
            }
        }, { dark: true }),
        autocompletion({ override: [cssVariableCompletions] }), // Add our custom completion
        ...(searchHighlightExtension ? [searchHighlightExtension] : [])
    ], [mode, autoHeight, cssVariableCompletions, searchHighlightExtension]);

    const handleChange = useCallback((val: string) => {
        onChange(val);
    }, [onChange]);

    return (
        <div ref={containerRef} className={`${autoHeight ? 'min-h-[50px]' : 'h-full'} overflow-hidden border border-slate-700 rounded ${className}`}>
            <CodeMirror
                ref={editorRef}
                value={value}
                height={autoHeight ? "auto" : "100%"}
                extensions={extensions}
                onChange={handleChange}
                theme="dark"
                placeholder={placeholder}
                onFocus={onFocus}
                basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    highlightActiveLine: true,
                    autocompletion: true,
                }}
            />
        </div>
    );
});
CodeEditor.displayName = 'CodeEditor';
