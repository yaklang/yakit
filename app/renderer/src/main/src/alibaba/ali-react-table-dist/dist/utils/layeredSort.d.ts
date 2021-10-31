import { AbstractTreeNode } from '../interfaces';
/** 对树状结构的数据进行排序.
 * layeredSort 是一个递归的过程，针对树上的每一个父节点，该函数都会重新对其子节点数组（children) 进行排序.
 * */
export default function layeredSort<T extends AbstractTreeNode>(array: T[], compare: (x: T, y: T) => number): T[];
