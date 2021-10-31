import { VerticalRenderRange } from '../interfaces';
export declare function getFullRenderRange(rowCount: number): VerticalRenderRange;
export declare function makeRowHeightManager(initRowCount: number, estimatedRowHeight: number): {
    getRenderRange: (offset: number, maxRenderHeight: number, rowCount: number) => VerticalRenderRange;
    updateRow: (index: number, offset: number, size: number) => void;
    cache: number[];
};
