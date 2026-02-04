import React, { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { EditorView } from '@codemirror/view';
// Imports needed for prettier
import * as prettier from "prettier/standalone";
import * as parserPostcss from "prettier/plugins/postcss";
import * as parserHtml from "prettier/plugins/html";

interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    mode?: 'css' | 'html';
    placeholder?: string;
    className?: string;
    autoHeight?: boolean;
    onFocus?: () => void;
}

// Re-adding CodeEditorRef interface and forwardRef implementation
export interface CodeEditorRef {
    focus: () => void;
    format: () => Promise<void>;
}

export const CodeEditor = React.forwardRef<CodeEditorRef, CodeEditorProps>(({
    value,
    onChange,
    mode = 'css',
    placeholder,
    className,
    autoHeight = false,
    onFocus
}, ref) => {
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

    React.useImperativeHandle(ref, () => ({
        focus: () => {
            editorRef.current?.view?.focus();
        },
        format: handleFormat
    }));

    const extensions = [
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
            }
        }, { dark: true }),
        EditorView.domEventHandlers({
            keydown: (event) => {
                if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'f') {
                    event.preventDefault();
                    handleFormat();
                    return true;
                }
                return false;
            }
        })
    ];

    const handleChange = useCallback((val: string) => {
        onChange(val);
    }, [onChange]);

    return (
        <div className={`${autoHeight ? '' : 'h-full'} overflow-hidden border border-slate-700 rounded ${className}`}>
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
