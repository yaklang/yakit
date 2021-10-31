import React, { ReactNode } from 'react';
export declare type ArtColumnAlign = 'left' | 'center' | 'right';
export declare type CellProps = React.TdHTMLAttributes<HTMLTableCellElement>;
export interface ArtColumnStaticPart {
    /** 列的名称 */
    name: string;
    /** 在数据中的字段 code */
    code?: string;
    /** 列标题的展示名称；在页面中进行展示时，该字段将覆盖 name 字段 */
    title?: ReactNode;
    /** 列的宽度，如果该列是锁定的，则宽度为必传项 */
    width?: number;
    /** 单元格中的文本或内容的 对其方向 */
    align?: ArtColumnAlign;
    /** @deprecated 是否隐藏 */
    hidden?: boolean;
    /** 是否锁列 */
    lock?: boolean;
    /** 表头单元格的 props */
    headerCellProps?: CellProps;
    /** 功能开关 */
    features?: {
        [key: string]: any;
    };
}
export interface ArtColumnDynamicPart {
    /** 自定义取数方法 */
    getValue?(row: any, rowIndex: number): any;
    /** 自定义渲染方法 */
    render?(value: any, row: any, rowIndex: number): ReactNode;
    /** 自定义的获取单元格 props 的方法 */
    getCellProps?(value: any, row: any, rowIndex: number): CellProps;
    /** 自定义的获取单元格 SpanRect 方法 */
    getSpanRect?(value: any, row: any, rowIndex: number): SpanRect;
}
export interface ArtColumn extends ArtColumnStaticPart, ArtColumnDynamicPart {
    /** 该列的子节点 */
    children?: ArtColumn[];
}
/** SpanRect 用于描述合并单元格的边界
 * 注意 top/left 为 inclusive，而 bottom/right 为 exclusive */
export interface SpanRect {
    top: number;
    bottom: number;
    left: number;
    right: number;
}
export interface AbstractTreeNode {
    children?: AbstractTreeNode[];
}
export declare type SortOrder = 'desc' | 'asc' | 'none';
export declare type SortItem = {
    code: string;
    order: SortOrder;
};
export declare type Transform<T> = (input: T) => T;
/** @deprecated transform */
export declare type TableTransform = Transform<{
    columns: ArtColumn[];
    dataSource: any[];
}>;
export interface HoverRange {
    start: number;
    end: number;
}
