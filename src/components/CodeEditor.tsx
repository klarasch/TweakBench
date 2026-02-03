import { useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { EditorView, keymap } from '@codemirror/view';
import * as prettier from "prettier/standalone";
import * as parserPostcss from "prettier/plugins/postcss";
import * as parserHtml from "prettier/plugins/html";

export interface CodeEditorRef {
    focus: () => void;
    format: () => Promise<void>;
}

interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    mode?: 'css' | 'html';
    placeholder?: string;
    className?: string;
    autoHeight?: boolean;
    onFocus?: () => void;
}

export const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(({
    value,
    onChange,
    mode = 'css',
    placeholder,
    className,
    autoHeight = false,
    onFocus
}, ref) => {
    const editorRef = useRef<ReactCodeMirrorRef>(null);

    const handleFormat = useCallback(async () => {
        try {
            const formatted = await prettier.format(value, {
                parser: mode === 'css' ? 'css' : 'html',
                plugins: [parserPostcss, parserHtml],
                tabWidth: 4,
                useTabs: false,
            });
            // remove trailing newline if added and not desired, or keep it.
            // prettier usually adds a newline. CodeMirror might double it?
            // Let's just use it.
            onChange(formatted);
        } catch (e) {
            console.error("Formatting failed:", e);
        }
    }, [value, mode, onChange]);

    useImperativeHandle(ref, () => ({
        focus: () => {
            editorRef.current?.view?.focus();
        },
        format: handleFormat
    }));
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
        }, { dark: true }),
        keymap.of([
            {
                key: "Mod-Shift-f",
                run: () => {
                    handleFormat();
                    return true;
                },
                preventDefault: true
            }
        ])
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
