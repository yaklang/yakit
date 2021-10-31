import React, { ReactNode } from 'react';
import { ArtColumn, SortItem, SortOrder } from '../../interfaces';
import { TablePipeline } from '../pipeline';
export interface SortHeaderCellProps {
    /** 调用 makeSortTransform(...) 时的参数 */
    sortOptions: Required<Omit<SortFeatureOptions, 'SortHeaderCell' | 'defaultSorts'>>;
    /** 在添加排序相关的内容之前 表头原有的渲染内容 */
    children: ReactNode;
    /** 当前排序 */
    sortOrder: SortOrder;
    /** 多列排序下，sortIndex 指明了当前排序字段起作用的顺序. 当 sortOrder 为 none 时，sortIndex 固定为 -1 */
    sortIndex: number;
    /** 当前列的配置 */
    column: ArtColumn;
    /** 切换排序的回调 */
    onToggle(e: React.MouseEvent): void;
    /** 点击事件的响应区域 */
    clickArea: 'content' | 'icon';
}
export interface SortFeatureOptions {
    /** (非受控用法) 默认的排序字段列表 */
    defaultSorts?: SortItem[];
    /** (受控用法) 排序字段列表 */
    sorts?: SortItem[];
    /** 更新排序字段列表的回调函数 */
    onChangeSorts?(nextSorts: SortItem[]): void;
    /** 排序切换顺序 */
    orders?: SortOrder[];
    /** 排序模式。单选 single，多选 multiple，默认为多选 */
    mode?: 'single' | 'multiple';
    /** 自定义排序表头 */
    SortHeaderCell?: React.ComponentType<SortHeaderCellProps>;
    /** 是否保持 dataSource 不变 */
    keepDataSource?: boolean;
    /** 排序激活时 是否高亮这一列的单元格 */
    highlightColumnWhenActive?: boolean;
    /** 是否对触发 onChangeOpenKeys 的 click 事件调用 event.stopPropagation() */
    stopClickEventPropagation?: boolean;
    /** 点击事件的响应区域，默认为 content */
    clickArea?: 'content' | 'icon';
}
export declare function sort(opts?: SortFeatureOptions): (pipeline: TablePipeline) => TablePipeline;
