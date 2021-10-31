import { HoverRange, TableTransform } from '../interfaces';
/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
export interface ColumnRangeHoverOptions {
    hoverColor?: string;
    headerHoverColor?: string;
    hoverRange: HoverRange;
    onChangeHoverRange(nextColIndexRange: HoverRange): void;
}
/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
export declare function makeColumnRangeHoverTransform({ hoverColor, headerHoverColor, hoverRange, onChangeHoverRange, }: ColumnRangeHoverOptions): TableTransform;
/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
export declare function useColumnHoverRangeTransform({ hoverColor, headerHoverColor, defaultHoverRange, }?: Omit<ColumnRangeHoverOptions, 'hoverRange' | 'onChangeHoverRange'> & {
    defaultHoverRange?: HoverRange;
}): TableTransform;
