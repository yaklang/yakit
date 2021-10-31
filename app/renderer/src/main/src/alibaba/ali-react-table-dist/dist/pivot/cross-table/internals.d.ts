import { ArtColumn } from '../../interfaces';
export interface CrossTableLeftColumn extends ArtColumn {
    columnType: 'left';
    children?: never;
}
export interface CrossTableDataColumn extends ArtColumn {
    columnType: 'data';
}
export interface CrossTableDataParentColumn extends ArtColumn {
    columnType: 'data-parent';
    children: (CrossTableDataParentColumn | CrossTableDataColumn)[];
}
export declare type CrossTableRenderColumn = CrossTableLeftColumn | CrossTableDataColumn | CrossTableDataParentColumn;
