import { TableTransform } from '../interfaces';
/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
export interface TreeModeOptions {
    primaryKey: string;
    openKeys: string[];
    onChangeOpenKeys(nextKeys: string[], key: string, action: 'expand' | 'collapse'): void;
    isLeafNode?(node: any, nodeMeta: {
        depth: number;
        expanded: boolean;
        rowKey: string;
    }): boolean;
    /** icon 的缩进值，一般为负数，此时 icon 将向左偏移. 默认为 -6 */
    iconIndent?: number;
    /** icon 与右侧文本的距离，默认为 0 */
    iconGap?: number;
    /** 每一级缩进产生的距离，默认为 16 */
    indentSize?: number;
    clickArea?: 'cell' | 'content' | 'icon';
    treeMetaKey?: string | symbol;
    stopClickEventPropagation?: boolean;
}
/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
export declare function makeTreeModeTransform({ onChangeOpenKeys, openKeys, primaryKey, iconIndent, iconGap, indentSize, isLeafNode, clickArea, treeMetaKey, stopClickEventPropagation, }: TreeModeOptions): TableTransform;
/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
export declare function useTreeModeTransform({ defaultOpenKeys, ...others }: Omit<TreeModeOptions, 'openKeys' | 'onChangeOpenKeys'> & {
    defaultOpenKeys?: string[];
}): TableTransform;
