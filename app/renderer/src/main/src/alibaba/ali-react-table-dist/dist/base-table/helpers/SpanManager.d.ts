/** 在表格的单元格的渲染过程中，先渲染的单元格的 colSpan/rowSpan 会影响到后续单元格是否被渲染
 * `SpanManager` 会在内部维护一份状态来记录最近渲染单元格的 colSpan/rowSpan，
 * 方便后续的单元格快速判断 "是否需要跳过渲染" */
export default class SpanManager {
    private rects;
    testSkip(rowIndex: number, colIndex: number): boolean;
    stripUpwards(rowIndex: number): void;
    add(rowIndex: number, colIndex: number, colSpan: number, rowSpan: number): void;
}
