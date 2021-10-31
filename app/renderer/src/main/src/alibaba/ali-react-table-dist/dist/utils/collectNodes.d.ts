import { AbstractTreeNode } from '../interfaces';
/** 遍历所有节点，并将节点收集到一个数组中.
 * order 参数可用于指定遍历规则：
 * * `pre` 前序遍历 （默认）
 * * `post` 后续遍历
 * * `leaf-only` 忽略内部节点，只收集叶子节点
 * */
export default function collectNodes<T extends AbstractTreeNode>(nodes: T[], order?: 'pre' | 'post' | 'leaf-only'): T[];
