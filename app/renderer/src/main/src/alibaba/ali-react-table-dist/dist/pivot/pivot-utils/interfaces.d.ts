/** 数据立方.
 * RecordMatrix 是一个二维的 map，CrossTable 会以下列方式使用 matrix 中的数据：
 * `matrix.get(leftPK).get(topPK)[indicatorCode]` */
export declare type RecordMatrix<R = any> = Map<string, Map<string, R>>;
/** 普通的下钻树节点 */
export interface DrillNode {
    key: string;
    value: string;
    path: string[];
    children?: DrillNode[];
    hasChild?: boolean;
}
