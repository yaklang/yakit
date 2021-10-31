import { AbstractTreeNode } from '../../interfaces';
export declare type CheckedStrategy = 'all' | 'parent' | 'child';
export interface TreeDataHelperOptions<N extends AbstractTreeNode> {
    tree: N[];
    getNodeValue(node: N): string;
    value: string[];
    checkedStrategy: CheckedStrategy;
    isDetached?(node: N): boolean;
}
export default class TreeDataHelper<N extends AbstractTreeNode> {
    private readonly opts;
    private readonly valueSet;
    private wrapperMap;
    private rootWrapper;
    constructor(opts: TreeDataHelperOptions<N>);
    private get value();
    private isDetached;
    private initWrapperTree;
    isIndeterminate(nodeValue: string): boolean;
    isChecked(nodeValue: string): boolean;
    getValueAfterCheck(nodeValue: string): string[];
    getValueAfterUncheck(nodeValue: string): string[];
    getValueAfterToggle(nodeValue: string): string[];
    getNode(nodeValue: string): N;
    getCleanValue(): string[];
}
