import { BaseTableProps } from '../../base-table';
import { CrossTableProps } from './cross-table';
import { CrossTableLeftMetaColumn, LeftCrossTreeNode, TopCrossTreeNode } from './interfaces';
export interface BuildCrossTableOptions {
    leftTree: LeftCrossTreeNode[];
    topTree: TopCrossTreeNode[];
    leftTotalNode?: LeftCrossTreeNode;
    topTotalNode?: TopCrossTreeNode;
    leftMetaColumns?: CrossTableLeftMetaColumn[];
    getValue?: CrossTableProps['getValue'];
    render?: CrossTableProps['render'];
    getCellProps?: CrossTableProps['getCellProps'];
}
export default function buildCrossTable(options: BuildCrossTableOptions & {
    columnOffset?: number;
    rowOffset?: number;
}): Pick<BaseTableProps, 'columns' | 'dataSource'>;
