import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ThemeItem, type ThemeItemProps } from './ThemeItem';
import type { Theme } from '../types';

interface SortableThemeItemProps extends Omit<ThemeItemProps, 'setNodeRef' | 'style' | 'dragHandleProps' | 'isDragging'> {
    theme: Theme;
    isSelectionMode: boolean;
    // Rename props
    isRenaming?: boolean;
    onRenameStart?: () => void;
    onRename?: (newName: string) => void;
    onRenameCancel?: () => void;
}

export const SortableThemeItem: React.FC<SortableThemeItemProps> = (props) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.theme.id, disabled: props.isSelectionMode });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? 'none' : transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative' as 'relative',
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <ThemeItem
            {...props}
            setNodeRef={setNodeRef}
            style={style}
            dragHandleProps={{ ...attributes, ...listeners }}
            isDragging={isDragging}
        />
    );
};
