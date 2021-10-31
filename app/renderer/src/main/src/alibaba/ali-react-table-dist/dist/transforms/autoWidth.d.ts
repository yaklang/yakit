import React from 'react';
import { BaseTable } from '../base-table';
import { TableTransform } from '../interfaces';
/** 自适应列宽
 *
 * @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展
 *
 * @param tableRef BaseTable 的 ref
 * @param options 参数
 * @param deps 重新调整列宽的依赖数组，每当依赖数组发生变化时， useAutoWidthTransform 会根据单元格内容的实际渲染宽度 设置单元格的宽度
 *
 * options 说明：
 * - options.appendExpander 是否在列的末尾追加可伸缩列
 * - options.expanderVisibility 设置为 `'hidden'` 可以隐藏可伸缩列
 * - options.wrapperStyle 单元格中 div.auto-width-wrapper 的样式
 * - options.initColumnWidth 自适应的初始列宽
 *
 * 注意 useAutoWidthTransform 是一个 React hooks，要遵循 hooks 的用法规范
 * */
export declare function useAutoWidthTransform(tableRef: React.MutableRefObject<BaseTable>, options?: {
    wrapperStyle?: React.CSSProperties;
    initColumnWidth?: number;
    appendExpander?: boolean;
    expanderVisibility?: 'visible' | 'hidden';
}, deps?: any[]): TableTransform;
