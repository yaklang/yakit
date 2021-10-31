import { DrillNode, RecordMatrix } from './interfaces';
export interface BuildingCtx {
    peculiarity: Set<string>;
}
export interface BuildRecordMatrixConfig {
    leftCodes: string[];
    topCodes: string[];
    data: any[];
    aggregate?(slice: any[], ctx: BuildingCtx): any;
    encode?(valuePath: string[]): string;
    isLeftExpand?(key: string): boolean;
    isTopExpand?(key: string): boolean;
    prebuiltLeftTree?: DrillNode[];
    prebuiltTopTree?: DrillNode[];
}
/** 根据表格左侧与上方的下钻树，从全量明细数据中计算对应的数据立方 */
export declare function buildRecordMatrix({ data, leftCodes, topCodes, aggregate, encode, isLeftExpand, isTopExpand, prebuiltLeftTree, prebuiltTopTree, }: BuildRecordMatrixConfig): RecordMatrix;
/** buildRecordMatrix 的简化版本，只能处理一个维度序列，返回一个 Map。
 * 相当于只处理 matrix 的第一行（汇总行） */
export declare function buildRecordMap({ codes, encode, data, aggregate, isExpand, }: {
    codes: string[];
    data: any[];
    aggregate?(slice: any[], ctx: BuildingCtx): any;
    encode?(valuePath: string[]): string;
    isExpand?(key: string): boolean;
}): Map<string, any>;
