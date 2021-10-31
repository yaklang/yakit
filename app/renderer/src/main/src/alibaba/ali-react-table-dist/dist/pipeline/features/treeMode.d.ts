import { TablePipeline } from '../pipeline';
export declare const treeMetaSymbol: unique symbol;
export interface TreeModeFeatureOptions {
    /** 非受控用法：默认展开的 keys */
    defaultOpenKeys?: string[];
    /** 受控用法：当前展开的 keys */
    openKeys?: string[];
    /** 受控用法：展开 keys 改变的回调 */
    onChangeOpenKeys?(nextKeys: string[], key: string, action: 'expand' | 'collapse'): void;
    /** 自定义叶子节点的判定逻辑 */
    isLeafNode?(node: any, nodeMeta: {
        depth: number;
        expanded: boolean;
        rowKey: string;
    }): boolean;
    /** icon 的缩进值。一般为负数，此时 icon 将向左偏移，默认从 pipeline.ctx.indents 中获取 */
    iconIndent?: number;
    /** icon 与右侧文本的距离，默认从 pipeline.ctx.indents 中获取 */
    iconGap?: number;
    /** 每一级缩进产生的距离，默认从 pipeline.ctx.indents 中获取 */
    indentSize?: number;
    /** 点击事件的响应区域 */
    clickArea?: 'cell' | 'content' | 'icon';
    /** 是否对触发展开/收拢的 click 事件调用 event.stopPropagation() */
    stopClickEventPropagation?: boolean;
    /** 指定表格每一行元信息的记录字段 */
    treeMetaKey?: string | symbol;
}
export declare function treeMode(opts?: TreeModeFeatureOptions): (pipeline: TablePipeline) => TablePipeline;
