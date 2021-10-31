import { TableTransform } from '../interfaces';
/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
export interface ColumnHoverOptions {
    hoverColor?: string;
    hoverColIndex: number;
    onChangeHoverColIndex(nextColIndex: number): void;
}
/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
export declare function makeColumnHoverTransform({ hoverColor, hoverColIndex, onChangeHoverColIndex, }: ColumnHoverOptions): TableTransform;
/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
export declare function useColumnHoverTransform({ hoverColor, defaultHoverColIndex, }?: {
    hoverColor?: string;
    defaultHoverColIndex?: number;
}): TableTransform;
