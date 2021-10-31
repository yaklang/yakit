import { TablePipeline } from '../pipeline';
export interface ColumnResizeFeatureOptions {
    /** 非受控用法：默认的列宽数组 */
    defaultSizes?: number[];
    /** 受控用法：列宽数组 */
    sizes?: number[];
    /** 受控用法：修改宽度的回调函数 */
    onChangeSizes?(nextSizes: number[]): void;
    /** 列的最小宽度，默认为 60 */
    minSize?: number;
    /** 如果列宽数组中没有提供有效的宽度，fallbackSize 将作为该列的宽度，默认为 150 */
    fallbackSize?: number;
    /** 列的最大宽度，默认为 1000 */
    maxSize?: number;
    /** 是否在调整列宽时禁用 user-select，默认为 true */
    disableUserSelectWhenResizing?: boolean;
    /** 把手的背景色 */
    handleBackground?: string;
    /** 鼠标悬停时，把手的背景色 */
    handleHoverBackground?: string;
    /** 把手激活时的背景色 */
    handleActiveBackground?: string;
}
export declare function columnResize(opts?: ColumnResizeFeatureOptions): (pipeline: TablePipeline) => TablePipeline;
