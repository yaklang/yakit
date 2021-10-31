declare type WithChildren<T> = T & {
    children?: WithChildren<T>[];
};
/**
 * 根据 idProp 与 parentIdProp 从对象数组中构建对应的树
 * 当 A[parentIdProp] === B[idProp] 时，对象A会被移动到对象B的children。
 * 当一个对象的 parentIdProp 不与其他对象的 idProp 字段相等时，该对象被作为树的顶层节点
 * @example
 * const array = [
 *   { id: 'node-1', parent: 'root' },
 *   { id: 'node-2', parent: 'root' },
 *   { id: 'node-3', parent: 'node-2' },
 *   { id: 'node-4', parent: 'node-2' },
 *   { id: 'node-5', parent: 'node-4' },
 * ]
 * const tree = buildTree('id', 'parent', array)
 * expect(tree).toEqual([
 *   { id: 'node-1', parent: 'root' },
 *   {
 *     id: 'node-2',
 *     parent: 'root',
 *     children: [
 *       { id: 'node-3', parent: 'node-2' },
 *       {
 *         id: 'node-4',
 *         parent: 'node-2',
 *         children: [{ id: 'node-5', parent: 'node-4' }],
 *       },
 *     ],
 *   },
 * ])
 */
export default function buildTree<ID extends string, PID extends string, T extends {
    [key in ID | PID]: string;
}>(idProp: ID, parentIdProp: PID, items: T[]): WithChildren<T>[];
export {};
