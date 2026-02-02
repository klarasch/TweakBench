import React, { useState, useEffect } from 'react';
import { useStore } from '../store.ts';
import { CodeEditor } from './CodeEditor.tsx';
import { ArrowLeft } from 'lucide-react';

interface ThemeDetailProps {
    themeId: string;
    onBack: () => void;
}

export const ThemeDetail: React.FC<ThemeDetailProps> = ({ themeId, onBack }) => {
    const { themes, snippets, updateTheme, updateSnippet } = useStore();
    const theme = themes.find(t => t.id === themeId);

    // Find the first snippet (Main CSS)
    const activeItem = theme?.items[0];
    const snippet = activeItem ? snippets.find(s => s.id === activeItem.snippetId) : null;

    const [localName, setLocalName] = useState('');

    useEffect(() => {
        if (theme) {
            setLocalName(theme.name);
        }
    }, [theme]);

    if (!theme) return <div>Theme not found</div>;

    return (
        <div className="flex flex-col h-full bg-slate-900">
            <div className="flex-none flex items-center gap-2 p-4 border-b border-slate-800 bg-slate-900">
                <button onClick={onBack} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                    <ArrowLeft size={20} />
                </button>
                <input
                    className="bg-transparent font-bold text-lg outline-none w-full text-white placeholder-slate-600"
                    value={localName}
                    onChange={(e) => {
                        setLocalName(e.target.value);
                        updateTheme(themeId, { name: e.target.value });
                    }}
                    placeholder="Theme Name"
                />
            </div>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {snippet ? (
                    <CodeEditor
                        value={snippet.content}
                        onChange={(val) => updateSnippet(snippet.id, { content: val })}
                        className="h-full border-none rounded-none"
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500">
                        <p>No default snippet found. Create a new theme to test Editor.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
