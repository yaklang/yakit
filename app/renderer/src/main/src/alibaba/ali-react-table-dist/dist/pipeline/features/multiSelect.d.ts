import { ArtColumnStaticPart } from '../../interfaces';
import { TablePipeline } from '../pipeline';
export interface MultiSelectFeatureOptions {
    /** 非受控用法：默认选中的值 */
    defaultValue?: string[];
    /** 非受控用法：默认 lastKey */
    defaultLastKey?: string;
    /** 受控用法：当前选中的 keys */
    value?: string[];
    /** 受控用法：上一次操作对应的 rowKey */
    lastKey?: string;
    /** 受控用法：状态改变回调  */
    onChange?: (nextValue: string[], key: string, keys: string[], action: 'check' | 'uncheck' | 'check-all' | 'uncheck-all') => void;
    /** 复选框所在列的位置 */
    checkboxPlacement?: 'start' | 'end';
    /** 复选框所在列的 column 配置，可指定 width，lock, title, align, features 等属性 */
    checkboxColumn?: Partial<ArtColumnStaticPart>;
    /** 是否高亮被选中的行 */
    highlightRowWhenSelected?: boolean;
    /** 判断一行中的 checkbox 是否要禁用 */
    isDisabled?(row: any, rowIndex: number): boolean;
    /** 点击事件的响应区域 */
    clickArea?: 'checkbox' | 'cell' | 'row';
    /** 是否对触发 onChange 的 click 事件调用 event.stopPropagation() */
    stopClickEventPropagation?: boolean;
}
export declare function multiSelect(opts?: MultiSelectFeatureOptions): (pipeline: TablePipeline) => TablePipeline;
