import { AbstractTreeNode } from '../../interfaces';
export interface StrictTreeDataHelperOptions<N extends AbstractTreeNode> {
    tree: N[];
    getNodeValue(node: N): string;
    value: string[];
}
export default class StrictTreeDataHelper<N extends AbstractTreeNode> {
    private readonly opts;
    private readonly valueSet;
    private wrapperMap;
    private rootWrapper;
    constructor(opts: StrictTreeDataHelperOptions<N>);
    private initWrapperTree;
    private get value();
    isIndeterminate(nodeValue: string): boolean;
    isChecked(nodeValue: string): boolean;
    getValueAfterCheck(nodeValue: string): string[];
    getValueAfterUncheck(nodeValue: string): string[];
    getValueAfterToggle(nodeValue: string): string[];
    getNode(nodeValue: string): N;
    getCleanValue(): string[];
}
