import React, { useState } from 'react';
import { useStore } from '../store.ts';
import { Plus, Trash2, Play, Pause } from 'lucide-react';

interface ThemeListProps {
    onSelectTheme: (id: string) => void;
}

export const ThemeList: React.FC<ThemeListProps> = ({ onSelectTheme }) => {
    const { themes, addTheme, deleteTheme, updateTheme } = useStore();
    const [isCreating, setIsCreating] = useState(false);
    const [newThemeName, setNewThemeName] = useState('');

    const handleCreate = () => {
        if (!newThemeName.trim()) return;
        addTheme({
            name: newThemeName,
            domainPatterns: ['<all_urls>'],
            items: [],
            isActive: true,
        });
        setNewThemeName('');
        setIsCreating(false);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Themes</h2>
                <button
                    onClick={() => setIsCreating(true)}
                    className="p-1 rounded hover:bg-slate-700 text-slate-300"
                    title="Create Theme"
                >
                    <Plus size={20} />
                </button>
            </div>

            {isCreating && (
                <div className="flex gap-2 p-2 bg-slate-800 rounded border border-slate-700">
                    <input
                        type="text"
                        value={newThemeName}
                        onChange={(e) => setNewThemeName(e.target.value)}
                        placeholder="Theme Name..."
                        className="flex-1 bg-transparent outline-none text-sm"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                    <button onClick={handleCreate} className="text-xs bg-blue-600 px-2 rounded">Add</button>
                </div>
            )}

            <div className="flex flex-col gap-2">
                {themes.length === 0 && !isCreating && (
                    <div className="text-center p-4 text-slate-500 text-sm">
                        No themes yet. Create one!
                    </div>
                )}
                {themes.map(theme => (
                    <div key={theme.id} className="p-3 bg-slate-800 rounded border border-slate-700 flex flex-col gap-2 group">
                        <div className="flex justify-between items-center">
                            <span
                                className="font-medium cursor-pointer hover:text-blue-400"
                                onClick={() => onSelectTheme(theme.id)}
                            >
                                {theme.name}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        updateTheme(theme.id, { isActive: !theme.isActive });
                                        console.log('Toggled theme', theme.id, !theme.isActive);
                                    }}
                                    className={`p-1 rounded ${theme.isActive ? 'text-green-400' : 'text-slate-500'}`}
                                    title={theme.isActive ? "Disable" : "Enable"}
                                >
                                    {theme.isActive ? <Pause size={16} /> : <Play size={16} />}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`Are you sure you want to delete theme "${theme.name}"?`)) {
                                            deleteTheme(theme.id);
                                        }
                                    }}
                                    className="p-1 rounded text-slate-500 hover:text-red-400"
                                    title="Delete Theme"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                            {theme.domainPatterns.join(', ')}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
