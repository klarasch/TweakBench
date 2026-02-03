import React, { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { EditorView } from '@codemirror/view';

interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    mode?: 'css' | 'html';
    placeholder?: string;
    className?: string;
    autoHeight?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
    value,
    onChange,
    mode = 'css',
    placeholder,
    className,
    autoHeight = false
}) => {
    const extensions = [
        mode === 'css' ? css() : html(),
        EditorView.theme({
            "&": {
                backgroundColor: "#0f172a", /* slate-900 (matches app bg) */
                color: "#cbd5e1", /* slate-300 */
                fontSize: "12px",
                height: autoHeight ? "auto" : "100%",
            },
            ".cm-scroller": {
                fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
            },
            ".cm-gutters": {
                backgroundColor: "#020617", /* slate-950 (slightly darker than bg) */
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
        }, { dark: true })
    ];

    const handleChange = useCallback((val: string) => {
        onChange(val);
    }, [onChange]);

    return (
        <div className={`${autoHeight ? '' : 'h-full'} overflow-hidden border border-slate-700 rounded ${className}`}>
            <CodeMirror
                value={value}
                height={autoHeight ? "auto" : "100%"}
                extensions={extensions}
                onChange={handleChange}
                theme="dark"
                placeholder={placeholder}
                basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    highlightActiveLine: true,
                    autocompletion: true,
                }}
            />
        </div>
    );
};
