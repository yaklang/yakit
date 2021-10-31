import { DrillNode } from './interfaces';
export interface BuildDrillTreeOptions<T extends DrillNode> {
    /** 是否生成顶层的「总计」节点，默认不生成 */
    includeTopWrapper?: boolean;
    /** 生成顶层节点时，顶层节点内的文本值，默认为「总计」 */
    totalValue?: string;
    /** 自定义的编码函数，用于根据下钻的值序列生成唯一的字符串.
     * 该参数留空 表示使用默认的编码方式 */
    encode?(path: string[]): string;
    /** 判断一个节点是否展开，没有展开的节点将不进行下钻 */
    isExpand?(key: string): boolean;
    /** 是否强制展开总计节点，默认为 true */
    enforceExpandTotalNode?: boolean;
}
/** 根据指定的 code 序列计算下钻树 */
export default function buildDrillTree(data: any[], codes: string[], { encode, totalValue, includeTopWrapper, isExpand, enforceExpandTotalNode, }?: BuildDrillTreeOptions<DrillNode>): DrillNode[];
