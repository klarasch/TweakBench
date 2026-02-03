import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store.ts';
import { SnippetLibrary } from './SnippetLibrary.tsx';
import { SnippetStackItem } from './ThemeDetail/SnippetStackItem.tsx';
import { StructureSidebar } from './ThemeDetail/StructureSidebar.tsx';
import { ThemeHeader } from './ThemeDetail/ThemeHeader.tsx';
import { Button } from './ui/Button';
import { ContextMenu, type ContextMenuItem } from './ContextMenu.tsx';
import { Trash2, Plus, Box, Play, Pause, Download, X, Edit } from 'lucide-react';
import type { SnippetType } from '../types.ts';
import { exportThemeToJS, exportThemeToCSS } from '../utils/impexp.ts';

interface ThemeDetailProps {
    themeId: string;
    onBack: () => void;
}

export const ThemeDetail: React.FC<ThemeDetailProps> = ({ themeId, onBack }) => {
    const theme = useStore(state => state.themes.find(t => t.id === themeId));
    const snippets = useStore(state => state.snippets);
    const globalEnabled = useStore(state => state.globalEnabled);
    const addSnippet = useStore(state => state.addSnippet);
    const addSnippetToTheme = useStore(state => state.addSnippetToTheme);
    const toggleThemeItem = useStore(state => state.toggleThemeItem);
    const updateTheme = useStore(state => state.updateTheme);
    const toggleGlobal = useStore(state => state.toggleGlobal);
    // State
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [showLibrary, setShowLibrary] = useState(false);
    const [libraryFilter, setLibraryFilter] = useState<'css' | 'html' | null>(null);
    const [activeTab, setActiveTab] = useState<'css' | 'html'>('css'); // Added activeTab state

    const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());
    const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null); // Added editing state
    const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const sidebarItemRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Responsive & Popover State
    const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

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
                label: 'Rename',
                icon: <Edit size={14} />,
                onClick: () => setEditingSnippetId(itemId)
            },
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
            {/* Header */}
            <ThemeHeader
                theme={theme}
                onBack={onBack}
                updateTheme={updateTheme}
                showLibrary={showLibrary}
                setShowLibrary={setShowLibrary}
                libraryFilter={libraryFilter}
                setLibraryFilter={setLibraryFilter}
                globalEnabled={globalEnabled}
                toggleGlobal={toggleGlobal}
                onContextMenu={(e) => {
                    e.stopPropagation();
                    setMenuState({ x: e.currentTarget.getBoundingClientRect().left, y: e.currentTarget.getBoundingClientRect().bottom, itemId: 'THEME_HEADER_MENU' });
                }}
            />

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
                            <StructureSidebar
                                items={filteredItems}
                                snippets={snippets}
                                activeTab={activeTab}
                                theme={theme}
                                selectedItemId={selectedItemId}
                                onSelect={setSelectedItemId}
                                onReorder={handleReorder}
                                onContextMenu={handleContextMenu}
                                itemRefs={sidebarItemRefs}
                            />
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
                        <div className="flex-1 flex flex-col bg-slate-900 relative overflow-y-auto p-3">


                            {/* Sticky Subheader - Refreshed */}
                            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-2 flex items-center justify-between">
                                <div className="flex gap-2">
                                    {(() => {
                                        const isAllCollapsed = filteredItems.length > 0 && filteredItems.every(i => collapsedItems.has(i.id));
                                        return (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const next = new Set(collapsedItems);
                                                    if (isAllCollapsed) {
                                                        filteredItems.forEach(i => next.delete(i.id));
                                                    } else {
                                                        filteredItems.forEach(i => next.add(i.id));
                                                    }
                                                    setCollapsedItems(next);
                                                }}
                                                className="text-slate-500 hover:text-white"
                                            >
                                                {isAllCollapsed ? 'Expand All' : 'Collapse All'}
                                            </Button>
                                        );
                                    })()}
                                </div>

                                <Button
                                    variant="filled"
                                    size="sm"
                                    onClick={() => handleCreateLocal(activeTab)}
                                    // Make HTML orange button use black text for better contrast against orange-600? Or go darker orange?
                                    // User said "make everything slightly darker". 
                                    // text-slate-900 on orange-500 might be best? Or bg-orange-700 with white text?
                                    // User said "I don't believe the white against the orange is visible." -> Dark text on orange is readable.
                                    className={activeTab === 'css' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-orange-500 hover:bg-orange-400 text-slate-900 font-bold'}
                                    icon={<Plus size={10} />}
                                >
                                    Add {activeTab === 'css' ? 'CSS' : 'HTML'}
                                </Button>

                            </div>

                            {filteredItems.map(item => (
                                <SnippetStackItem
                                    key={item.id}
                                    item={item}
                                    themeId={themeId}
                                    isThemeActive={theme.isActive}
                                    isCollapsed={collapsedItems.has(item.id)}
                                    onToggleCollapse={() => {
                                        const next = new Set(collapsedItems);
                                        if (next.has(item.id)) next.delete(item.id);
                                        else next.add(item.id);
                                        setCollapsedItems(next);
                                    }}
                                    isSelected={selectedItemId === item.id}
                                    itemRef={(el) => { itemRefs.current[item.id] = el; }}
                                    onKebabClick={(e) => handleKebabClick(e, item.id)}
                                    isEditing={editingSnippetId === item.id}
                                    onSetEditing={(isEditing) => setEditingSnippetId(isEditing ? item.id : null)}
                                    onSelect={() => setSelectedItemId(item.id)}
                                />
                            ))}

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
