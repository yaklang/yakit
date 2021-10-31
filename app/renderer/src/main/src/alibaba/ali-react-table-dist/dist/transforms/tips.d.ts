import { TableTransform } from '../interfaces';
/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
export interface TipsOptions {
    Balloon?: any;
    Tooltip?: any;
}
/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
export declare function makeTipsTransform({ Balloon, Tooltip }: TipsOptions): TableTransform;
