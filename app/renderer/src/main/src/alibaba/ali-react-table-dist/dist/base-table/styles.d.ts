export declare const LOCK_SHADOW_PADDING = 20;
export declare const Classes: {
    /** BaseTable 表格组件的外层包裹 div */
    readonly artTableWrapper: "art-table-wrapper";
    readonly artTable: "art-table";
    readonly tableHeader: "art-table-header";
    readonly tableBody: "art-table-body";
    readonly tableFooter: "art-table-footer";
    /** 表格行 */
    readonly tableRow: "art-table-row";
    /** 表头行 */
    readonly tableHeaderRow: "art-table-header-row";
    /** 单元格 */
    readonly tableCell: "art-table-cell";
    /** 表头的单元格 */
    readonly tableHeaderCell: "art-table-header-cell";
    readonly virtualBlank: "art-virtual-blank";
    readonly stickyScroll: "art-sticky-scroll";
    readonly stickyScrollItem: "art-sticky-scroll-item";
    readonly horizontalScrollContainer: "art-horizontal-scroll-container";
    readonly lockShadowMask: "art-lock-shadow-mask";
    readonly lockShadow: "art-lock-shadow";
    readonly leftLockShadow: "art-left-lock-shadow";
    readonly rightLockShadow: "art-right-lock-shadow";
    /** 数据为空时表格内容的外层 div */
    readonly emptyWrapper: "art-empty-wrapper";
    readonly loadingWrapper: "art-loading-wrapper";
    readonly loadingIndicatorWrapper: "art-loading-indicator-wrapper";
    readonly loadingIndicator: "art-loading-indicator";
};
export declare type BaseTableCSSVariables = Partial<{
    /** 表格一行的高度，注意该属性将被作为 CSS variable，不能使用数字作为简写 */
    '--row-height': string;
    /** 表格的字体颜色 */
    '--color': string;
    /** 表格背景颜色 */
    '--bgcolor': string;
    /** 鼠标悬停时的背景色 */
    '--hover-bgcolor': string;
    /** 单元格高亮时的背景色 */
    '--highlight-bgcolor': string;
    /** 表头中一行的高度，注意该属性将被作为 CSS variable，不能使用数字作为简写 */
    '--header-row-height': string;
    /** 表头中的字体颜色 */
    '--header-color': string;
    /** 表头的背景色 */
    '--header-bgcolor': string;
    /** 表头上鼠标悬停时的背景色 */
    '--header-hover-bgcolor': string;
    /** 表头上单元格高亮时的背景色 */
    '--header-highlight-bgcolor': string;
    /** 单元格 padding */
    '--cell-padding': string;
    /** 字体大小 */
    '--font-size': string;
    /** 表格内字体的行高 */
    '--line-height': string;
    /** 锁列阴影，默认为 rgba(152, 152, 152, 0.5) 0 0 6px 2px */
    '--lock-shadow': string;
    /** 单元格的边框颜色 */
    '--border-color': string;
    /** 单元格边框，默认为 1px solid var(--border-color) */
    '--cell-border': string;
    /** 单元格上下边框，默认为 var(--cell-border) */
    '--cell-border-horizontal': string;
    /** 单元格左右边框，默认为 var(--cell-border) */
    '--cell-border-vertical': string;
    /** 表头单元格边框，默认为 1px solid var(--border-color) */
    '--header-cell-border': string;
    /** 表头单元格上下边框，默认为 var(--header-cell-border) */
    '--header-cell-border-horizontal': string;
    /** 表头单元格左右边框，默认为 var(--header-cell-border) */
    '--header-cell-border-vertical': string;
}>;
export declare const StyledArtTableWrapper: import("styled-components").StyledComponent<"div", any, {}, never>;
