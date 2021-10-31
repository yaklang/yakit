import { TablePipeline } from '../pipeline';
export interface RowGroupingFeatureOptions {
    /** 非受控用法：是否默认展开所有分组 */
    defaultOpenAll?: boolean;
    /** 非受控用法：默认展开的 keys */
    defaultOpenKeys?: string[];
    /** 受控用法：当前展开的 keys */
    openKeys?: string[];
    /** 受控用法：当前展开 keys 改变回调 */
    onChangeOpenKeys?(nextKeys: string[], key: string, action: 'expand' | 'collapse'): void;
    /** 是否对触发 onChangeOpenKeys 的 click 事件调用 event.stopPropagation() */
    stopClickEventPropagation?: boolean;
}
export declare function rowGrouping(opts?: RowGroupingFeatureOptions): (pipeline: TablePipeline) => TablePipeline;
