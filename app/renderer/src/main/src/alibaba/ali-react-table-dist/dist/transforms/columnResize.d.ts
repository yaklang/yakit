import { TableTransform } from '../interfaces';
/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
export interface ColumnResizeOptions {
    /** 每一列的宽度 */
    sizes: number[];
    /** 修改宽度的回调函数 */
    onChangeSizes(nextSizes: number[]): void;
    /** 列的最小宽度，默认为 40 */
    minSize?: number;
    /** 列的最大宽度，默认为 Infinity */
    maxSize?: number;
    /** 是否在列的末尾追加可伸缩列，默认为 false */
    appendExpander?: boolean;
    /** 是否在调整列宽时禁用 user-select，默认为 false */
    disableUserSelectWhenResizing?: boolean;
    /** 可伸缩列 style.visibility */
    expanderVisibility?: 'visible' | 'hidden';
}
/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
export declare function makeColumnResizeTransform({ sizes, onChangeSizes, minSize, maxSize, appendExpander, expanderVisibility, disableUserSelectWhenResizing, }: ColumnResizeOptions): TableTransform;
/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
export declare function useColumnResizeTransform({ defaultSizes, ...others }: Omit<ColumnResizeOptions, 'sizes' | 'onChangeSizes'> & {
    defaultSizes: number[];
}): TableTransform;
