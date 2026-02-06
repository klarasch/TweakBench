import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ThemeItem, type ThemeItemProps } from './ThemeItem';
import type { Theme } from '../types';

interface SortableThemeItemProps extends Omit<ThemeItemProps, 'setNodeRef' | 'style' | 'dragHandleProps' | 'isDragging'> {
    theme: Theme;
    isSelectionMode: boolean;
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
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 20 : 'auto',
        position: 'relative' as 'relative',
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
