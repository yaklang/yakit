import { ArtColumn, TableTransform } from '../interfaces';
declare type NormalizeAsArrayInput<T> = null | T | T[];
/** @deprecated 该 API 已经过时，请使用 makeRecursiveMapper */
export default function traverseColumn(fn: (column: ArtColumn, ctx: {
    range: {
        start: number;
        end: number;
    };
    dataSource: any[];
}) => NormalizeAsArrayInput<ArtColumn>): TableTransform;
export {};
