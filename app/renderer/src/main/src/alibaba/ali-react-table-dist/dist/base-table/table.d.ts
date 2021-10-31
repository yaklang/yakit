import React, { CSSProperties, ReactNode } from 'react';
import { noop } from 'rxjs';
import { ArtColumn } from '../interfaces';
import { TableDOMHelper } from './helpers/TableDOMUtils';
import { ResolvedUseVirtual, VerticalRenderRange, VirtualEnum } from './interfaces';
import { LoadingContentWrapperProps } from './loading';
import { BaseTableCSSVariables } from './styles';
export declare type PrimaryKey = string | ((row: any) => string);
export interface BaseTableProps {
    /** 主键 */
    primaryKey?: PrimaryKey;
    /** 表格展示的数据源 */
    dataSource: any[];
    /** 表格页脚数据源 */
    footerDataSource?: any[];
    /** 表格的列配置 */
    columns: ArtColumn[];
    /** 是否开启虚拟滚动 */
    useVirtual?: VirtualEnum | {
        horizontal?: VirtualEnum;
        vertical?: VirtualEnum;
        header?: VirtualEnum;
    };
    /** 虚拟滚动开启情况下，表格中每一行的预估高度 */
    estimatedRowHeight?: number;
    /** @deprecated 表格头部是否置顶，默认为 true。请使用 isStickyHeader 代替 */
    isStickyHead?: boolean;
    /** 表格头部是否置顶，默认为 true */
    isStickyHeader?: boolean;
    /** 表格置顶后，距离顶部的距离 */
    stickyTop?: number;
    /** 表格页脚是否置底，默认为 true */
    isStickyFooter?: boolean;
    /** 表格页脚置底后，距离底部的距离 */
    stickyBottom?: number;
    /** 自定义类名 */
    className?: string;
    /** 自定义内联样式 */
    style?: CSSProperties & BaseTableCSSVariables;
    /** 表格是否具有头部 */
    hasHeader?: boolean;
    /** 表格是否具有横向的粘性滚动条 */
    hasStickyScroll?: boolean;
    /** 横向粘性滚动条高度 */
    stickyScrollHeight?: 'auto' | number;
    /** 使用来自外层 div 的边框代替单元格的外边框 */
    useOuterBorder?: boolean;
    /** 表格是否在加载中 */
    isLoading?: boolean;
    /** 数据为空时，单元格的高度 */
    emptyCellHeight?: number;
    /** @deprecated 数据为空时，表格的展示内容。请使用 components.EmptyContent 代替 */
    emptyContent?: ReactNode;
    /** 覆盖表格内部用到的组件 */
    components?: {
        /** 表格加载时，表格内容的父组件 */
        LoadingContentWrapper?: React.ComponentType<LoadingContentWrapperProps>;
        /** 表格加载时的加载图标 */
        LoadingIcon?: React.ComponentType;
        /** 数据为空时，表格的展示内容。*/
        EmptyContent?: React.ComponentType;
        /** 覆盖内部渲染 tbody>tr 元素的组件，一般用于在 tr 上设置 context */
        Row?: React.ComponentType<{
            row: any;
            rowIndex: number;
            trProps: unknown;
        }>;
        /** 覆盖内部渲染 tbody>td 元素的组件，一般用于在 td 上设置 context */
        Cell?: React.ComponentType<{
            row: any;
            rowIndex: number;
            colIndex: number;
            tdProps: unknown;
            column: ArtColumn;
        }>;
        /** 覆盖内部渲染 tbody 元素的组件 */
        TableBody?: React.ComponentType<{
            tbodyProps: unknown;
        }>;
    };
    /** 列的默认宽度 */
    defaultColumnWidth?: number;
    /**
     * @deprecated
     * flowRoot 在表格 v2.4 后不再需要提供，请移除该属性
     * */
    flowRoot?: never;
    /** 虚拟滚动调试标签，用于表格内部调试使用 */
    virtualDebugLabel?: string;
    getRowProps?(row: any, rowIndex: number): React.HTMLAttributes<HTMLTableRowElement>;
}
interface BaseTableState {
    /** 是否要展示自定义滚动条(stickyScroll) */
    hasScroll: boolean;
    /** 是否需要渲染 lock sections
     * 当表格较宽时，所有的列都能被完整的渲染，此时不需要渲染 lock sections
     * 只有当「整个表格的宽度」小于「每一列渲染宽度之和」时，lock sections 才需要被渲染 */
    needRenderLock: boolean;
    /** 纵向虚拟滚动偏移量 */
    offsetY: number;
    /** 纵向虚拟滚动 最大渲染尺寸 */
    maxRenderHeight: number;
    /** 横向虚拟滚动偏移量 */
    offsetX: number;
    /** 横向虚拟滚动 最大渲染尺寸 */
    maxRenderWidth: number;
}
export declare class BaseTable extends React.Component<BaseTableProps, BaseTableState> {
    static defaultProps: {
        hasHeader: boolean;
        isStickyHeader: boolean;
        stickyTop: number;
        footerDataSource: any[];
        isStickyFooter: boolean;
        stickyBottom: number;
        hasStickyScroll: boolean;
        stickyScrollHeight: string;
        useVirtual: string;
        estimatedRowHeight: number;
        isLoading: boolean;
        components: {};
        getRowProps: typeof noop;
        dataSource: any[];
    };
    private rowHeightManager;
    private artTableWrapperRef;
    private domHelper;
    private rootSubscription;
    private lastInfo;
    private props$;
    /** @deprecated BaseTable.getDoms() 已经过时，请勿调用 */
    getDoms(): TableDOMHelper;
    constructor(props: Readonly<BaseTableProps>);
    /** 自定义滚动条宽度为table宽度，使滚动条滑块宽度相同 */
    private updateStickyScroll;
    private renderTableHeader;
    private updateOffsetX;
    private syncHorizontalScrollFromTableBody;
    /** 同步横向滚动偏移量 */
    private syncHorizontalScroll;
    getVerticalRenderRange(useVirtual: ResolvedUseVirtual): VerticalRenderRange;
    private renderTableBody;
    private renderTableFooter;
    private renderLockShadows;
    private renderStickyScroll;
    render(): JSX.Element;
    componentDidMount(): void;
    componentDidUpdate(prevProps: Readonly<BaseTableProps>, prevState: Readonly<BaseTableState>): void;
    private didMountOrUpdate;
    private updateScrollLeftWhenLayoutChanged;
    private initSubscriptions;
    componentWillUnmount(): void;
    /** 更新 DOM 节点的引用，方便其他方法直接操作 DOM */
    private updateDOMHelper;
    private updateRowHeightManager;
    /** 计算表格所有列的渲染宽度之和，判断表格是否需要渲染锁列 */
    private adjustNeedRenderLock;
}
export {};
