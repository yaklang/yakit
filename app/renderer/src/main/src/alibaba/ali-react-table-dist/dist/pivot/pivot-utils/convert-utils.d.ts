import { CrossTableIndicator, CrossTreeNode } from '../cross-table';
import { DrillNode } from './interfaces';
declare type ConvertOptions<T extends CrossTreeNode = CrossTreeNode> = {
    /** 需要在子节点处附加的 指标节点 */
    indicators?: CrossTableIndicator[];
    /** 自定义的编码函数，用于根据下钻的值序列生成唯一的字符串.
     * 该参数留空 表示使用默认的编码方式 */
    encode?(valuePath: string[]): string;
    /** 为一个值序列生成小计（sub-total）节点.
     * 针对每一个父节点，该函数都将被调用一次；
     * * 函数返回 null, 表示对应父节点不需要小计节点；
     * * 返回 `{ position: 'start' | 'end', value: string; data?: any }`
     *  表明所要生成的小计节点的摆放位置、文本、附加的数据
     *
     * 该参数留空 表示所有节点均不需要生成小计节点 */
    generateSubtotalNode?(drillNode: DrillNode): null | {
        position: 'start' | 'end';
        value: string;
    };
    /** 是否支持节点的展开与收拢，默认为 false。
     * 当该选项为 true 时，展开/收拢才会开启，相关的按钮也才会被渲染 */
    supportsExpand?: boolean;
    /** 展开的节点的 key 数组 */
    expandKeys?: string[];
    /** 展开节点发生变化时的回调 */
    onChangeExpandKeys?(nextKeys: string[], targetNode: DrillNode, action: 'collapse' | 'expand'): void;
    /** 是否强制展开总计节点，默认为 true */
    enforceExpandTotalNode?: boolean;
};
export declare function convertDrillTreeToCrossTree<T extends CrossTreeNode = CrossTreeNode>(drillTree: DrillNode[], { indicators, encode, generateSubtotalNode, enforceExpandTotalNode, expandKeys, onChangeExpandKeys, supportsExpand, }?: ConvertOptions<T>): T[];
export {};
