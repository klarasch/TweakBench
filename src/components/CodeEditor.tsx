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
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
    value,
    onChange,
    mode = 'css',
    placeholder,
    className
}) => {
    const extensions = [
        mode === 'css' ? css() : html(),
        EditorView.theme({
            "&": {
                backgroundColor: "#1e293b", /* slate-800 */
                color: "#e2e8f0", /* slate-200 */
                fontSize: "12px",
                height: "100%",
            },
            ".cm-scroller": {
                fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
            },
            ".cm-gutters": {
                backgroundColor: "#0f172a", /* slate-900 */
                color: "#475569", /* slate-600 */
                border: "none",
            },
            "&.cm-focused .cm-cursor": {
                borderLeftColor: "#38bdf8" /* sky-400 */
            },
            ".cm-activeLine": {
                backgroundColor: "#33415550"
            },
            ".cm-activeLineGutter": {
                backgroundColor: "#0f172a",
                color: "#e2e8f0"
            }
        }, { dark: true })
    ];

    const handleChange = useCallback((val: string) => {
        onChange(val);
    }, [onChange]);

    return (
        <div className={`h-full overflow-hidden border border-slate-700 rounded ${className}`}>
            <CodeMirror
                value={value}
                height="100%"
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
