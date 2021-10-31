import { ReactNode } from 'react';
import { ArtColumnStaticPart, CellProps } from '../../interfaces';
export interface CrossTableIndicator extends ArtColumnStaticPart {
    code: string;
    expression?: string;
}
export interface CrossTableLeftMetaColumn extends Omit<ArtColumnStaticPart, 'hidden'> {
    /** 自定义渲染方法 */
    render?(leftNode: LeftCrossTreeNode, leftDepth: number): ReactNode;
    /** 自定义的获取单元格 props 的方法 */
    getCellProps?(leftNode: LeftCrossTreeNode, leftDepth: number): CellProps;
}
export interface CrossTreeNode {
    key: string;
    value: string;
    title?: ReactNode;
    data?: any;
    hidden?: boolean;
    children?: CrossTreeNode[];
}
/** 交叉表左侧树状结构的树节点 */
export interface LeftCrossTreeNode extends CrossTreeNode {
    children?: CrossTreeNode[];
}
/** 交叉表上方树状结构的树节点
 * 列的名称现由 value 字段提供，故从 ArtColumnStaticPart 移除了 name 字段 */
export interface TopCrossTreeNode extends CrossTreeNode, Omit<ArtColumnStaticPart, 'name'> {
    children?: TopCrossTreeNode[];
}
