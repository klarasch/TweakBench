import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store.ts';
import { CodeEditor } from './CodeEditor.tsx';
import { SnippetLibrary } from './SnippetLibrary.tsx';
import { ContextMenu, type ContextMenuItem } from './ContextMenu.tsx';
import { ArrowLeft, Trash2, BookOpen, Plus, Globe, MoreVertical, Box, Play, Pause, Download, X, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { Reorder } from "framer-motion";
import type { SnippetType } from '../types.ts';
import { exportThemeToJS, exportThemeToCSS } from '../utils/impexp.ts';

interface ThemeDetailProps {
    themeId: string;
    onBack: () => void;
}

export const ThemeDetail: React.FC<ThemeDetailProps> = ({ themeId, onBack }) => {
    const { themes, snippets, updateTheme, updateSnippet, addSnippet, addSnippetToTheme, toggleThemeItem, updateThemeItem, globalEnabled, toggleGlobal } = useStore();
    const theme = themes.find(t => t.id === themeId);



    // State
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [showLibrary, setShowLibrary] = useState(false);
    const [libraryFilter, setLibraryFilter] = useState<'css' | 'html' | null>(null);
    const [localName, setLocalName] = useState('');
    const [activeTab, setActiveTab] = useState<'css' | 'html'>('css'); // Added activeTab state
    const [newDomain, setNewDomain] = useState('');

    const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());
    const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const sidebarItemRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Responsive & Popover State
    const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
    const [showDomainSettings, setShowDomainSettings] = useState(false);

    useEffect(() => {
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Resize State
    const [sidebarWidth, setSidebarWidth] = useState(300);
    const [isResizing, setIsResizing] = useState(false);


    // Context Menu State
    const [menuState, setMenuState] = useState<{ x: number; y: number; itemId: string | null }>({ x: 0, y: 0, itemId: null });

    const activeItem = theme?.items.find(i => i.id === selectedItemId);
    const activeSnippet = activeItem ? snippets.find(s => s.id === activeItem.snippetId) : null;

    useEffect(() => {
        if (theme) {
            setLocalName(theme.name);
            // Select first item by default if nothing selected
            if (!selectedItemId && theme.items.length > 0) {
                // Determine first visible item in active tab
                const firstVisible = theme.items.find(item => {
                    const s = snippets.find(sn => sn.id === item.snippetId);
                    return s?.type === activeTab;
                });
                if (firstVisible) setSelectedItemId(firstVisible.id);
            }
        }
    }, [theme, selectedItemId, activeTab]);

    // Scroll into view when selectedItemId changes
    useEffect(() => {
        if (selectedItemId && itemRefs.current[selectedItemId]) {
            itemRefs.current[selectedItemId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [selectedItemId]);

    // Resize Handler
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            // Limit width between 200px and 600px
            const newWidth = Math.max(200, Math.min(e.clientX, 600));
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Handle Esc key to delete empty/new local snippets
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && activeSnippet && activeSnippet.isLibraryItem === false) {
                const defaultCSS = '/* CSS */\n';
                const defaultHTML = '<!-- HTML -->\n';
                const isDefault = activeSnippet.type === 'css'
                    ? activeSnippet.content === defaultCSS
                    : activeSnippet.content === defaultHTML;

                if (isDefault && activeItem) {
                    // Delete snippet and remove from theme
                    // Since it's local, deleting the snippet handles cleanup usually? 
                    // Or we should double check store logic. 
                    // But safesty: remove from theme then delete snippet.
                    useStore.getState().removeSnippetFromTheme(themeId, activeItem.id);
                    useStore.getState().deleteSnippet(activeSnippet.id);
                    setSelectedItemId(null);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeSnippet, activeItem, themeId]);

    if (!theme) return <div>Theme not found</div>;

    const scrollToItem = (itemId: string) => {
        // Need to wait for render
        setTimeout(() => {
            const el = itemRefs.current[itemId];
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            const sideEl = sidebarItemRefs.current[itemId];
            if (sideEl) {
                sideEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    };



    const handleAddDomain = () => {
        if (!newDomain.trim()) return;
        const current = theme.domainPatterns || ['<all_urls>'];
        // If adding first specific domain, maybe remove <all_urls>? 
        // Logic: if <all_urls> is present, it overrides everything.
        // User workflow: Add "google.com" -> Remove "<all_urls>".
        // Let's just append for now and let user remove <all_urls>.
        const updated = [...current, newDomain.trim()];
        updateTheme(themeId, { domainPatterns: updated });
        setNewDomain('');
    };

    const handleRemoveDomain = (pattern: string) => {
        const current = theme.domainPatterns || ['<all_urls>'];
        const updated = current.filter(p => p !== pattern);
        updateTheme(themeId, { domainPatterns: updated.length === 0 ? [] : updated });
    };

    const handleAddSnippet = (snippetId: string) => {
        const snippet = snippets.find(s => s.id === snippetId);
        if (snippet) {
            setActiveTab(snippet.type);
        }

        const itemId = addSnippetToTheme(themeId, snippetId);
        setShowLibrary(false);
        setLibraryFilter(null);
        setSelectedItemId(itemId);
        scrollToItem(itemId);
    };

    const filteredItems = theme ? theme.items.filter(item => {
        const s = snippets.find(sn => sn.id === item.snippetId);
        return s?.type === activeTab;
    }) : [];

    const handleReorder = (newFilteredItems: typeof theme.items) => {
        if (!theme) return;
        // Get items NOT in the current tab
        const otherItems = theme.items.filter(item => {
            const s = snippets.find(sn => sn.id === item.snippetId);
            return s?.type !== activeTab;
        });
        // Concatenate: New Order for Current Tab + Other Items
        // This effectively groups items by type in the storage, which is fine.
        useStore.getState().reorderThemeItems(theme.id, [...newFilteredItems, ...otherItems]);
    };

    const handleCreateLocal = (type: SnippetType) => {
        setActiveTab(type); // Switch to content type tab
        const id = addSnippet({
            name: type === 'css' ? 'Local CSS' : 'Local HTML',
            type,
            content: type === 'css' ? '/* CSS */\n' : '<!-- HTML -->\n',
            relatedSnippetIds: [],
            isLibraryItem: false
        });
        const itemId = addSnippetToTheme(themeId, id);

        // Auto-select and scroll
        setSelectedItemId(itemId);
        scrollToItem(itemId);
    };

    const handleContextMenu = (e: React.MouseEvent, itemId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuState({ x: e.pageX, y: e.pageY, itemId });
    };

    const handleKebabClick = (e: React.MouseEvent, itemId: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuState({ x: rect.left, y: rect.bottom, itemId });
    };

    const handleExport = (type: 'js' | 'css') => {
        if (!theme) return;

        let content = '';
        let extension = '';

        if (type === 'js') {
            content = exportThemeToJS(theme, snippets);
            extension = 'tb.js';
        } else {
            content = exportThemeToCSS(theme, snippets);
            extension = 'css';
        }

        const blob = new Blob([content], { type: type === 'js' ? 'text/javascript' : 'text/css' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${theme.name.replace(/\s+/g, '_')}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getMenuItems = (itemId: string): ContextMenuItem[] => {
        if (itemId === 'THEME_HEADER_MENU') {
            return [
                {
                    label: theme.isActive ? 'Disable Theme' : 'Enable Theme',
                    icon: theme.isActive ? <Pause size={14} /> : <Play size={14} />,
                    onClick: () => updateTheme(themeId, { isActive: !theme.isActive })
                },
                { separator: true },
                {
                    label: 'Export to JS',
                    icon: <Download size={14} />,
                    onClick: () => handleExport('js')
                },
                {
                    label: 'Export to CSS (Only)',
                    icon: <Download size={14} />,
                    onClick: () => handleExport('css')
                },
                { separator: true },
                {
                    label: 'Delete Theme',
                    icon: <Trash2 size={14} />,
                    danger: true,
                    onClick: () => {
                        if (confirm(`Are you sure you want to delete theme "${theme.name}"?`)) {
                            const { deleteTheme } = useStore.getState();
                            deleteTheme(themeId);
                            onBack(); // Navigate back after deletion
                        }
                    }
                }
            ];
        }

        const item = theme.items.find(i => i.id === itemId);
        if (!item) return [];

        return [
            {
                label: item.isEnabled ? 'Disable Snippet' : 'Enable Snippet',
                onClick: () => toggleThemeItem(theme.id, itemId)
            },
            { separator: true },
            {
                label: 'Remove from Theme',
                icon: <Trash2 size={14} />,
                danger: true,
                onClick: () => {
                    if (confirm('Remove snippet from theme?')) {
                        useStore.getState().removeSnippetFromTheme(theme.id, itemId);
                        if (selectedItemId === itemId) setSelectedItemId(null);
                    }
                }
            }
        ];
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 relative">
            {/* Header */}
            {/* ... (Existing Header Helper) ... */}
            <div className="flex-none flex items-center gap-2 p-4 border-b border-slate-800 bg-slate-900 z-10">
                <button onClick={onBack} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <input
                        className="bg-transparent font-bold text-lg outline-none w-full text-white placeholder-slate-600"
                        value={localName}
                        onChange={(e) => {
                            setLocalName(e.target.value);
                            updateTheme(themeId, { name: e.target.value });
                        }}
                        placeholder="Theme Name"
                    />
                    <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider bg-slate-800/50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-800 hover:text-slate-300 transition-colors" onClick={() => setShowDomainSettings(true)}>
                            <Globe size={10} />
                            {theme.domainPatterns && theme.domainPatterns.includes('<all_urls>')
                                ? "Runs Everywhere"
                                : theme.domainPatterns && theme.domainPatterns.length > 0
                                    ? `${theme.domainPatterns.length} Domain${theme.domainPatterns.length > 1 ? 's' : ''}`
                                    : "No Configured Domains"
                            }
                        </div>
                    </div>
                </div>
                {/* Theme Toggle & Menu */}
                <div className="flex items-center gap-2">
                    {/* Global Disabled Warning */}
                    {!globalEnabled && (
                        <span
                            className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mr-2 cursor-pointer hover:underline hover:text-amber-400"
                            onClick={() => {
                                if (confirm("Re-enable the entire plugin?")) {
                                    toggleGlobal();
                                }
                            }}
                            title="Click to re-enable plugin"
                        >
                            All Themes Disabled
                        </span>
                    )}

                    {!globalEnabled ? (
                        <button
                            disabled
                            className="p-1 rounded flex items-center gap-1.5 px-2 transition-colors bg-slate-800/50 text-slate-600 cursor-not-allowed opacity-50"
                            title="System Disabled"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                            <span className="text-[10px] font-bold uppercase">OFF</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => updateTheme(themeId, { isActive: !theme.isActive })}
                            className={`p-1 rounded flex items-center gap-1.5 px-2 transition-colors ${theme.isActive ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 shadow-[0_0_0_1px_rgba(74,222,128,0.2)]' : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700 hover:text-slate-300'}`}
                            title={theme.isActive ? "Disable Theme" : "Enable Theme"}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${theme.isActive ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`}></div>
                            <span className="text-[10px] font-bold uppercase">{theme.isActive ? 'ON' : 'OFF'}</span>
                        </button>
                    )}
                    <button
                        className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-slate-800"
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuState({ x: e.currentTarget.getBoundingClientRect().left, y: e.currentTarget.getBoundingClientRect().bottom, itemId: 'THEME_HEADER_MENU' });
                        }}
                        title="Theme Options"
                    >
                        <MoreVertical size={18} />
                    </button>
                    <div className="w-px h-6 bg-slate-800 mx-1"></div>
                    <button
                        onClick={() => { setShowLibrary(!showLibrary); setLibraryFilter(null); }}
                        className={`p-1.5 rounded flex items-center gap-1.5 px-3 transition-colors ${showLibrary && !libraryFilter ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        title="Snippet Library"
                    >
                        <BookOpen size={16} />
                        <span className="text-xs font-bold uppercase">Library</span>
                    </button>
                </div>
            </div>

            {/* Mega Menu Library Drawer */}
            {/* Position: If generic (header), top after header. If filtered (tab), top after tabs. */}
            {showLibrary && (
                <div
                    className={`absolute left-0 right-0 h-[50vh] bg-slate-900/95 backdrop-blur-xl border-b border-slate-700 shadow-2xl z-40 flex flex-col transition-all animate-in slide-in-from-top-4 duration-200`}
                    style={{ top: libraryFilter ? '98px' : '61px' }}
                >
                    <div className="flex justify-between items-center p-2 border-b border-slate-800 bg-slate-900">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">
                            {libraryFilter ? `Select ${libraryFilter.toUpperCase()} Snippet` : 'Snippet Library'}
                        </span>
                        <button onClick={() => setShowLibrary(false)} className="p-1 hover:bg-slate-800 rounded"><X size={14} /></button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <SnippetLibrary
                            onSelectSnippet={handleAddSnippet}
                            filterType={libraryFilter}
                        />
                    </div>
                </div>
            )}

            {/* Tab Bar (New) */}
            <div className="flex border-b border-slate-800 bg-slate-900">
                <button
                    onClick={() => setActiveTab('css')}
                    className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors relative ${activeTab === 'css' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    CSS
                    {activeTab === 'css' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>}
                </button>
                <div className="w-px bg-slate-800 my-2"></div>
                <button
                    onClick={() => setActiveTab('html')}
                    className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors relative ${activeTab === 'html' ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    HTML
                    {activeTab === 'html' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"></div>}
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden relative">


                {/* Sidebar */}
                <div className="flex-1 flex overflow-hidden relative">
                    {/* Sidebar - Only show if viewportWidth > 720 */}
                    {viewportWidth > 720 && (
                        <div
                            className="flex flex-col bg-slate-900 z-20 shrink-0 relative border-r border-slate-800"
                            style={{ width: sidebarWidth }}
                        >
                            {/* Resize Handle */}
                            <div
                                className="absolute top-0 bottom-0 -right-1 w-2 cursor-col-resize z-30 hover:bg-blue-500/50 transition-colors group"
                                onMouseDown={() => setIsResizing(true)}
                            >
                                <div className="w-px h-full bg-slate-800 group-hover:bg-blue-500 mx-auto"></div>
                            </div>
                            {/* Toolbar */}
                            {/* Toolbar Removed - Quick Add now in Subheader */}

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {/* Snippet List (Structure View) */}
                                <div className="space-y-2">
                                    {/* Only show structure for active tab */}
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Structure ({activeTab})</div>
                                    <Reorder.Group axis="y" values={filteredItems} onReorder={handleReorder}>

                                        <div className="space-y-2">
                                            {filteredItems.map(item => {
                                                const s = snippets.find(sn => sn.id === item.snippetId);
                                                if (!s) return null;
                                                return (
                                                    <Reorder.Item
                                                        key={item.id}
                                                        value={item}
                                                        className={`mb-1 bg-slate-900 border-l-2 rounded cursor-default group relative flex items-center ${selectedItemId === item.id ? 'border-blue-500 bg-slate-800' : 'border-transparent hover:bg-slate-800'} ${!item.isEnabled ? 'opacity-50 grayscale-[0.5]' : ''}`}
                                                        onClick={() => setSelectedItemId(item.id)}
                                                        onContextMenu={(e) => handleContextMenu(e, item.id)}
                                                    >
                                                        {/* Render Logic Ref Wrapper because Reorder.Item might not accept ref or interfere */}
                                                        <div ref={el => { sidebarItemRefs.current[item.id] = el; }} className="contents">
                                                            {/* Drag Handle */}
                                                            <div className="pl-2 text-slate-600 cursor-grab active:cursor-grabbing hover:text-slate-400">
                                                                <GripVertical size={14} />
                                                            </div>

                                                            <div className="flex-1 min-w-0 p-2 pl-2">
                                                                <div className="flex justify-between items-center mb-0.5">
                                                                    <span className={`text-sm font-medium truncate ${selectedItemId === item.id ? 'text-white' : 'text-slate-400'}`}>
                                                                        {s.name}
                                                                    </span>
                                                                    <div className="flex items-center gap-1">
                                                                        {!item.isEnabled && (
                                                                            <span className="text-[10px] bg-red-900/50 text-red-400 px-1 rounded uppercase">Disabled</span>
                                                                        )}
                                                                        {s.isLibraryItem !== false && (
                                                                            <div className="relative flex items-center justify-center">
                                                                                <span className="text-blue-400" title="Library Snippet">
                                                                                    <BookOpen size={12} />
                                                                                </span>
                                                                                {item.overrides?.content !== undefined && (
                                                                                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-500 rounded-full border border-slate-900" title="Has Overrides" />
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="absolute right-2 flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800/80 backdrop-blur pl-2 rounded">
                                                                <label
                                                                    className="relative inline-flex items-center cursor-pointer"
                                                                    title={!theme.isActive ? "Enable theme to toggle snippets" : "Toggle Snippet"}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        className={`sr-only peer ${!theme.isActive ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                                        checked={item.isEnabled}
                                                                        disabled={!theme.isActive}
                                                                        onChange={() => {
                                                                            toggleThemeItem(theme.id, item.id);
                                                                        }}
                                                                    />
                                                                    <div className={`w-7 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all ${theme.isActive ? 'peer-checked:bg-green-500 cursor-pointer' : 'peer-checked:bg-slate-600 opacity-50 cursor-not-allowed'}`}></div>
                                                                </label>
                                                                <button
                                                                    className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-700"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm('Remove snippet from theme?')) {
                                                                            useStore.getState().removeSnippetFromTheme(theme.id, item.id);
                                                                            if (selectedItemId === item.id) setSelectedItemId(null);
                                                                        }
                                                                    }}
                                                                    title="Remove Snippet"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                                <button
                                                                    className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-700"
                                                                    onClick={(e) => handleKebabClick(e, item.id)}
                                                                    title="More options"
                                                                >
                                                                    <MoreVertical size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </Reorder.Item>
                                                );
                                            })}
                                            {filteredItems.length === 0 && (
                                                <div className="p-4 text-center text-xs text-slate-500">
                                                    No {activeTab.toUpperCase()} snippets.
                                                </div>
                                            )}
                                        </div>
                                    </Reorder.Group>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Context Menu Render */}
                    {menuState.itemId && (
                        <ContextMenu
                            x={menuState.x}
                            y={menuState.y}
                            items={getMenuItems(menuState.itemId)}
                            onClose={() => setMenuState({ ...menuState, itemId: null })}
                        />
                    )}

                    {/* Main: Editor */}
                    <div className="flex-1 flex flex-col bg-slate-900 relative overflow-y-auto">
                        {/* Library Popover with Backdrop */}
                        {showLibrary && (
                            <>
                                {/* Backdrop to close on click outside */}
                                <div
                                    className="absolute inset-0 z-20 bg-slate-900/50 backdrop-blur-[1px]"
                                    onClick={() => setShowLibrary(false)}
                                />
                                {/* Popover content */}
                                <div className="absolute top-0 bottom-0 left-0 w-[300px] z-30 bg-slate-900 border-r border-slate-800 shadow-xl flex flex-col">
                                    <SnippetLibrary
                                        onSelectSnippet={handleAddSnippet}
                                        onClose={() => setShowLibrary(false)}
                                    />
                                </div>
                            </>
                        )}

                        {/* Main: Editor */}
                        <div className="flex-1 flex flex-col bg-slate-900 relative overflow-y-auto">
                            {/* Domain Settings Popover */}
                            {showDomainSettings && (
                                <>
                                    <div className="absolute inset-0 z-20 bg-slate-900/50 backdrop-blur-[1px]" onClick={() => setShowDomainSettings(false)} />
                                    <div className="absolute top-14 left-4 z-30 w-[300px] bg-slate-900 border border-slate-700 shadow-xl rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Run on Domains</h3>
                                            <button onClick={() => setShowDomainSettings(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
                                        </div>
                                        {/* Run Everywhere Toggle */}
                                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-800 flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <Globe size={16} className="text-slate-400" />
                                                <span className="text-sm font-medium text-slate-200">All Websites</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const currentPatterns = theme.domainPatterns || [];
                                                    const isAll = currentPatterns.includes('<all_urls>');
                                                    if (isAll) updateTheme(themeId, { domainPatterns: currentPatterns.filter(p => p !== '<all_urls>') });
                                                    else updateTheme(themeId, { domainPatterns: [...currentPatterns, '<all_urls>'] });
                                                }}
                                                className={`w-10 h-5 rounded-full relative transition-colors ${theme.domainPatterns?.includes('<all_urls>') ? 'bg-green-500' : 'bg-slate-600'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${theme.domainPatterns?.includes('<all_urls>') ? 'left-6' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                        {/* Remainder of Domain Logic... condensed for brevity if possible or full? I'll implement full simple version */}
                                        {theme.domainPatterns?.includes('<all_urls>') ? (
                                            <div className="text-xs text-slate-500 text-center py-4 border border-dashed border-slate-800 rounded">Theme runs everywhere.</div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex gap-2">
                                                    <input className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white" value={newDomain} onChange={e => setNewDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddDomain()} placeholder="google.com" />
                                                    <button onClick={handleAddDomain} disabled={!newDomain.trim()} className="p-1 bg-slate-800 rounded border border-slate-700"><Plus size={14} /></button>
                                                </div>
                                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                                    {theme.domainPatterns?.map((p, i) => (
                                                        <div key={i} className="flex justify-between p-2 bg-slate-800/30 rounded text-xs text-slate-300">
                                                            <span>{p}</span>
                                                            <button onClick={() => handleRemoveDomain(p)} className="hover:text-red-400"><X size={12} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Sticky Subheader - Refreshed */}
                            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-2 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCollapsedItems(new Set())}
                                        className="px-2 py-1 text-[10px] bg-slate-800 text-slate-400 rounded hover:text-white"
                                    >
                                        Expand All
                                    </button>
                                    <button
                                        onClick={() => setCollapsedItems(new Set(filteredItems.map(i => i.id)))}
                                        className="px-2 py-1 text-[10px] bg-slate-800 text-slate-400 rounded hover:text-white"
                                    >
                                        Collapse All
                                    </button>
                                </div>

                                <button
                                    onClick={() => handleCreateLocal(activeTab)}
                                    className={`px-2 py-1 text-[10px] bg-slate-800 border border-slate-700 rounded flex items-center gap-1 hover:border-slate-500 hover:text-white transition-colors ${activeTab === 'css' ? 'text-blue-400' : 'text-orange-400'}`}
                                >
                                    <Plus size={10} />
                                    <span>Add {activeTab.toUpperCase()}</span>
                                </button>

                            </div>

                            {filteredItems.map(item => {
                                const s = snippets.find(sn => sn.id === item.snippetId);
                                if (!s) return null;
                                const isCollapsed = collapsedItems.has(item.id);

                                return (
                                    <div
                                        key={item.id}
                                        ref={el => { itemRefs.current[item.id] = el; }}
                                        className={`border transition-all ${selectedItemId === item.id ? 'border-blue-500/50 shadow-lg shadow-blue-500/5' : 'border-slate-800 bg-slate-900'}`}
                                    >
                                        {/* Snippet Header */}
                                        <div
                                            className={`flex items-center gap-2 p-3 cursor-pointer select-none ${isCollapsed ? 'bg-slate-800/20' : 'bg-slate-950/50 border-b border-slate-800'}`}
                                            onClick={() => {
                                                const next = new Set(collapsedItems);
                                                if (next.has(item.id)) next.delete(item.id);
                                                else next.add(item.id);
                                                setCollapsedItems(next);
                                            }}
                                        >
                                            <button className="text-slate-500 hover:text-white transition-colors">
                                                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-medium text-sm truncate ${!item.isEnabled ? 'text-slate-500 line-through decoration-slate-600' : 'text-slate-200'}`}>
                                                        {s.name}
                                                    </span>
                                                    {item.overrides?.content !== undefined && (
                                                        <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Modified</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Publish / Reset Controls */}
                                            {!isCollapsed && (
                                                <div className="flex items-center gap-2 mr-2">
                                                    {s.isLibraryItem === false ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newName = prompt('Enter name for Library:', s.name);
                                                                if (newName) updateSnippet(s.id, { name: newName, isLibraryItem: true });
                                                            }}
                                                            className="text-purple-400 hover:text-purple-300 text-xs px-2 py-1 rounded border border-purple-900/50 hover:bg-purple-900/20"
                                                        >
                                                            Publish
                                                        </button>
                                                    ) : (
                                                        item.overrides?.content !== undefined && (
                                                            <>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm('Revert to Master Snippet? Local changes will be lost.')) {
                                                                            const { content, ...rest } = item.overrides || {};
                                                                            updateThemeItem(themeId, item.id, { overrides: rest.selector || rest.position ? rest : undefined });
                                                                        }
                                                                    }}
                                                                    className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800"
                                                                >
                                                                    Reset
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm('Publish changes to Master Snippet?')) {
                                                                            const newContent = item.overrides?.content;
                                                                            if (newContent) {
                                                                                updateSnippet(s.id, { content: newContent });
                                                                                const { content, ...rest } = item.overrides || {};
                                                                                updateThemeItem(themeId, item.id, { overrides: rest.selector || rest.position ? rest : undefined });
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 rounded border border-blue-900/50 hover:bg-blue-900/20"
                                                                >
                                                                    Publish Changes
                                                                </button>
                                                            </>
                                                        )
                                                    )}
                                                </div>
                                            )}

                                            <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={item.isEnabled}
                                                    onChange={() => {
                                                        toggleThemeItem(theme.id, item.id);
                                                    }}
                                                />
                                                <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[0px] after:left-[0px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600/20 peer-checked:after:bg-blue-400 peer-checked:after:border-blue-300"></div>
                                            </label>

                                            <button
                                                className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-800 ml-1"
                                                onClick={(e) => handleKebabClick(e, item.id)}
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                        </div>

                                        {/* HTML Controls Row (Expanded Only) */}
                                        {
                                            s.type === 'html' && !isCollapsed && (
                                                <div className="bg-slate-950/30 px-3 pb-3 pt-3 flex gap-2 items-center border-b border-slate-800/50" onClick={e => e.stopPropagation()}>
                                                    <div className="flex-1 flex gap-2 items-center bg-slate-900 border border-slate-800 rounded px-2 py-1">
                                                        <span className="text-[10px] text-slate-500 font-mono uppercase">Target</span>
                                                        <input
                                                            className="bg-transparent text-slate-300 text-sm font-mono w-full outline-none placeholder:text-slate-700"
                                                            placeholder="CSS Selector (e.g. .container)"
                                                            value={item.overrides?.selector ?? s.selector ?? ''}
                                                            onChange={(e) => updateThemeItem(themeId, item.id, {
                                                                overrides: { ...item.overrides, selector: e.target.value }
                                                            })}
                                                            title="CSS Selector Target"
                                                        />
                                                    </div>
                                                    <div className="w-[120px] flex gap-2 items-center bg-slate-900 border border-slate-800 rounded px-2 py-1">
                                                        <span className="text-[10px] text-slate-500 font-mono uppercase">Pos</span>
                                                        <select
                                                            className="bg-transparent text-slate-300 text-sm w-full outline-none cursor-pointer"
                                                            value={item.overrides?.position ?? s.position ?? 'beforeend'}
                                                            onChange={(e) => updateThemeItem(themeId, item.id, {
                                                                overrides: { ...item.overrides, position: e.target.value as any }
                                                            })}
                                                            title="Injection Position"
                                                        >
                                                            <option value="append">Append</option>
                                                            <option value="prepend">Prepend</option>
                                                            <option value="before">Before</option>
                                                            <option value="after">After</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )
                                        }



                                        {/* Snippet Editor Body */}
                                        {
                                            !isCollapsed && (
                                                <div className="flex flex-col border-t border-slate-800">
                                                    <CodeEditor
                                                        value={item.overrides?.content ?? s.content}
                                                        onChange={(val) => {
                                                            if (s.isLibraryItem === false) {
                                                                updateSnippet(s.id, { content: val });
                                                            } else {
                                                                updateThemeItem(themeId, item.id, {
                                                                    overrides: { ...item.overrides, content: val }
                                                                });
                                                            }
                                                        }}
                                                        className="flex-1 rounded-none border-x-0 border-b-0 border-t-0"
                                                        mode={s.type}
                                                        autoHeight={true}
                                                        onFocus={() => {
                                                            if (selectedItemId !== item.id) {
                                                                setSelectedItemId(item.id);
                                                                // Optional: Scroll sidebar to it? 
                                                                // Let's rely on user action or auto-scroll. 
                                                                // Ideally if focusing via click, it's fine.
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            )
                                        }
                                    </div>
                                );
                            })}
                            {filteredItems.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                    <Box size={48} className="mb-4 opacity-20" />
                                    <p>No {activeTab.toUpperCase()} snippets found.</p>
                                    <button
                                        onClick={() => handleCreateLocal(activeTab)}
                                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                                    >
                                        Create New {activeTab.toUpperCase()} Snippet
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
};
