import { AbstractTreeNode } from '../interfaces';
declare type RecursiveFlatMapInfo<T> = {
    startIndex: number;
    endIndex: number;
    path: T[];
    isLeaf: boolean;
};
export default function makeRecursiveMapper<T extends AbstractTreeNode>(fn: (node: T, info: RecursiveFlatMapInfo<T>) => null | T | T[]): (tree: T[]) => T[];
export {};
