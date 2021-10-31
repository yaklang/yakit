import { TablePipeline } from '../pipeline';
export interface ColumnHoverFeatureOptions {
    /** 鼠标悬停的颜色，默认为 'var(--hover-bgcolor)' */
    hoverColor?: string;
    /** 非受控用法：默认的 colIndex */
    defaultHoverColIndex?: number;
    /** 受控用法：当前鼠标悬停列的下标（colIndex) */
    hoverColIndex?: number;
    /** 受控用法：colIndex 改变的回调 */
    onChangeHoverColIndex?(nextColIndex: number): void;
}
export declare function columnHover(opts?: ColumnHoverFeatureOptions): (pipeline: TablePipeline) => TablePipeline;
