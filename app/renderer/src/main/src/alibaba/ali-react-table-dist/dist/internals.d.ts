/// <reference types="react" />
import { ArtColumn } from './interfaces';
declare function safeRenderHeader(column: ArtColumn): import("react").ReactNode;
declare function safeGetValue(column: ArtColumn, record: any, rowIndex: number): any;
declare function safeGetRowKey(primaryKey: string | ((record: any) => string), record: any, rowIndex: number): string;
declare function safeGetCellProps(column: ArtColumn, record: any, rowIndex: number): import("./interfaces").CellProps;
declare function safeRender(column: ArtColumn, record: any, rowIndex: number): any;
export declare const internals: {
    readonly safeRenderHeader: typeof safeRenderHeader;
    readonly safeGetValue: typeof safeGetValue;
    readonly safeGetRowKey: typeof safeGetRowKey;
    readonly safeGetCellProps: typeof safeGetCellProps;
    readonly safeRender: typeof safeRender;
};
export {};
