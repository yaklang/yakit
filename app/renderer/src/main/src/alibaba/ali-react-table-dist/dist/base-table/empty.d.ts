import React from 'react';
import { VisibleColumnDescriptor } from './interfaces';
export interface EmptyTableProps {
    descriptors: VisibleColumnDescriptor[];
    isLoading: boolean;
    emptyCellHeight?: number;
    EmptyContent?: React.ComponentType;
}
export declare function EmptyHtmlTable({ descriptors, isLoading, emptyCellHeight, EmptyContent, }: EmptyTableProps): JSX.Element;
