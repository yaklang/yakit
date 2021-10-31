import { BaseTableProps } from '../../base-table';
import { BuildCrossTableOptions, CrossTableLeftMetaColumn } from '../cross-table';
export declare type BuildCrossTreeTableOptions = Omit<BuildCrossTableOptions, 'leftMetaColumns' | 'leftTotalNode' | 'topTotalNode'> & {
    primaryColumn?: CrossTableLeftMetaColumn;
    openKeys: string[];
    onChangeOpenKeys(nextOpenKeys: string[]): void;
    indentSize?: number;
    isLeafNode?(node: any, nodeMeta: {
        depth: number;
        expanded: boolean;
        rowKey: string;
    }): boolean;
};
export default function buildCrossTreeTable(options: BuildCrossTreeTableOptions): Pick<BaseTableProps, 'columns' | 'dataSource'>;
