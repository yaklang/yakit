import React from 'react';
import { noop } from 'rxjs';
import { BaseTable, BaseTableProps } from '../../base-table';
import { CellProps } from '../../interfaces';
import { CrossTableLeftMetaColumn, LeftCrossTreeNode, TopCrossTreeNode } from '../cross-table';
export interface CrossTreeTableProps extends Omit<BaseTableProps, 'dataSource' | 'columns' | 'primaryKey'> {
    BaseTableComponent?: any;
    baseTableRef?: React.Ref<BaseTable>;
    primaryColumn: CrossTableLeftMetaColumn;
    leftTree: LeftCrossTreeNode[];
    topTree: TopCrossTreeNode[];
    defaultOpenKeys?: string[];
    openKeys?: string[];
    onChangeOpenKeys?(nextOpenKeys: string[]): void;
    indentSize?: number;
    isLeafNode?(node: any, nodeMeta: {
        depth: number;
        expanded: boolean;
        rowKey: string;
    }): boolean;
    getValue?(leftNode: LeftCrossTreeNode, topNode: TopCrossTreeNode, leftDepth: number, topDepth: number): any;
    render?(value: any, leftNode: LeftCrossTreeNode, topNode: TopCrossTreeNode, leftDepth: number, topDepth: number): React.ReactNode;
    getCellProps?(value: any, leftNode: LeftCrossTreeNode, topNode: TopCrossTreeNode, leftDepth: number, topDepth: number): CellProps;
}
export default class CrossTreeTable extends React.Component<CrossTreeTableProps, {
    openKeys: string[];
}> {
    static defaultProps: {
        defaultOpenKeys: string[];
        onChangeOpenKeys: typeof noop;
    };
    static getDerivedStateFromProps(nextProps: Readonly<CrossTreeTableProps>): {
        openKeys: string[];
    };
    constructor(props: Readonly<CrossTreeTableProps>);
    onChangeOpenKeys: (nextOpenKeys: string[]) => void;
    render(): JSX.Element;
}
