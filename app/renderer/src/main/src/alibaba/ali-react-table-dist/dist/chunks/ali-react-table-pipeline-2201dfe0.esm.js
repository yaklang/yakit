import cx from 'classnames';
import React, { useState } from 'react';
import { defer, fromEvent, asyncScheduler, BehaviorSubject, Subscription, merge, Observable, combineLatest, noop } from 'rxjs';
import * as op from 'rxjs/operators';
import { throttleTime, map } from 'rxjs/operators';
import * as styled from 'styled-components';
import styled__default, { css } from 'styled-components';
import ResizeObserver from 'resize-observer-polyfill';

function isLeafNode(node) {
    return node.children == null || node.children.length === 0;
}

/** 遍历所有节点，并将节点收集到一个数组中.
 * order 参数可用于指定遍历规则：
 * * `pre` 前序遍历 （默认）
 * * `post` 后续遍历
 * * `leaf-only` 忽略内部节点，只收集叶子节点
 * */
function collectNodes(nodes, order = 'pre') {
    const result = [];
    dfs(nodes);
    return result;
    function dfs(nodes) {
        if (nodes == null) {
            return;
        }
        for (const node of nodes) {
            if (isLeafNode(node)) {
                result.push(node);
            }
            else {
                if (order === 'pre') {
                    result.push(node);
                    dfs(node.children);
                }
                else if (order === 'post') {
                    dfs(node.children);
                    result.push(node);
                }
                else {
                    dfs(node.children);
                }
            }
        }
    }
}

/** 获取一棵树的高度/深度 (0-based) */
function getTreeDepth(nodes) {
    let maxDepth = -1;
    dfs(nodes, 0);
    return maxDepth;
    function dfs(columns, depth) {
        for (const column of columns) {
            if (isLeafNode(column)) {
                maxDepth = Math.max(maxDepth, depth);
            }
            else {
                dfs(column.children, depth + 1);
            }
        }
    }
}

function groupBy2(list, iteratee) {
    const groups = new Map();
    for (const item of list) {
        const key = iteratee(item);
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(item);
    }
    return groups;
}

function flatMap(array, callback) {
    const result = [];
    array.forEach((value, index) => {
        result.push(...callback(value, index, array));
    });
    return result;
}
function fromEntries(entries) {
    const result = {};
    for (const [key, value] of entries) {
        result[key] = value;
    }
    return result;
}
const arrayUtils = {
    diff(arr1, arr2) {
        const set = new Set(arr2);
        return arr1.filter((x) => !set.has(x));
    },
    merge(arr1, arr2) {
        const set = new Set(arr1);
        return arr1.concat(arr2.filter((x) => !set.has(x)));
    },
};
function always(value) {
    return (...args) => value;
}

/** 在表格的单元格的渲染过程中，先渲染的单元格的 colSpan/rowSpan 会影响到后续单元格是否被渲染
 * `SpanManager` 会在内部维护一份状态来记录最近渲染单元格的 colSpan/rowSpan，
 * 方便后续的单元格快速判断 "是否需要跳过渲染" */
class SpanManager {
    constructor() {
        this.rects = [];
    }
    testSkip(rowIndex, colIndex) {
        return this.rects.some(({ left, right, top, bottom }) => left <= colIndex && colIndex < right && top <= rowIndex && rowIndex < bottom);
    }
    stripUpwards(rowIndex) {
        this.rects = this.rects.filter(rect => rect.bottom > rowIndex);
    }
    add(rowIndex, colIndex, colSpan, rowSpan) {
        this.rects.push({
            left: colIndex,
            right: colIndex + colSpan,
            top: rowIndex,
            bottom: rowIndex + rowSpan,
        });
    }
}

function safeRenderHeader(column) {
    var _a;
    return (_a = column.title) !== null && _a !== void 0 ? _a : column.name;
}
function safeGetValue(column, record, rowIndex) {
    if (column.getValue) {
        return column.getValue(record, rowIndex);
    }
    return record[column.code];
}
function safeGetRowKey(primaryKey, record, rowIndex) {
    let key;
    if (typeof primaryKey === 'string') {
        key = record[primaryKey];
    }
    else if (typeof primaryKey === 'function') {
        key = primaryKey(record);
    }
    if (key == null) {
        key = String(rowIndex);
    }
    return key;
}
function safeGetCellProps(column, record, rowIndex) {
    if (column.getCellProps) {
        const value = safeGetValue(column, record, rowIndex);
        return column.getCellProps(value, record, rowIndex) || {};
    }
    return {};
}
function safeRender(column, record, rowIndex) {
    const value = safeGetValue(column, record, rowIndex);
    if (column.render) {
        return column.render(value, record, rowIndex);
    }
    return value;
}
const internals = {
    safeRenderHeader,
    safeGetValue,
    safeGetRowKey,
    safeGetCellProps,
    safeRender,
};

function composeEventHandler(handler1, handler2) {
    return (...args) => {
        // 先执行原有的事件回调函数
        handler1(args);
        handler2(args);
        // 事件回调函数没有返回值，故这里不进行 return
    };
}
/** 合并两个 cellProps（单元格属性）对象，返回一个合并后的全新对象。
 *
 * mergeCellProps 会按照以下规则来合并两个对象：
 * * 对于 数字、字符串、布尔值类型的字段，extra 中的字段值将直接覆盖 base 中的字段值（className 是个特例，会进行字符串拼接）
 * * 对于函数/方法类型的字段（对应单元格的事件回调函数），mergeCellProps 将生成一个新的函数，新函数将按序调用 base 和 extra 中的方法
 * * 对于普通对象类型的字段（对应单元格的样式），mergeCellProps 将合并两个对象
 * */
function mergeCellProps(base, extra) {
    if (base == null) {
        return extra;
    }
    if (extra == null) {
        return base;
    }
    const result = Object.assign({}, base);
    for (const key of Object.keys(extra)) {
        const value = extra[key];
        const type = typeof value;
        if (value === null) {
            // value=null 时 覆盖原来的值
            result[key] = null;
        }
        else if (value === undefined) ;
        else if (type === 'number' || type === 'string' || type === 'boolean') {
            if (key === 'className') {
                result[key] = cx(result[key], value);
            }
            else {
                result[key] = value;
            }
        }
        else if (type === 'function') {
            const prev = result[key];
            if (prev == null) {
                result[key] = value;
            }
            else {
                result[key] = composeEventHandler(prev, value);
            }
        }
        else if (type === 'object') {
            result[key] = Object.assign({}, result[key], value);
        }
        // else `type` is 'bigint' or 'symbol', `value` is an invalid cellProp, ignore it
    }
    return result;
}

/** styled-components 类库的版本，ali-react-table-dist 同时支持 v3 和 v5 */
const STYLED_VERSION = styled.createGlobalStyle != null ? 'v5' : 'v3';
const STYLED_REF_PROP = STYLED_VERSION === 'v3' ? 'innerRef' : 'ref';
const OVERSCAN_SIZE = 100;
const AUTO_VIRTUAL_THRESHOLD = 100;
function sum(arr) {
    let result = 0;
    arr.forEach((x) => {
        result += x;
    });
    return result;
}
// 使用 defer 避免过早引用 window，导致在 SSR 场景下报错
const throttledWindowResize$ = defer(() => fromEvent(window, 'resize', { passive: true }).pipe(throttleTime(150, asyncScheduler, { leading: true, trailing: true })));
/** 获取默认的滚动条大小 */
function getScrollbarSizeImpl() {
    const scrollDiv = document.createElement('div');
    scrollDiv.style.position = 'absolute';
    scrollDiv.style.width = '100px';
    scrollDiv.style.height = '100px';
    scrollDiv.style.overflow = 'scroll';
    scrollDiv.style.top = '-9999px';
    document.body.appendChild(scrollDiv);
    const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    const scrollbarHeight = scrollDiv.offsetHeight - scrollDiv.clientHeight;
    document.body.removeChild(scrollDiv);
    return { width: scrollbarWidth, height: scrollbarHeight };
}
let scrollBarSize$;
function getScrollbarSize() {
    if (scrollBarSize$ == null) {
        scrollBarSize$ = new BehaviorSubject(getScrollbarSizeImpl());
        throttledWindowResize$.pipe(map(() => getScrollbarSizeImpl())).subscribe(scrollBarSize$);
    }
    return scrollBarSize$.value;
}
/** 同步多个元素之间的 scrollLeft, 每当 scrollLeft 发生变化时 callback 会被调用 */
function syncScrollLeft(elements, callback) {
    const bypassSet = new Set();
    function publishScrollLeft(origin, scrollLeft) {
        bypassSet.clear();
        for (const elem of elements) {
            if (elem === origin) {
                continue;
            }
            elem.scrollLeft = scrollLeft;
            bypassSet.add(elem);
        }
    }
    const subscription = new Subscription();
    for (const ele of elements) {
        const listener = () => {
            if (bypassSet.has(ele)) {
                bypassSet.delete(ele);
                return;
            }
            const scrollLeft = ele.scrollLeft;
            publishScrollLeft(ele, scrollLeft);
            callback(scrollLeft);
        };
        ele.addEventListener('scroll', listener, { passive: true });
        subscription.add(() => ele.removeEventListener('scroll', listener));
    }
    return subscription;
}
/**
 * Performs equality by iterating through keys on an object and returning false
 * when any key has values which are not strictly equal between the arguments.
 * Returns true when the values of all keys are strictly equal.
 */
function shallowEqual(objA, objB) {
    const hasOwnProperty = Object.prototype.hasOwnProperty;
    if (Object.is(objA, objB)) {
        return true;
    }
    if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
        return false;
    }
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) {
        return false;
    }
    // Test for A's keys different from B.
    for (let i = 0; i < keysA.length; i++) {
        if (!hasOwnProperty.call(objB, keysA[i]) || !Object.is(objA[keysA[i]], objB[keysA[i]])) {
            return false;
        }
    }
    return true;
}

function resolveVirtualEnabled(virtualEnum, defaultValue) {
    if (virtualEnum == null || virtualEnum === 'auto') {
        return defaultValue;
    }
    return virtualEnum;
}
let lockColumnNeedSpecifiedWidthWarned = false;
function warnLockColumnNeedSpecifiedWidth(column) {
    if (!lockColumnNeedSpecifiedWidthWarned) {
        lockColumnNeedSpecifiedWidthWarned = true;
        console.warn('[ali-react-table-dist] lock=true 的列需要指定宽度', column);
    }
}
let columnHiddenDeprecatedWarned = false;
function warnColumnHiddenDeprecated(column) {
    if (!columnHiddenDeprecatedWarned) {
        columnHiddenDeprecatedWarned = true;
        console.warn('[ali-react-table-dist] column.hidden 已经过时，如果需要隐藏该列，请将其从 columns 数组中移除', column);
    }
}
/** 检查列配置 & 设置默认宽度 & 剔除隐藏的列 */
function processColumns(columns, defaultColumnWidth) {
    if (columns == null || !Array.isArray(columns)) {
        console.warn('[ali-react-table-dist] <BaseTable /> props.columns 需要传入一个数组', columns);
        columns = [];
    }
    function dfs(columns) {
        const result = [];
        for (let column of columns) {
            if (column.width == null) {
                if (defaultColumnWidth != null) {
                    column = Object.assign(Object.assign({}, column), { width: defaultColumnWidth });
                }
                else if (process.env.NODE_ENV !== 'production' && isLeafNode(column) && column.lock) {
                    warnLockColumnNeedSpecifiedWidth(column);
                }
            }
            if (isLeafNode(column)) {
                if (column.hidden) {
                    // 被隐藏的列 会在这里被剔除
                    warnColumnHiddenDeprecated(column);
                }
                else {
                    result.push(column);
                }
            }
            else {
                // @ts-ignore
                const nextChildren = dfs(column.children);
                // 如果 nextChildren 为空，说明所有的子节点均被隐藏了，在这里隐藏父节点
                if (nextChildren.length > 0) {
                    result.push(Object.assign(Object.assign({}, column), { children: nextChildren }));
                }
            }
        }
        return result;
    }
    return dfs(columns);
}
function getLeftNestedLockCount(columns) {
    let nestedCount = 0;
    for (const col of columns) {
        if (isLock(col)) {
            nestedCount += 1;
        }
        else {
            break;
        }
    }
    return nestedCount;
    function isLock(col) {
        if (isLeafNode(col)) {
            return col.lock;
        }
        else {
            return col.lock || col.children.some(isLock);
        }
    }
}
function getHorizontalRenderRange({ offsetX, maxRenderWidth, flat, useVirtual, }) {
    if (!useVirtual.horizontal) {
        return { leftIndex: 0, leftBlank: 0, rightIndex: flat.full.length, rightBlank: 0 };
    }
    let leftIndex = 0;
    let centerCount = 0;
    let leftBlank = 0;
    let centerRenderWidth = 0;
    const overscannedOffsetX = Math.max(0, offsetX - OVERSCAN_SIZE);
    while (leftIndex < flat.center.length) {
        const col = flat.center[leftIndex];
        if (col.width + leftBlank < overscannedOffsetX) {
            leftIndex += 1;
            leftBlank += col.width;
        }
        else {
            break;
        }
    }
    // 考虑 over scan 之后，中间部分的列至少需要渲染的宽度
    const minCenterRenderWidth = maxRenderWidth + (overscannedOffsetX - leftBlank) + 2 * OVERSCAN_SIZE;
    while (leftIndex + centerCount < flat.center.length) {
        const col = flat.center[leftIndex + centerCount];
        if (col.width + centerRenderWidth < minCenterRenderWidth) {
            centerRenderWidth += col.width;
            centerCount += 1;
        }
        else {
            break;
        }
    }
    const rightBlankCount = flat.center.length - leftIndex - centerCount;
    const rightBlank = sum(flat.center.slice(flat.center.length - rightBlankCount).map((col) => col.width));
    return {
        leftIndex: leftIndex,
        leftBlank,
        rightIndex: leftIndex + centerCount,
        rightBlank,
    };
}
// 一顿计算，将表格本次渲染所需要的数据都给算出来（代码写得有点乱，有较大优化空间）
// todo 可以考虑下将 header 部分的计算逻辑也放到这个文件中，目前应该有一些重复的计算逻辑
function calculateRenderInfo(table) {
    const { offsetX, maxRenderWidth } = table.state;
    const { useVirtual: useVirtualProp, columns: columnsProp, dataSource: dataSourceProp, defaultColumnWidth, } = table.props;
    const columns = processColumns(columnsProp, defaultColumnWidth);
    const leftNestedLockCount = getLeftNestedLockCount(columns);
    const fullFlat = collectNodes(columns, 'leaf-only');
    let flat;
    let nested;
    let useVirtual;
    if (leftNestedLockCount === columns.length) {
        flat = { left: [], right: [], full: fullFlat, center: fullFlat };
        nested = { left: [], right: [], full: columns, center: columns };
        useVirtual = { horizontal: false, vertical: false, header: false };
    }
    else {
        const leftNested = columns.slice(0, leftNestedLockCount);
        const rightNestedLockCount = getLeftNestedLockCount(columns.slice().reverse());
        const centerNested = columns.slice(leftNestedLockCount, columns.length - rightNestedLockCount);
        const rightNested = columns.slice(columns.length - rightNestedLockCount);
        const shouldEnableHozVirtual = fullFlat.length >= AUTO_VIRTUAL_THRESHOLD && fullFlat.every((col) => col.width != null);
        const shouldEnableVerVirtual = dataSourceProp.length >= AUTO_VIRTUAL_THRESHOLD;
        useVirtual = {
            horizontal: resolveVirtualEnabled(typeof useVirtualProp === 'object' ? useVirtualProp.horizontal : useVirtualProp, shouldEnableHozVirtual),
            vertical: resolveVirtualEnabled(typeof useVirtualProp === 'object' ? useVirtualProp.vertical : useVirtualProp, shouldEnableVerVirtual),
            header: resolveVirtualEnabled(typeof useVirtualProp === 'object' ? useVirtualProp.header : useVirtualProp, false),
        };
        flat = {
            left: collectNodes(leftNested, 'leaf-only'),
            full: fullFlat,
            right: collectNodes(rightNested, 'leaf-only'),
            center: collectNodes(centerNested, 'leaf-only'),
        };
        nested = {
            left: leftNested,
            full: columns,
            right: rightNested,
            center: centerNested,
        };
    }
    const horizontalRenderRange = getHorizontalRenderRange({ maxRenderWidth, offsetX, useVirtual, flat });
    const verticalRenderRange = table.getVerticalRenderRange(useVirtual);
    const { leftBlank, leftIndex, rightBlank, rightIndex } = horizontalRenderRange;
    const unfilteredVisibleColumnDescriptors = [
        ...flat.left.map((col, i) => ({ type: 'normal', col, colIndex: i })),
        leftBlank > 0 && { type: 'blank', blankSide: 'left', width: leftBlank },
        ...flat.center
            .slice(leftIndex, rightIndex)
            .map((col, i) => ({ type: 'normal', col, colIndex: flat.left.length + leftIndex + i })),
        rightBlank > 0 && { type: 'blank', blankSide: 'right', width: rightBlank },
        ...flat.right.map((col, i) => ({ type: 'normal', col, colIndex: flat.full.length - flat.right.length + i })),
    ];
    const visibleColumnDescriptors = unfilteredVisibleColumnDescriptors.filter(Boolean);
    const fullFlatCount = flat.full.length;
    const leftFlatCount = flat.left.length;
    const rightFlatCount = flat.right.length;
    const stickyLeftMap = new Map();
    let stickyLeft = 0;
    for (let i = 0; i < leftFlatCount; i++) {
        stickyLeftMap.set(i, stickyLeft);
        stickyLeft += flat.full[i].width;
    }
    const stickyRightMap = new Map();
    let stickyRight = 0;
    for (let i = 0; i < rightFlatCount; i++) {
        stickyRightMap.set(fullFlatCount - 1 - i, stickyRight);
        stickyRight += flat.full[fullFlatCount - 1 - i].width;
    }
    const leftLockTotalWidth = sum(flat.left.map((col) => col.width));
    const rightLockTotalWidth = sum(flat.right.map((col) => col.width));
    return {
        horizontalRenderRange,
        verticalRenderRange,
        visible: visibleColumnDescriptors,
        flat,
        nested,
        useVirtual,
        stickyLeftMap,
        stickyRightMap,
        leftLockTotalWidth,
        rightLockTotalWidth,
        hasLockColumn: nested.left.length > 0 || nested.right.length > 0,
    };
}

function Colgroup({ descriptors }) {
    return (React.createElement("colgroup", null, descriptors.map((descriptor) => {
        if (descriptor.type === 'blank') {
            return React.createElement("col", { key: descriptor.blankSide, style: { width: descriptor.width } });
        }
        return React.createElement("col", { key: descriptor.colIndex, style: { width: descriptor.col.width } });
    })));
}

const LOCK_SHADOW_PADDING = 20;
const prefix = 'art-';
const Classes = {
    /** BaseTable 表格组件的外层包裹 div */
    artTableWrapper: `${prefix}table-wrapper`,
    artTable: `${prefix}table`,
    tableHeader: `${prefix}table-header`,
    tableBody: `${prefix}table-body`,
    tableFooter: `${prefix}table-footer`,
    /** 表格行 */
    tableRow: `${prefix}table-row`,
    /** 表头行 */
    tableHeaderRow: `${prefix}table-header-row`,
    /** 单元格 */
    tableCell: `${prefix}table-cell`,
    /** 表头的单元格 */
    tableHeaderCell: `${prefix}table-header-cell`,
    virtualBlank: `${prefix}virtual-blank`,
    stickyScroll: `${prefix}sticky-scroll`,
    stickyScrollItem: `${prefix}sticky-scroll-item`,
    horizontalScrollContainer: `${prefix}horizontal-scroll-container`,
    lockShadowMask: `${prefix}lock-shadow-mask`,
    lockShadow: `${prefix}lock-shadow`,
    leftLockShadow: `${prefix}left-lock-shadow`,
    rightLockShadow: `${prefix}right-lock-shadow`,
    /** 数据为空时表格内容的外层 div */
    emptyWrapper: `${prefix}empty-wrapper`,
    loadingWrapper: `${prefix}loading-wrapper`,
    loadingIndicatorWrapper: `${prefix}loading-indicator-wrapper`,
    loadingIndicator: `${prefix}loading-indicator`,
};
const Z = {
    lock: 5,
    header: 15,
    footer: 10,
    lockShadow: 20,
    scrollItem: 30,
    loadingIndicator: 40,
};
const outerBorderStyleMixin = css `
  border-top: var(--cell-border-horizontal);
  border-right: var(--cell-border-vertical);
  border-bottom: var(--cell-border-horizontal);
  border-left: var(--cell-border-vertical);

  td.first,
  th.first {
    border-left: none;
  }
  td.last,
  th.last {
    border-right: none;
  }

  thead tr.first th,
  tbody tr.first td {
    border-top: none;
  }
  &.has-footer tfoot tr.last td {
    border-bottom: none;
  }
  &:not(.has-footer) tbody tr.last td {
    border-bottom: none;
  }
`;
const StyledArtTableWrapper = styled__default.div `
  --row-height: 48px;
  --color: #333;
  --bgcolor: white;
  --hover-bgcolor: var(--hover-color, #f5f5f5);
  --highlight-bgcolor: #eee;

  --header-row-height: 32px;
  --header-color: #5a6c84;
  --header-bgcolor: #e9edf2;
  --header-hover-bgcolor: #ddd;
  --header-highlight-bgcolor: #e4e8ed;

  --cell-padding: 8px 12px;
  --font-size: 12px;
  --line-height: 1.28571;
  --lock-shadow: rgba(152, 152, 152, 0.5) 0 0 6px 2px;

  --border-color: #dfe3e8;
  --cell-border: 1px solid var(--border-color);
  --cell-border-horizontal: var(--cell-border);
  --cell-border-vertical: var(--cell-border);
  --header-cell-border: 1px solid var(--border-color);
  --header-cell-border-horizontal: var(--header-cell-border);
  --header-cell-border-vertical: var(--header-cell-border);

  box-sizing: border-box;
  * {
    box-sizing: border-box;
  }
  cursor: default;
  color: var(--color);
  font-size: var(--font-size);
  line-height: var(--line-height);
  position: relative;
  overflow-anchor: none;

  // 表格外边框由 art-table-wrapper 提供，而不是由单元格提供
  &.use-outer-border {
    ${outerBorderStyleMixin};
  }

  .no-scrollbar {
    // firefox 中移除滚动条
    scrollbar-width: none;

    // 其他浏览器中移除滚动条
    ::-webkit-scrollbar {
      display: none;
    }
  }

  .${Classes.tableHeader} {
    overflow-x: auto;
    overflow-y: hidden;
    background: var(--header-bgcolor);
  }

  .${Classes.tableBody}, .${Classes.tableFooter} {
    overflow-x: auto;
    overflow-y: hidden;
    background: var(--bgcolor);
  }

  &.sticky-header .${Classes.tableHeader} {
    position: sticky;
    top: 0;
    z-index: ${Z.header};
  }

  &.sticky-footer .${Classes.tableFooter} {
    position: sticky;
    bottom: 0;
    z-index: ${Z.footer};
  }

  table {
    width: 100%;
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 0;
    display: table;
    margin: 0;
    padding: 0;
  }

  // 在 tr 上设置 .no-hover 可以禁用鼠标悬停效果
  tr:not(.no-hover):hover > td {
    background: var(--hover-bgcolor);
  }
  // 在 tr 设置 highlight 可以为底下的 td 设置为高亮色
  // 而设置 .no-highlight 的话则可以禁用高亮效果；
  tr:not(.no-highlight).highlight > td {
    background: var(--highlight-bgcolor);
  }

  th {
    font-weight: normal;
    text-align: left;
    padding: var(--cell-padding);
    height: var(--header-row-height);
    color: var(--header-color);
    background: var(--header-bgcolor);
    border: none;
    border-right: var(--header-cell-border-vertical);
    border-bottom: var(--header-cell-border-horizontal);
  }
  tr.first th {
    border-top: var(--header-cell-border-horizontal);
  }
  th.first {
    border-left: var(--header-cell-border-vertical);
  }

  td {
    padding: var(--cell-padding);
    background: var(--bgcolor);
    height: var(--row-height);
    border: none;
    border-right: var(--cell-border-vertical);
    border-bottom: var(--cell-border-horizontal);
  }
  td.first {
    border-left: var(--cell-border-vertical);
  }
  tr.first td {
    border-top: var(--cell-border-horizontal);
  }
  &.has-header tbody tr.first td {
    border-top: none;
  }
  &.has-footer tbody tr.last td {
    border-bottom: none;
  }

  .lock-left,
  .lock-right {
    z-index: ${Z.lock};
  }

  //#region 锁列阴影
  .${Classes.lockShadowMask} {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: ${Z.lockShadow};
    pointer-events: none;
    overflow: hidden;

    .${Classes.lockShadow} {
      height: 100%;
    }

    .${Classes.leftLockShadow} {
      margin-right: ${LOCK_SHADOW_PADDING}px;
      box-shadow: none;

      &.show-shadow {
        box-shadow: var(--lock-shadow);
        border-right: var(--cell-border-vertical);
      }
    }

    .${Classes.rightLockShadow} {
      margin-left: ${LOCK_SHADOW_PADDING}px;
      box-shadow: none;

      &.show-shadow {
        box-shadow: var(--lock-shadow);
        border-left: var(--cell-border-vertical);
      }
    }
  }
  //#endregion

  //#region 空表格展现
  .${Classes.emptyWrapper} {
    pointer-events: none;
    color: #99a3b3;
    font-size: 12px;
    text-align: center;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);

    .empty-image {
      width: 50px;
      height: 50px;
    }

    .empty-tips {
      margin-top: 16px;
      line-height: 1.5;
    }
  }
  //#endregion

  //#region 粘性滚动条
  .${Classes.stickyScroll} {
    overflow: auto;
    position: sticky;
    bottom: 0;
    z-index: ${Z.scrollItem};
    margin-top: -17px;
  }

  .${Classes.stickyScrollItem} {
    // 必须有高度才能出现滚动条
    height: 1px;
    visibility: hidden;
  }
  //#endregion

  //#region 加载样式
  .${Classes.loadingWrapper} {
    position: relative;

    .${Classes.loadingIndicatorWrapper} {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      pointer-events: none;
    }

    .${Classes.loadingIndicator} {
      position: sticky;
      z-index: ${Z.loadingIndicator};
      transform: translateY(-50%);
    }
  }
  //#endregion
`;

const DefaultEmptyContent = React.memo(() => (React.createElement(React.Fragment, null,
    React.createElement("img", { alt: "empty-image", className: "empty-image", src: "https://img.alicdn.com/tfs/TB1l1LcM3HqK1RjSZJnXXbNLpXa-50-50.svg" }),
    React.createElement("div", { className: "empty-tips" },
        "\u6CA1\u6709\u7B26\u5408\u67E5\u8BE2\u6761\u4EF6\u7684\u6570\u636E",
        React.createElement("br", null),
        "\u8BF7\u4FEE\u6539\u6761\u4EF6\u540E\u91CD\u65B0\u67E5\u8BE2"))));
function EmptyHtmlTable({ descriptors, isLoading, emptyCellHeight, EmptyContent = DefaultEmptyContent, }) {
    const show = !isLoading;
    return (React.createElement("table", null,
        React.createElement(Colgroup, { descriptors: descriptors }),
        React.createElement("tbody", null,
            React.createElement("tr", { className: cx(Classes.tableRow, 'first', 'last', 'no-hover'), "data-rowindex": 0 },
                React.createElement("td", { className: cx(Classes.tableCell, 'first', 'last'), colSpan: descriptors.length, style: { height: emptyCellHeight !== null && emptyCellHeight !== void 0 ? emptyCellHeight : 200 } }, show && (React.createElement("div", { className: Classes.emptyWrapper },
                    React.createElement(EmptyContent, null))))))));
}

function range(n) {
    const array = [];
    for (let i = 0; i < n; i++) {
        array.push(i);
    }
    return array;
}
/** 根据当前横向虚拟滚动 对 nested.center 进行过滤，结果只保留当前视野内可见的那些列配置 */
function filterNestedCenter(centerNested, hoz, leftFlatCount) {
    return dfs(centerNested, leftFlatCount).filtered;
    function dfs(cols, startColIndex) {
        let leafCount = 0;
        const filtered = [];
        for (const col of cols) {
            const colIndex = startColIndex + leafCount;
            if (isLeafNode(col)) {
                leafCount += 1;
                if (leftFlatCount + hoz.leftIndex <= colIndex && colIndex < leftFlatCount + hoz.rightIndex) {
                    filtered.push({ colIndex, col });
                }
            }
            else {
                const dfsRes = dfs(col.children, colIndex);
                leafCount += dfsRes.leafCount;
                if (dfsRes.filtered.length > 0) {
                    filtered.push({ colIndex, col, children: dfsRes.filtered });
                }
            }
        }
        return { filtered, leafCount };
    }
}
/** 根据输入的 nested 列配置，算出相应的 leveled & flat 配置方便渲染 */
function calculateLeveledAndFlat(inputNested, rowCount) {
    const leveled = [];
    for (let depth = 0; depth < rowCount; depth++) {
        leveled.push([]);
    }
    const flat = [];
    dfs(inputNested, 0);
    return { flat, leveled };
    function dfs(input, depth) {
        let leafCount = 0;
        for (let i = 0; i < input.length; i++) {
            const indexedCol = input[i];
            if (isLeafNode(indexedCol)) {
                leafCount += 1;
                const wrapped = {
                    type: 'normal',
                    width: indexedCol.col.width,
                    col: indexedCol.col,
                    colIndex: indexedCol.colIndex,
                    colSpan: 1,
                    isLeaf: true,
                };
                leveled[depth].push(wrapped);
                flat.push(wrapped);
            }
            else {
                const dfsRes = dfs(indexedCol.children, depth + 1);
                leafCount += dfsRes.leafCount;
                if (dfsRes.leafCount > 0) {
                    leveled[depth].push({
                        type: 'normal',
                        width: indexedCol.col.width,
                        col: indexedCol.col,
                        colIndex: indexedCol.colIndex,
                        colSpan: dfsRes.leafCount,
                        isLeaf: false,
                    });
                }
            }
        }
        return { leafCount };
    }
}
/** 包装列配置，附加上 colIndex 属性 */
function attachColIndex(inputNested, colIndexOffset) {
    return dfs(inputNested, colIndexOffset).result;
    function dfs(input, startColIndex) {
        const result = [];
        let leafCount = 0;
        for (let i = 0; i < input.length; i++) {
            const col = input[i];
            const colIndex = startColIndex + leafCount;
            if (isLeafNode(col)) {
                leafCount += 1;
                result.push({ colIndex, col });
            }
            else {
                const sub = dfs(col.children, colIndex);
                leafCount += sub.leafCount;
                if (sub.leafCount > 0) {
                    result.push({ col, colIndex, children: sub.result });
                }
            }
        }
        return { result, leafCount };
    }
}
/** 计算用于渲染表头的数据结构 */
function calculateHeaderRenderInfo({ flat, nested, horizontalRenderRange: hoz, useVirtual }, rowCount) {
    if (useVirtual.header) {
        const leftPart = calculateLeveledAndFlat(attachColIndex(nested.left, 0), rowCount);
        const filtered = filterNestedCenter(nested.center, hoz, flat.left.length);
        const centerPart = calculateLeveledAndFlat(filtered, rowCount);
        const rightPart = calculateLeveledAndFlat(attachColIndex(nested.right, flat.left.length + flat.center.length), rowCount);
        return {
            flat: [
                ...leftPart.flat,
                { type: 'blank', width: hoz.leftBlank, blankSide: 'left' },
                ...centerPart.flat,
                { type: 'blank', width: hoz.rightBlank, blankSide: 'right' },
                ...rightPart.flat,
            ],
            leveled: range(rowCount).map((depth) => [
                ...leftPart.leveled[depth],
                { type: 'blank', width: hoz.leftBlank, blankSide: 'left' },
                ...centerPart.leveled[depth],
                { type: 'blank', width: hoz.rightBlank, blankSide: 'right' },
                ...rightPart.leveled[depth],
            ]),
        };
    }
    return calculateLeveledAndFlat(attachColIndex(nested.full, 0), rowCount);
}
function TableHeader({ info }) {
    const { nested, flat, stickyLeftMap, stickyRightMap } = info;
    const rowCount = getTreeDepth(nested.full) + 1;
    const headerRenderInfo = calculateHeaderRenderInfo(info, rowCount);
    const fullFlatCount = flat.full.length;
    const leftFlatCount = flat.left.length;
    const rightFlatCount = flat.right.length;
    const thead = headerRenderInfo.leveled.map((wrappedCols, level) => {
        const headerCells = wrappedCols.map((wrapped) => {
            var _a, _b;
            if (wrapped.type === 'normal') {
                const { colIndex, colSpan, isLeaf, col } = wrapped;
                const headerCellProps = (_a = col.headerCellProps) !== null && _a !== void 0 ? _a : {};
                const positionStyle = {};
                if (colIndex < leftFlatCount) {
                    positionStyle.position = 'sticky';
                    positionStyle.left = stickyLeftMap.get(colIndex);
                }
                else if (colIndex >= fullFlatCount - rightFlatCount) {
                    positionStyle.position = 'sticky';
                    positionStyle.right = stickyRightMap.get(colIndex + colSpan - 1);
                }
                return (React.createElement("th", Object.assign({ key: colIndex }, headerCellProps, { className: cx(Classes.tableHeaderCell, headerCellProps.className, {
                        first: colIndex === 0,
                        last: colIndex + colSpan === fullFlatCount,
                        'lock-left': colIndex < leftFlatCount,
                        'lock-right': colIndex >= fullFlatCount - rightFlatCount,
                    }), colSpan: colSpan, rowSpan: isLeaf ? rowCount - level : undefined, style: Object.assign(Object.assign({ textAlign: col.align }, headerCellProps.style), positionStyle) }), (_b = col.title) !== null && _b !== void 0 ? _b : col.name));
            }
            else {
                if (wrapped.width > 0) {
                    return React.createElement("th", { key: wrapped.blankSide });
                }
                else {
                    return null;
                }
            }
        });
        return (React.createElement("tr", { key: level, className: cx(Classes.tableHeaderRow, {
                first: level === 0,
                last: level === rowCount - 1,
            }) }, headerCells));
    });
    return (React.createElement("table", null,
        React.createElement("colgroup", null, headerRenderInfo.flat.map((wrapped) => {
            if (wrapped.type === 'blank') {
                if (wrapped.width > 0) {
                    return React.createElement("col", { key: wrapped.blankSide, style: { width: wrapped.width } });
                }
                else {
                    return null;
                }
            }
            else {
                return React.createElement("col", { key: wrapped.colIndex, style: { width: wrapped.width } });
            }
        })),
        React.createElement("thead", null, thead)));
}

function getNodeName(element) {
  return element ? (element.nodeName || '').toLowerCase() : null;
}

function getWindow(node) {
  if (node == null) {
    return window;
  }

  if (node.toString() !== '[object Window]') {
    var ownerDocument = node.ownerDocument;
    return ownerDocument ? ownerDocument.defaultView || window : window;
  }

  return node;
}

function getComputedStyle(element) {
  return getWindow(element).getComputedStyle(element);
}

function isElement(node) {
  var OwnElement = getWindow(node).Element;
  return node instanceof OwnElement || node instanceof Element;
}

function isHTMLElement(node) {
  var OwnElement = getWindow(node).HTMLElement;
  return node instanceof OwnElement || node instanceof HTMLElement;
}

function isShadowRoot(node) {
  // IE 11 has no ShadowRoot
  if (typeof ShadowRoot === 'undefined') {
    return false;
  }

  var OwnElement = getWindow(node).ShadowRoot;
  return node instanceof OwnElement || node instanceof ShadowRoot;
}

function isTableElement(element) {
  return ['table', 'td', 'th'].indexOf(getNodeName(element)) >= 0;
}

function getDocumentElement(element) {
  // $FlowFixMe[incompatible-return]: assume body is always available
  return ((isElement(element) ? element.ownerDocument : // $FlowFixMe[prop-missing]
  element.document) || window.document).documentElement;
}

function getParentNode(element) {
  if (getNodeName(element) === 'html') {
    return element;
  }

  return (// this is a quicker (but less type safe) way to save quite some bytes from the bundle
    // $FlowFixMe[incompatible-return]
    // $FlowFixMe[prop-missing]
    element.assignedSlot || // step into the shadow DOM of the parent of a slotted node
    element.parentNode || ( // DOM Element detected
    isShadowRoot(element) ? element.host : null) || // ShadowRoot detected
    // $FlowFixMe[incompatible-call]: HTMLElement is a Node
    getDocumentElement(element) // fallback

  );
}

function getTrueOffsetParent(element) {
  if (!isHTMLElement(element) || // https://github.com/popperjs/popper-core/issues/837
  getComputedStyle(element).position === 'fixed') {
    return null;
  }

  return element.offsetParent;
} // `.offsetParent` reports `null` for fixed elements, while absolute elements
// return the containing block


function getContainingBlock(element) {
  var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') !== -1;
  var isIE = navigator.userAgent.indexOf('Trident') !== -1;

  if (isIE && isHTMLElement(element)) {
    // In IE 9, 10 and 11 fixed elements containing block is always established by the viewport
    var elementCss = getComputedStyle(element);

    if (elementCss.position === 'fixed') {
      return null;
    }
  }

  var currentNode = getParentNode(element);

  while (isHTMLElement(currentNode) && ['html', 'body'].indexOf(getNodeName(currentNode)) < 0) {
    var css = getComputedStyle(currentNode); // This is non-exhaustive but covers the most common CSS properties that
    // create a containing block.
    // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block

    if (css.transform !== 'none' || css.perspective !== 'none' || css.contain === 'paint' || ['transform', 'perspective'].indexOf(css.willChange) !== -1 || isFirefox && css.willChange === 'filter' || isFirefox && css.filter && css.filter !== 'none') {
      return currentNode;
    } else {
      currentNode = currentNode.parentNode;
    }
  }

  return null;
} // Gets the closest ancestor positioned element. Handles some edge cases,
// such as table ancestors and cross browser bugs.


function getOffsetParent(element) {
  var window = getWindow(element);
  var offsetParent = getTrueOffsetParent(element);

  while (offsetParent && isTableElement(offsetParent) && getComputedStyle(offsetParent).position === 'static') {
    offsetParent = getTrueOffsetParent(offsetParent);
  }

  if (offsetParent && (getNodeName(offsetParent) === 'html' || getNodeName(offsetParent) === 'body' && getComputedStyle(offsetParent).position === 'static')) {
    return window;
  }

  return offsetParent || getContainingBlock(element) || window;
}

function getWindowScroll(node) {
  var win = getWindow(node);
  var scrollLeft = win.pageXOffset;
  var scrollTop = win.pageYOffset;
  return {
    scrollLeft: scrollLeft,
    scrollTop: scrollTop
  };
}

function isScrollParent(element) {
  // Firefox wants us to check `-x` and `-y` variations as well
  var _getComputedStyle = getComputedStyle(element),
      overflow = _getComputedStyle.overflow,
      overflowX = _getComputedStyle.overflowX,
      overflowY = _getComputedStyle.overflowY;

  return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX);
}

function isWindow(arg) {
    return arg.toString() === '[object Window]' || arg.toString() === '[object global]';
}
function isBody(arg) {
    return getNodeName(arg) === 'body';
}
function isHtml(arg) {
    return getNodeName(arg) === 'html';
}
function isHtmlOrBody(arg) {
    return isHtml(arg) || isBody(arg);
}
// 计算从 start（子元素）到 stop（祖先元素）之间所有元素的 scrollTop 或 scrollLeft 的和
// 注意 start 和 stop 都是 INCLUSIVE 的，即两者的 scrollTop 或 scrollLeft 都会统计在内
function accumulateScrollOffset(start, stop, scrollOffsetKey) {
    let result = 0;
    let elem = start;
    while (elem != null) {
        result += elem[scrollOffsetKey];
        if (elem === stop || (isWindow(stop) && isHtmlOrBody(elem))) {
            break;
        }
        elem = elem.parentElement;
    }
    if (isWindow(stop)) {
        result += getWindowScroll(elem)[scrollOffsetKey];
    }
    return result;
}
/**
 * 获取 target 相对于 base 的布局大小和相对位置。
 * 注意该方法会考虑滚动所带来的影响
 */
function getRelativeLayoutRect(base, target) {
    if (isWindow(target) || isHtmlOrBody(target)) {
        return {
            left: 0,
            right: window.innerWidth,
            top: 0,
            bottom: window.innerHeight,
        };
    }
    let deltaX = 0;
    let deltaY = 0;
    let elem = target;
    while (elem != null && elem != base) {
        deltaY += elem.offsetTop;
        deltaX += elem.offsetLeft;
        const offsetParent = getOffsetParent(elem);
        deltaY -= accumulateScrollOffset(elem.parentElement, offsetParent, 'scrollTop');
        deltaX -= accumulateScrollOffset(elem.parentElement, offsetParent, 'scrollLeft');
        if (isWindow(offsetParent)) {
            break;
        }
        deltaY += offsetParent.clientTop;
        deltaX += offsetParent.clientLeft;
        elem = offsetParent;
    }
    return {
        top: deltaY,
        bottom: deltaY + target.offsetHeight,
        left: deltaX,
        right: deltaX + target.offsetWidth,
    };
}
function findCommonOffsetAncestor(target, scrollParent) {
    if (isWindow(scrollParent)) {
        return scrollParent;
    }
    const offsetParents = listOffsetParents(target);
    if (offsetParents.includes(scrollParent)) {
        return scrollParent;
    }
    return getOffsetParent(scrollParent);
}
// 列出 target 元素上层的所有 offset parents
function listOffsetParents(target) {
    const result = [];
    let elem = target;
    while (true) {
        if (isWindow(elem)) {
            break;
        }
        elem = getOffsetParent(elem);
        result.push(elem);
    }
    return result;
}
function fromScrollEvent(element) {
    return fromEvent(element, 'scroll', { passive: true });
}
function fromResizeEvent(element) {
    if (isWindow(element)) {
        return fromEvent(element, 'resize', { passive: true });
    }
    return new Observable((subscriber) => {
        const resizeObserver = new ResizeObserver((entries) => {
            subscriber.next(entries);
        });
        resizeObserver.observe(element);
        return () => {
            resizeObserver.disconnect();
        };
    });
}
function getScrollParent(elem) {
    if (['html', 'body', '#document'].includes(getNodeName(elem))) {
        return getWindow(elem);
    }
    if (isHTMLElement(elem) && isScrollParent(elem)) {
        return elem;
    }
    return getScrollParent(getParentNode(elem));
}
// 获取 target 相对于「它的滚动父元素」的可见部分的大小与位置
function getRichVisibleRectsStream(target, structureMayChange$, virtualDebugLabel) {
    return structureMayChange$.pipe(op.startWith('init'), op.map(() => {
        // target 的第一个滚动父元素，我们认为这就是虚拟滚动发生的地方
        // 即虚拟滚动不考虑「更上层元素发生滚动」的情况
        const scrollParent = getScrollParent(target);
        // target 和 scrollParent 的共同 offset 祖先，作为布局尺寸计算时的参照元素
        const commonOffsetAncestor = findCommonOffsetAncestor(target, scrollParent);
        return { scrollParent, commonOffsetAncestor };
    }), op.distinctUntilChanged(shallowEqual), op.tap((structure) => {
        if (virtualDebugLabel) {
            console.log(`%c[ali-react-table STRUCTURE ${virtualDebugLabel}]`, 'color: #4f9052; font-weight: bold', '\ntarget:', target, '\nscrollParent:', structure.scrollParent, '\ncommonOffsetAncestor:', structure.commonOffsetAncestor);
        }
    }), op.switchMap(({ scrollParent, commonOffsetAncestor }) => {
        const events$ = merge(fromScrollEvent(scrollParent), fromResizeEvent(scrollParent), fromResizeEvent(target));
        return events$.pipe(op.map((event) => ({
            targetRect: getRelativeLayoutRect(commonOffsetAncestor, target),
            scrollParentRect: getRelativeLayoutRect(commonOffsetAncestor, scrollParent),
            event,
        })), op.map(({ event, scrollParentRect, targetRect }) => ({
            event,
            targetRect,
            scrollParentRect,
            offsetY: Math.max(0, scrollParentRect.top - targetRect.top),
            // 表格的横向滚动总是发生在表格内部，所以这里不需要计算 offsetX
            // offsetX: Math.max(0, scrollParentRect.left - targetRect.left),
            clipRect: {
                left: Math.max(targetRect.left, scrollParentRect.left),
                top: Math.max(targetRect.top, scrollParentRect.top),
                right: Math.min(targetRect.right, scrollParentRect.right),
                bottom: Math.min(targetRect.bottom, scrollParentRect.bottom),
            },
        })));
    }), op.tap((rects) => {
        if (virtualDebugLabel) {
            console.log(`%c[ali-react-table RECTS ${virtualDebugLabel}]`, 'color: #4f9052; font-weight: bold', '\noffsetY:', rects.offsetY, '\ntargetRect:', rects.targetRect, '\nscrollParentRect:', rects.scrollParentRect, '\nclipRect:', rects.clipRect, '\nevent:', rects.event);
        }
    }));
}

function getFullRenderRange(rowCount) {
    return {
        topIndex: 0,
        topBlank: 0,
        bottomIndex: rowCount,
        bottomBlank: 0,
    };
}
function makeRowHeightManager(initRowCount, estimatedRowHeight) {
    const cache = new Array(initRowCount).fill(estimatedRowHeight);
    function getRenderRange(offset, maxRenderHeight, rowCount) {
        if (cache.length !== rowCount) {
            setRowCount(rowCount);
        }
        if (maxRenderHeight <= 0) {
            // maxRenderHeight <= 0 说明表格目前在 viewport 之外
            if (offset <= 0) {
                // 表格在 viewport 下方
                return getRenderRangeWhenBelowView();
            }
            else {
                // 表格在 viewport 上方
                return getRenderRangeWhenAboveView();
            }
        }
        else {
            // 表格与 viewport 相交
            return getRenderRangeWhenInView();
        }
        function getRenderRangeWhenBelowView() {
            const start = { topIndex: 0, topBlank: 0 };
            const end = getEnd(0, start);
            return Object.assign(Object.assign({}, start), end);
        }
        function getRenderRangeWhenAboveView() {
            const totalSize = getEstimatedTotalSize(rowCount);
            const start = getStart(totalSize);
            const end = getEnd(totalSize, start);
            return Object.assign(Object.assign({}, start), end);
        }
        function getRenderRangeWhenInView() {
            const start = getStart(offset);
            const end = getEnd(offset + maxRenderHeight, start);
            return Object.assign(Object.assign({}, start), end);
        }
        /** 获取虚拟滚动在 开始位置上的信息 */
        function getStart(offset) {
            if (cache.length === 0) {
                return { topIndex: 0, topBlank: 0 };
            }
            let topIndex = 0;
            let topBlank = 0;
            while (topIndex < cache.length) {
                const h = cache[topIndex];
                if (topBlank + h >= offset) {
                    break;
                }
                topBlank += h;
                topIndex += 1;
            }
            return overscanUpwards(topIndex, topBlank);
        }
        function overscanUpwards(topIndex, topBlank) {
            let overscanSize = 0;
            let overscanCount = 0;
            while (overscanCount < topIndex && overscanSize < OVERSCAN_SIZE) {
                overscanCount += 1;
                overscanSize += cache[topIndex - overscanCount];
            }
            return {
                topIndex: topIndex - overscanCount,
                topBlank: topBlank - overscanSize,
            };
        }
        /** 获取虚拟滚动 在结束位置上的信息 */
        function getEnd(endOffset, startInfo) {
            let bottomIndex = startInfo.topIndex;
            let offset = startInfo.topBlank;
            while (bottomIndex < rowCount && offset < endOffset) {
                offset += cache[bottomIndex];
                bottomIndex += 1;
            }
            const bottomBlank = getEstimatedTotalSize(rowCount) - offset;
            return overscanDownwards(bottomIndex, bottomBlank);
        }
        function overscanDownwards(bottomIndex, bottomBlank) {
            let overscanSize = 0;
            let overscanCount = 0;
            while (overscanCount < rowCount - bottomIndex && overscanSize < OVERSCAN_SIZE) {
                overscanSize += cache[bottomIndex + overscanCount];
                overscanCount += 1;
            }
            return {
                bottomIndex: bottomIndex + overscanCount,
                bottomBlank: bottomBlank - overscanSize,
            };
        }
        function getEstimatedTotalSize(rowCount) {
            return sum(cache) + (rowCount - cache.length) * estimatedRowHeight;
        }
        function setRowCount(count) {
            // 将 cache 的长度设置为 count
            if (count < cache.length) {
                cache.length = count;
            }
            else {
                const prevSize = cache.length;
                cache.length = count;
                cache.fill(estimatedRowHeight, prevSize);
            }
        }
    }
    function updateRow(index, offset, size) {
        cache[index] = size;
    }
    return {
        getRenderRange,
        updateRow,
        // 导出 cache，方便调试；上层在实际使用时 并不需要使用 cache 字段
        cache,
    };
}

// 表格 DOM 结构
// div.art-table-wrapper
// └── div.art-loading-wrapper
//     ├── div.art-loading-indicator-wrapper
//     │   └── div.art-loading-indicator
//     │
//     └── div.art-loading-content-wrapper
//         ├── div.art-table
//         │   │
//         │   ├── div.art-table-header
//         │   │  └── table
//         │   │      ├── colgroup
//         │   │      └── thead  注意这里会出现自定义内容，可能存在嵌套表格
//         │   │
//         │   ├── div.art-table-body
//         │   │   ├── div.art-virtual-blank.top
//         │   │   ├── table
//         │   │   │   ├── colgroup
//         │   │   │   └── tbody 注意这里会出现自定义内容，可能存在嵌套表格
//         │   │   └── div.art-virtual-blank.bottom
//         │   │
//         │   ├── div.art-table-footer
//         │   │  └── table
//         │   │      ├── colgroup
//         │   │      └── tfoot  注意这里会出现自定义内容，可能存在嵌套表格
//         │   │
//         │   ├── div.art-lock-shadow-mask
//         │   │   └── div.art-left-lock-shadow
//         │   └── div.art-lock-shadow-mask
//         │       └── div.art-right-lock-shadow
//         │
//         └── div.art-sticky-scroll
//             └── div.art-sticky-scroll-item
//
// 在「可能存在嵌套表格」的情况下，我们可以采用以下的方式来避免「querySelector 不小心获取到了的嵌套表格上的元素」：
//  artTable.querySelector(':scope > .art-lock-shadow-mask .art-left-lock-shadow')
// 表格 DOM 结构辅助工具
class TableDOMHelper {
    constructor(artTableWrapper) {
        this.artTableWrapper = artTableWrapper;
        this.artTable = artTableWrapper.querySelector(`.${Classes.artTable}`);
        this.tableHeader = this.artTable.querySelector(`:scope > .${Classes.tableHeader}`);
        this.tableBody = this.artTable.querySelector(`:scope > .${Classes.tableBody}`);
        this.tableFooter = this.artTable.querySelector(`:scope > .${Classes.tableFooter}`);
        const stickyScrollSelector = `.${Classes.artTable} + .${Classes.stickyScroll}`;
        this.stickyScroll = artTableWrapper.querySelector(stickyScrollSelector);
        this.stickyScrollItem = this.stickyScroll.querySelector(`.${Classes.stickyScrollItem}`);
    }
    getVirtualTop() {
        return this.tableBody.querySelector(`.${Classes.virtualBlank}.top`);
    }
    getTableRows() {
        const htmlTable = this.getTableBodyHtmlTable();
        return htmlTable.querySelectorAll(`:scope > tbody > .${Classes.tableRow}`);
    }
    getTableBodyHtmlTable() {
        return this.artTable.querySelector(`.${Classes.tableBody} table`);
    }
    getLeftLockShadow() {
        const selector = `:scope > .${Classes.lockShadowMask} .${Classes.leftLockShadow}`;
        return this.artTable.querySelector(selector);
    }
    getRightLockShadow() {
        const selector = `:scope > .${Classes.lockShadowMask} .${Classes.rightLockShadow}`;
        return this.artTable.querySelector(selector);
    }
    getLoadingIndicator() {
        return this.artTableWrapper.querySelector(`.${Classes.loadingIndicator}`);
    }
}

function HtmlTable({ tbodyHtmlTag, getRowProps, primaryKey, data, verticalRenderInfo: verInfo, horizontalRenderInfo: hozInfo, components: { Row, Cell, TableBody }, }) {
    const { flat, horizontalRenderRange: hoz } = hozInfo;
    const spanManager = new SpanManager();
    const fullFlatCount = flat.full.length;
    const leftFlatCount = flat.left.length;
    const rightFlatCount = flat.right.length;
    const tbody = TableBody != null && tbodyHtmlTag === 'tbody' ? (React.createElement(TableBody, { tbodyProps: { children: data.map(renderRow) } })) : (React.createElement(tbodyHtmlTag, null, data.map(renderRow)));
    return (React.createElement("table", null,
        React.createElement(Colgroup, { descriptors: hozInfo.visible }),
        tbody));
    function renderRow(row, i) {
        const rowIndex = verInfo.offset + i;
        spanManager.stripUpwards(rowIndex);
        const rowProps = getRowProps(row, rowIndex);
        const rowClass = cx(Classes.tableRow, {
            first: rowIndex === verInfo.first,
            last: rowIndex === verInfo.last,
            even: rowIndex % 2 === 0,
            odd: rowIndex % 2 === 1,
        }, rowProps === null || rowProps === void 0 ? void 0 : rowProps.className);
        const trProps = Object.assign(Object.assign({}, rowProps), { className: rowClass, 'data-rowindex': rowIndex, children: hozInfo.visible.map((descriptor) => {
                if (descriptor.type === 'blank') {
                    return React.createElement("td", { key: descriptor.blankSide });
                }
                return renderBodyCell(row, rowIndex, descriptor.col, descriptor.colIndex);
            }) });
        const key = internals.safeGetRowKey(primaryKey, row, rowIndex);
        if (Row != null && tbodyHtmlTag === 'tbody') {
            return React.createElement(Row, { key, row, rowIndex, trProps });
        }
        else {
            return React.createElement("tr", Object.assign({ key: key }, trProps));
        }
    }
    function renderBodyCell(row, rowIndex, column, colIndex) {
        var _a, _b;
        if (spanManager.testSkip(rowIndex, colIndex)) {
            return null;
        }
        const value = internals.safeGetValue(column, row, rowIndex);
        const cellProps = (_b = (_a = column.getCellProps) === null || _a === void 0 ? void 0 : _a.call(column, value, row, rowIndex)) !== null && _b !== void 0 ? _b : {};
        let cellContent = value;
        if (column.render) {
            cellContent = column.render(value, row, rowIndex);
        }
        let colSpan = 1;
        let rowSpan = 1;
        if (column.getSpanRect) {
            const spanRect = column.getSpanRect(value, row, rowIndex);
            colSpan = spanRect == null ? 1 : spanRect.right - colIndex;
            rowSpan = spanRect == null ? 1 : spanRect.bottom - rowIndex;
        }
        else {
            if (cellProps.colSpan != null) {
                colSpan = cellProps.colSpan;
            }
            if (cellProps.rowSpan != null) {
                rowSpan = cellProps.rowSpan;
            }
        }
        // rowSpan/colSpan 不能过大，避免 rowSpan/colSpan 影响因虚拟滚动而未渲染的单元格
        rowSpan = Math.min(rowSpan, verInfo.limit - rowIndex);
        colSpan = Math.min(colSpan, leftFlatCount + hoz.rightIndex - colIndex);
        const hasSpan = colSpan > 1 || rowSpan > 1;
        if (hasSpan) {
            spanManager.add(rowIndex, colIndex, colSpan, rowSpan);
        }
        const positionStyle = {};
        if (colIndex < leftFlatCount) {
            positionStyle.position = 'sticky';
            positionStyle.left = hozInfo.stickyLeftMap.get(colIndex);
        }
        else if (colIndex >= fullFlatCount - rightFlatCount) {
            positionStyle.position = 'sticky';
            positionStyle.right = hozInfo.stickyRightMap.get(colIndex);
        }
        const tdProps = Object.assign(Object.assign(Object.assign(Object.assign({}, cellProps), { className: cx(Classes.tableCell, cellProps.className, {
                first: colIndex === 0,
                last: colIndex + colSpan === fullFlatCount,
                'lock-left': colIndex < leftFlatCount,
                'lock-right': colIndex >= fullFlatCount - rightFlatCount,
            }) }), (hasSpan ? { colSpan, rowSpan } : null)), { style: Object.assign(Object.assign({ textAlign: column.align }, cellProps.style), positionStyle), children: cellContent });
        if (Cell != null && tbodyHtmlTag === 'tbody') {
            return React.createElement(Cell, { key: colIndex, tdProps: tdProps, row: row, rowIndex: rowIndex, column: column, colIndex: colIndex });
        }
        else {
            return React.createElement("td", Object.assign({ key: colIndex }, tdProps));
        }
    }
}

const DefaultLoadingIcon = React.memo(() => (React.createElement("svg", { style: { margin: 'auto', display: 'block', width: 40, height: 40 }, viewBox: "0 0 100 100", preserveAspectRatio: "xMidYMid" },
    React.createElement("circle", { cx: "50", cy: "50", r: "40", fill: "none", stroke: "#23a7fa", strokeDasharray: "188 64", strokeLinecap: "round", strokeWidth: "10" },
        React.createElement("animateTransform", { attributeName: "transform", dur: "1.5s", keyTimes: "0;1", repeatCount: "indefinite", type: "rotate", values: "0 50 50;360 50 50" })))));
function DefaultLoadingContentWrapper({ children, visible }) {
    return (React.createElement("div", { className: "art-loading-content-wrapper", style: { filter: visible ? 'blur(1px)' : 'none' } }, children));
}
function Loading({ visible, children, LoadingContentWrapper = DefaultLoadingContentWrapper, LoadingIcon = DefaultLoadingIcon, }) {
    return (React.createElement("div", { className: Classes.loadingWrapper },
        visible && (React.createElement("div", { className: Classes.loadingIndicatorWrapper },
            React.createElement("div", { className: Classes.loadingIndicator },
                React.createElement(LoadingIcon, null)))),
        React.createElement(LoadingContentWrapper, { visible: visible, children: children })));
}

let emptyContentDeprecatedWarned = false;
function warnEmptyContentIsDeprecated() {
    if (!emptyContentDeprecatedWarned) {
        emptyContentDeprecatedWarned = true;
        console.warn('[ali-react-table-dist] BaseTable props.emptyContent 已经过时，请使用 props.components.EmptyContent 来自定义数据为空时的表格表现');
    }
}
let flowRootDeprecatedWarned = false;
function warnFlowRootIsDeprecated() {
    if (!flowRootDeprecatedWarned) {
        flowRootDeprecatedWarned = true;
        console.warn('[ali-react-table-dist] BaseTable v2.4 版本之后已经不再需要指定 flowRoot');
    }
}
class BaseTable extends React.Component {
    constructor(props) {
        super(props);
        this.rowHeightManager = makeRowHeightManager(this.props.dataSource.length, this.props.estimatedRowHeight);
        this.artTableWrapperRef = React.createRef();
        this.rootSubscription = new Subscription();
        this.state = {
            hasScroll: true,
            needRenderLock: true,
            offsetY: 0,
            offsetX: 0,
            // 因为 ResizeObserver 在一开始总是会调用一次所提供的回调函数
            // 故这里为 maxRenderHeight/maxRenderWidth 设置一个默认值即可（因为这两个默认值很快就会被覆盖）
            // https://stackoverflow.com/questions/60026223/does-resizeobserver-invokes-initially-on-page-load
            maxRenderHeight: 600,
            maxRenderWidth: 800,
        };
    }
    /** @deprecated BaseTable.getDoms() 已经过时，请勿调用 */
    getDoms() {
        console.warn('[ali-react-table-dist] BaseTable.getDoms() 已经过时');
        return this.domHelper;
    }
    /** 自定义滚动条宽度为table宽度，使滚动条滑块宽度相同 */
    updateStickyScroll() {
        const { stickyScroll, artTable, stickyScrollItem } = this.domHelper;
        if (!artTable) {
            return;
        }
        const tableBodyHtmlTable = this.domHelper.getTableBodyHtmlTable();
        const innerTableWidth = tableBodyHtmlTable.offsetWidth;
        const artTableWidth = artTable.offsetWidth;
        const stickyScrollHeightProp = this.props.stickyScrollHeight;
        const stickyScrollHeight = stickyScrollHeightProp === 'auto' ? getScrollbarSize().height : stickyScrollHeightProp;
        stickyScroll.style.marginTop = `-${stickyScrollHeight + 1}px`;
        if (artTableWidth >= innerTableWidth) {
            if (this.state.hasScroll) {
                this.setState({ hasScroll: false });
            }
        }
        else {
            if (!this.state.hasScroll && stickyScrollHeight > 5) {
                // 考虑下mac下面隐藏滚动条的情况
                this.setState({ hasScroll: true });
            }
        }
        // 设置子节点宽度
        stickyScrollItem.style.width = `${innerTableWidth}px`;
    }
    renderTableHeader(info) {
        const { stickyTop, hasHeader } = this.props;
        return (React.createElement("div", { className: cx(Classes.tableHeader, 'no-scrollbar'), style: {
                top: stickyTop === 0 ? undefined : stickyTop,
                display: hasHeader ? undefined : 'none',
            } },
            React.createElement(TableHeader, { info: info })));
    }
    updateOffsetX(nextOffsetX) {
        if (this.lastInfo.useVirtual.horizontal) {
            if (Math.abs(nextOffsetX - this.state.offsetX) >= OVERSCAN_SIZE / 2) {
                this.setState({ offsetX: nextOffsetX });
            }
        }
    }
    syncHorizontalScrollFromTableBody() {
        this.syncHorizontalScroll(this.domHelper.tableBody.scrollLeft);
    }
    /** 同步横向滚动偏移量 */
    syncHorizontalScroll(x) {
        this.updateOffsetX(x);
        const { tableBody } = this.domHelper;
        const { flat } = this.lastInfo;
        const leftLockShadow = this.domHelper.getLeftLockShadow();
        if (leftLockShadow) {
            const shouldShowLeftLockShadow = flat.left.length > 0 && this.state.needRenderLock && x > 0;
            if (shouldShowLeftLockShadow) {
                leftLockShadow.classList.add('show-shadow');
            }
            else {
                leftLockShadow.classList.remove('show-shadow');
            }
        }
        const rightLockShadow = this.domHelper.getRightLockShadow();
        if (rightLockShadow) {
            const shouldShowRightLockShadow = flat.right.length > 0 && this.state.needRenderLock && x < tableBody.scrollWidth - tableBody.clientWidth;
            if (shouldShowRightLockShadow) {
                rightLockShadow.classList.add('show-shadow');
            }
            else {
                rightLockShadow.classList.remove('show-shadow');
            }
        }
    }
    getVerticalRenderRange(useVirtual) {
        const { dataSource } = this.props;
        const { offsetY, maxRenderHeight } = this.state;
        const rowCount = dataSource.length;
        if (useVirtual.vertical) {
            return this.rowHeightManager.getRenderRange(offsetY, maxRenderHeight, rowCount);
        }
        else {
            return getFullRenderRange(rowCount);
        }
    }
    renderTableBody(info) {
        const { dataSource, getRowProps, primaryKey, isLoading, emptyCellHeight, footerDataSource, components } = this.props;
        const tableBodyClassName = cx(Classes.tableBody, Classes.horizontalScrollContainer, {
            'no-scrollbar': footerDataSource.length > 0,
        });
        if (dataSource.length === 0) {
            const { components, emptyContent } = this.props;
            let EmptyContent = components.EmptyContent;
            if (EmptyContent == null && emptyContent != null) {
                warnEmptyContentIsDeprecated();
                EmptyContent = (() => emptyContent);
            }
            return (React.createElement("div", { className: tableBodyClassName },
                React.createElement(EmptyHtmlTable, { descriptors: info.visible, isLoading: isLoading, EmptyContent: EmptyContent, emptyCellHeight: emptyCellHeight })));
        }
        const { topIndex, bottomBlank, topBlank, bottomIndex } = info.verticalRenderRange;
        return (React.createElement("div", { className: tableBodyClassName },
            topBlank > 0 && (React.createElement("div", { key: "top-blank", className: cx(Classes.virtualBlank, 'top'), style: { height: topBlank } })),
            React.createElement(HtmlTable, { components: components, tbodyHtmlTag: "tbody", getRowProps: getRowProps, primaryKey: primaryKey, data: dataSource.slice(topIndex, bottomIndex), horizontalRenderInfo: info, verticalRenderInfo: {
                    first: 0,
                    offset: topIndex,
                    limit: bottomIndex,
                    last: dataSource.length - 1,
                } }),
            bottomBlank > 0 && (React.createElement("div", { key: "bottom-blank", className: cx(Classes.virtualBlank, 'bottom'), style: { height: bottomBlank } }))));
    }
    renderTableFooter(info) {
        const { footerDataSource = [], getRowProps, primaryKey, stickyBottom, components } = this.props;
        return (React.createElement("div", { className: cx(Classes.tableFooter, Classes.horizontalScrollContainer), style: { bottom: stickyBottom === 0 ? undefined : stickyBottom } },
            React.createElement(HtmlTable, { components: components, tbodyHtmlTag: "tfoot", data: footerDataSource, horizontalRenderInfo: info, getRowProps: getRowProps, primaryKey: primaryKey, verticalRenderInfo: {
                    offset: 0,
                    first: 0,
                    last: footerDataSource.length - 1,
                    limit: Infinity,
                } })));
    }
    renderLockShadows(info) {
        return (React.createElement(React.Fragment, null,
            React.createElement("div", { className: Classes.lockShadowMask, style: { left: 0, width: info.leftLockTotalWidth + LOCK_SHADOW_PADDING } },
                React.createElement("div", { className: cx(Classes.lockShadow, Classes.leftLockShadow) })),
            React.createElement("div", { className: Classes.lockShadowMask, style: { right: 0, width: info.rightLockTotalWidth + LOCK_SHADOW_PADDING } },
                React.createElement("div", { className: cx(Classes.lockShadow, Classes.rightLockShadow) }))));
    }
    renderStickyScroll(info) {
        const { hasStickyScroll, stickyBottom } = this.props;
        const { hasScroll } = this.state;
        return (React.createElement("div", { className: cx(Classes.stickyScroll, Classes.horizontalScrollContainer), style: {
                display: hasStickyScroll && hasScroll ? 'block' : 'none',
                bottom: stickyBottom,
            } },
            React.createElement("div", { className: Classes.stickyScrollItem })));
    }
    render() {
        const info = calculateRenderInfo(this);
        this.lastInfo = info;
        const { dataSource, className, style, hasHeader, useOuterBorder, isStickyHead, isStickyHeader, isStickyFooter, isLoading, footerDataSource, components, flowRoot, } = this.props;
        if (flowRoot != null) {
            warnFlowRootIsDeprecated();
        }
        const artTableWrapperClassName = cx(Classes.artTableWrapper, {
            'use-outer-border': useOuterBorder,
            empty: dataSource.length === 0,
            lock: info.hasLockColumn,
            'has-header': hasHeader,
            'sticky-header': isStickyHeader !== null && isStickyHeader !== void 0 ? isStickyHeader : isStickyHead,
            'has-footer': footerDataSource.length > 0,
            'sticky-footer': isStickyFooter,
        }, className);
        const artTableWrapperProps = {
            className: artTableWrapperClassName,
            style,
            [STYLED_REF_PROP]: this.artTableWrapperRef,
        };
        return (React.createElement(StyledArtTableWrapper, Object.assign({}, artTableWrapperProps),
            React.createElement(Loading, { visible: isLoading, LoadingIcon: components.LoadingIcon, LoadingContentWrapper: components.LoadingContentWrapper },
                React.createElement("div", { className: Classes.artTable },
                    this.renderTableHeader(info),
                    this.renderTableBody(info),
                    this.renderTableFooter(info),
                    this.renderLockShadows(info)),
                this.renderStickyScroll(info))));
    }
    componentDidMount() {
        this.updateDOMHelper();
        this.props$ = new BehaviorSubject(this.props);
        this.initSubscriptions();
        this.didMountOrUpdate();
    }
    componentDidUpdate(prevProps, prevState) {
        this.updateDOMHelper();
        this.props$.next(this.props);
        this.didMountOrUpdate(prevProps, prevState);
    }
    didMountOrUpdate(prevProps, prevState) {
        this.syncHorizontalScrollFromTableBody();
        this.updateStickyScroll();
        this.adjustNeedRenderLock();
        this.updateRowHeightManager();
        this.updateScrollLeftWhenLayoutChanged(prevProps, prevState);
    }
    updateScrollLeftWhenLayoutChanged(prevProps, prevState) {
        if (prevState != null) {
            if (!prevState.hasScroll && this.state.hasScroll) {
                this.domHelper.stickyScroll.scrollLeft = 0;
            }
        }
        if (prevProps != null) {
            const prevHasFooter = prevProps.footerDataSource.length > 0;
            const currentHasFooter = this.props.footerDataSource.length > 0;
            if (!prevHasFooter && currentHasFooter) {
                this.domHelper.tableFooter.scrollLeft = this.domHelper.tableBody.scrollLeft;
            }
        }
    }
    initSubscriptions() {
        const { tableHeader, tableBody, tableFooter, stickyScroll } = this.domHelper;
        this.rootSubscription.add(throttledWindowResize$.subscribe(() => {
            this.updateStickyScroll();
            this.adjustNeedRenderLock();
        }));
        // 滚动同步
        this.rootSubscription.add(syncScrollLeft([tableHeader, tableBody, tableFooter, stickyScroll], (scrollLeft) => {
            this.syncHorizontalScroll(scrollLeft);
        }));
        const richVisibleRects$ = getRichVisibleRectsStream(this.domHelper.artTable, this.props$.pipe(op.skip(1), op.mapTo('structure-may-change')), this.props.virtualDebugLabel).pipe(op.shareReplay());
        // 每当可见部分发生变化的时候，调整 loading icon 的未知（如果 loading icon 存在的话）
        this.rootSubscription.add(combineLatest([
            richVisibleRects$.pipe(op.map((p) => p.clipRect), op.distinctUntilChanged(shallowEqual)),
            this.props$.pipe(op.startWith(null), op.pairwise(), op.filter(([prevProps, props]) => prevProps == null || (!prevProps.isLoading && props.isLoading))),
        ]).subscribe(([clipRect]) => {
            const loadingIndicator = this.domHelper.getLoadingIndicator();
            if (!loadingIndicator) {
                return;
            }
            const height = clipRect.bottom - clipRect.top;
            // fixme 这里的定位在有些特殊情况下可能会出错 see #132
            loadingIndicator.style.top = `${height / 2}px`;
            loadingIndicator.style.marginTop = `${height / 2}px`;
        }));
        // 每当可见部分发生变化的时候，如果开启了虚拟滚动，则重新触发 render
        this.rootSubscription.add(richVisibleRects$
            .pipe(op.filter(() => {
            const { horizontal, vertical } = this.lastInfo.useVirtual;
            return horizontal || vertical;
        }), op.map(({ clipRect, offsetY }) => ({
            maxRenderHeight: clipRect.bottom - clipRect.top,
            maxRenderWidth: clipRect.right - clipRect.left,
            offsetY,
        })), op.distinctUntilChanged((x, y) => {
            // 因为 overscan 的存在，滚动较小的距离时不需要触发组件重渲染
            return (Math.abs(x.maxRenderWidth - y.maxRenderWidth) < OVERSCAN_SIZE / 2 &&
                Math.abs(x.maxRenderHeight - y.maxRenderHeight) < OVERSCAN_SIZE / 2 &&
                Math.abs(x.offsetY - y.offsetY) < OVERSCAN_SIZE / 2);
        }))
            .subscribe((sizeAndOffset) => {
            this.setState(sizeAndOffset);
        }));
    }
    componentWillUnmount() {
        this.rootSubscription.unsubscribe();
    }
    /** 更新 DOM 节点的引用，方便其他方法直接操作 DOM */
    updateDOMHelper() {
        this.domHelper = new TableDOMHelper(this.artTableWrapperRef.current);
    }
    updateRowHeightManager() {
        var _a;
        const virtualTop = this.domHelper.getVirtualTop();
        const virtualTopHeight = (_a = virtualTop === null || virtualTop === void 0 ? void 0 : virtualTop.clientHeight) !== null && _a !== void 0 ? _a : 0;
        let zeroHeightRowCount = 0;
        let maxRowIndex = -1;
        let maxRowBottom = -1;
        for (const tr of this.domHelper.getTableRows()) {
            const rowIndex = Number(tr.dataset.rowindex);
            if (isNaN(rowIndex)) {
                continue;
            }
            maxRowIndex = Math.max(maxRowIndex, rowIndex);
            const offset = tr.offsetTop + virtualTopHeight;
            const size = tr.offsetHeight;
            if (size === 0) {
                zeroHeightRowCount += 1;
            }
            maxRowBottom = Math.max(maxRowBottom, offset + size);
            this.rowHeightManager.updateRow(rowIndex, offset, size);
        }
        // 当 estimatedRowHeight 过大时，可能出现「渲染行数过少，无法覆盖可视范围」的情况
        // 出现这种情况时，我们判断「下一次渲染能够渲染更多行」是否满足，满足的话就直接调用 forceUpdate
        // zeroHeightRowCount === 0 用于确保当前没有 display=none 的情况
        if (maxRowIndex !== -1 && zeroHeightRowCount === 0) {
            if (maxRowBottom < this.state.offsetY + this.state.maxRenderHeight) {
                const vertical = this.getVerticalRenderRange(this.lastInfo.useVirtual);
                if (vertical.bottomIndex - 1 > maxRowIndex) {
                    this.forceUpdate();
                }
            }
        }
    }
    /** 计算表格所有列的渲染宽度之和，判断表格是否需要渲染锁列 */
    adjustNeedRenderLock() {
        const { needRenderLock } = this.state;
        const { flat, hasLockColumn } = this.lastInfo;
        if (hasLockColumn) {
            const sumOfColWidth = sum(flat.full.map((col) => col.width));
            const nextNeedRenderLock = sumOfColWidth > this.domHelper.artTable.clientWidth;
            if (needRenderLock !== nextNeedRenderLock) {
                this.setState({ needRenderLock: nextNeedRenderLock });
            }
        }
        else {
            if (needRenderLock) {
                this.setState({ needRenderLock: false });
            }
        }
    }
}
BaseTable.defaultProps = {
    hasHeader: true,
    isStickyHeader: true,
    stickyTop: 0,
    footerDataSource: [],
    isStickyFooter: true,
    stickyBottom: 0,
    hasStickyScroll: true,
    stickyScrollHeight: 'auto',
    useVirtual: 'auto',
    estimatedRowHeight: 48,
    isLoading: false,
    components: {},
    getRowProps: noop,
    dataSource: [],
};

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

const InlineFlexCell = styled__default.div `
  display: inline-flex;
  align-items: center;
`;
const ExpansionCell = styled__default(InlineFlexCell) `
  &.leaf {
    cursor: default;
  }

  .expansion-icon {
    fill: #999;
    flex: 0 0 16px;
    transition: transform 200ms;

    &.expanded {
      transform-origin: center center;
      transform: rotate(90deg);
    }
  }
`;
function CaretDownIcon(props) {
    return (React.createElement("svg", Object.assign({ focusable: "false", preserveAspectRatio: "xMidYMid meet", fill: "currentColor", width: "16", height: "16", viewBox: "0 0 32 32" }, props),
        React.createElement("path", { d: "M24 12L16 22 8 12z" })));
}
function InfoIcon(props) {
    return (React.createElement("svg", Object.assign({ focusable: "false", preserveAspectRatio: "xMidYMid meet", fill: "currentColor", width: "16", height: "16", viewBox: "0 0 16 16" }, props),
        React.createElement("path", { d: "M8.5 11L8.5 6.5 6.5 6.5 6.5 7.5 7.5 7.5 7.5 11 6 11 6 12 10 12 10 11zM8 3.5c-.4 0-.8.3-.8.8S7.6 5 8 5c.4 0 .8-.3.8-.8S8.4 3.5 8 3.5z" }),
        React.createElement("path", { d: "M8,15c-3.9,0-7-3.1-7-7s3.1-7,7-7s7,3.1,7,7S11.9,15,8,15z M8,2C4.7,2,2,4.7,2,8s2.7,6,6,6s6-2.7,6-6S11.3,2,8,2z" })));
}
function CaretRightIcon(props) {
    return (React.createElement("svg", Object.assign({ focusable: "false", preserveAspectRatio: "xMidYMid meet", fill: "currentColor", width: "16", height: "16", viewBox: "0 0 32 32" }, props),
        React.createElement("path", { d: "M12 8L22 16 12 24z" })));
}
function LoadingIcon(props) {
    return (React.createElement("svg", Object.assign({ width: "16", height: "16", fill: "currentColor", viewBox: "0 0 1024 1024" }, props),
        React.createElement("path", { d: "M512 74.667c-17.067 0-32 14.933-32 32V256c0 17.067 14.933 32 32 32s32-14.933 32-32V106.667c0-17.067-14.933-32-32-32zm181.333 288c8.534 0 17.067-2.134 23.467-8.534L821.333 249.6c12.8-12.8 12.8-32 0-44.8-12.8-12.8-32-12.8-44.8 0L672 309.333c-12.8 12.8-12.8 32 0 44.8 4.267 6.4 12.8 8.534 21.333 8.534zm224 117.333H768c-17.067 0-32 14.933-32 32s14.933 32 32 32h149.333c17.067 0 32-14.933 32-32s-14.933-32-32-32zM714.667 669.867c-12.8-12.8-32-12.8-44.8 0s-12.8 32 0 44.8L774.4 819.2c6.4 6.4 14.933 8.533 23.467 8.533s17.066-2.133 23.466-8.533c12.8-12.8 12.8-32 0-44.8L714.667 669.867zM512 736c-17.067 0-32 14.933-32 32v149.333c0 17.067 14.933 32 32 32s32-14.933 32-32V768c0-17.067-14.933-32-32-32zm-202.667-66.133L204.8 774.4c-12.8 12.8-12.8 32 0 44.8 6.4 6.4 14.933 8.533 23.467 8.533s17.066-2.133 23.466-8.533l104.534-104.533c12.8-12.8 12.8-32 0-44.8s-36.267-12.8-46.934 0zM288 512c0-17.067-14.933-32-32-32H106.667c-17.067 0-32 14.933-32 32s14.933 32 32 32H256c17.067 0 32-14.933 32-32zm-40.533-309.333c-12.8-12.8-32-12.8-44.8 0-12.8 12.8-12.8 32 0 44.8L307.2 352c6.4 6.4 14.933 8.533 23.467 8.533s17.066-2.133 23.466-8.533c12.8-12.8 12.8-32 0-44.8L247.467 202.667z" })));
}
const icons = {
    Loading: LoadingIcon,
    CaretDown: CaretDownIcon,
    CaretRight: CaretRightIcon,
    Info: InfoIcon,
};

const treeMetaSymbol = Symbol('treeMetaSymbol');
function treeMode(opts = {}) {
    return function treeModeStep(pipeline) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const stateKey = 'treeMode';
        const ctx = pipeline.ctx;
        const primaryKey = pipeline.ensurePrimaryKey('treeMode');
        if (typeof primaryKey !== 'string') {
            throw new Error('treeMode 仅支持字符串作为 primaryKey');
        }
        const openKeys = (_c = (_b = (_a = opts.openKeys) !== null && _a !== void 0 ? _a : pipeline.getStateAtKey(stateKey)) !== null && _b !== void 0 ? _b : opts.defaultOpenKeys) !== null && _c !== void 0 ? _c : [];
        const openKeySet = new Set(openKeys);
        const onChangeOpenKeys = (nextKeys, key, action) => {
            var _a;
            (_a = opts.onChangeOpenKeys) === null || _a === void 0 ? void 0 : _a.call(opts, nextKeys, key, action);
            pipeline.setStateAtKey(stateKey, nextKeys, { key, action });
        };
        const toggle = (rowKey) => {
            const expanded = openKeySet.has(rowKey);
            if (expanded) {
                onChangeOpenKeys(openKeys.filter((key) => key !== rowKey), rowKey, 'collapse');
            }
            else {
                onChangeOpenKeys([...openKeys, rowKey], rowKey, 'expand');
            }
        };
        const isLeafNode$1 = (_d = opts.isLeafNode) !== null && _d !== void 0 ? _d : isLeafNode;
        const clickArea = (_e = opts.clickArea) !== null && _e !== void 0 ? _e : 'cell';
        const treeMetaKey = (_f = opts.treeMetaKey) !== null && _f !== void 0 ? _f : treeMetaSymbol;
        const stopClickEventPropagation = Boolean(opts.stopClickEventPropagation);
        // indents
        const iconWidth = ctx.indents.iconWidth;
        const iconIndent = (_g = opts.iconIndent) !== null && _g !== void 0 ? _g : ctx.indents.iconIndent;
        const iconGap = (_h = opts.iconGap) !== null && _h !== void 0 ? _h : ctx.indents.iconGap;
        const indentSize = (_j = opts.indentSize) !== null && _j !== void 0 ? _j : ctx.indents.indentSize;
        return pipeline.mapDataSource(processDataSource).mapColumns(processColumns);
        function processDataSource(input) {
            const result = [];
            dfs(input, 0);
            function dfs(nodes, depth) {
                if (nodes == null) {
                    return;
                }
                for (const node of nodes) {
                    const rowKey = node[primaryKey];
                    const expanded = openKeySet.has(rowKey);
                    const isLeaf = isLeafNode$1(node, { depth, expanded, rowKey });
                    const treeMeta = { depth, isLeaf, expanded, rowKey };
                    result.push(Object.assign({ [treeMetaKey]: treeMeta }, node));
                    if (!isLeaf && expanded) {
                        dfs(node.children, depth + 1);
                    }
                }
            }
            return result;
        }
        function processColumns(columns) {
            if (columns.length === 0) {
                return columns;
            }
            const [firstCol, ...others] = columns;
            const render = (value, record, recordIndex) => {
                const content = internals.safeRender(firstCol, record, recordIndex);
                if (record[treeMetaKey] == null) {
                    // 没有 treeMeta 信息的话，就返回原先的渲染结果
                    return content;
                }
                const { rowKey, depth, isLeaf, expanded } = record[treeMetaKey];
                const indent = iconIndent + depth * indentSize;
                if (isLeaf) {
                    return (React.createElement(InlineFlexCell, { className: "expansion-cell leaf" },
                        React.createElement("span", { style: { marginLeft: indent + iconWidth + iconGap } }, content)));
                }
                const onClick = (e) => {
                    if (stopClickEventPropagation) {
                        e.stopPropagation();
                    }
                    toggle(rowKey);
                };
                const expandCls = expanded ? 'expanded' : 'collapsed';
                return (React.createElement(ExpansionCell, { className: cx('expansion-cell', expandCls), style: {
                        cursor: clickArea === 'content' ? 'pointer' : undefined,
                    }, onClick: clickArea === 'content' ? onClick : undefined },
                    React.createElement(icons.CaretRight, { className: cx('expansion-icon', expandCls), style: {
                            cursor: clickArea === 'icon' ? 'pointer' : undefined,
                            marginLeft: indent,
                            marginRight: iconGap,
                        }, onClick: clickArea === 'icon' ? onClick : undefined }),
                    content));
            };
            const getCellProps = (value, record, rowIndex) => {
                const prevProps = internals.safeGetCellProps(firstCol, record, rowIndex);
                if (record[treeMetaKey] == null) {
                    // 没有 treeMeta 信息的话，就返回原先的 cellProps
                    return prevProps;
                }
                const { isLeaf, rowKey } = record[treeMetaKey];
                if (isLeaf) {
                    return prevProps;
                }
                return mergeCellProps(prevProps, {
                    onClick(e) {
                        if (stopClickEventPropagation) {
                            e.stopPropagation();
                        }
                        toggle(rowKey);
                    },
                    style: { cursor: 'pointer' },
                });
            };
            return [
                Object.assign(Object.assign({}, firstCol), { title: (React.createElement("span", { style: { marginLeft: iconIndent + iconWidth + iconGap } }, internals.safeRenderHeader(firstCol))), render, getCellProps: clickArea === 'cell' ? getCellProps : firstCol.getCellProps }),
                ...others,
            ];
        }
    };
}

/**
 * 表格数据处理流水线。TablePipeline 提供了表格数据处理过程中的一些上下方与工具方法，包括……
 *
 * 1. ctx：上下文环境对象，step（流水线上的一步）可以对 ctx 中的字段进行读写。
 * ctx 中部分字段名称有特定的含义（例如 primaryKey 表示行的主键），使用自定义的上下文信息时注意避开这些名称。
 *
 * 2. rowPropsGetters：getRowProps 回调队列，step 可以通过 pipeline.appendRowPropsGetter 向队列中追加回调函数，
 *   在调用 pipeline.props() 队列中的所有函数会组合形成最终的 getRowProps
 *
 * 3. 当前流水线的状态，包括 dataSource, columns, rowPropsGetters 三个部分
 *
 * 4. snapshots，调用 pipeline.snapshot(name) 可以记录当前的状态，后续可以通过 name 来读取保存的状态
 * */
class TablePipeline {
    constructor({ state, setState, ctx, }) {
        this._snapshots = {};
        this._rowPropsGetters = [];
        this.ctx = {
            components: {},
            indents: TablePipeline.defaultIndents,
        };
        this.state = state;
        this.setState = setState;
        Object.assign(this.ctx, ctx);
    }
    appendRowPropsGetter(getter) {
        this._rowPropsGetters.push(getter);
        return this;
    }
    getDataSource(name) {
        if (name == null) {
            return this._dataSource;
        }
        else {
            return this._snapshots[name].dataSource;
        }
    }
    getColumns(name) {
        if (name == null) {
            return this._columns;
        }
        else {
            return this._snapshots[name].columns;
        }
    }
    getStateAtKey(stateKey, defaultValue) {
        var _a;
        return (_a = this.state[stateKey]) !== null && _a !== void 0 ? _a : defaultValue;
    }
    /** 将 stateKey 对应的状态设置为 partialState  */
    setStateAtKey(stateKey, partialState, extraInfo) {
        this.setState((prev) => (Object.assign(Object.assign({}, prev), { [stateKey]: partialState })), stateKey, partialState, extraInfo);
    }
    /** 确保 primaryKey 已被设置，并返回 primaryKey  */
    ensurePrimaryKey(hint) {
        if (this.ctx.primaryKey == null) {
            throw new Error(hint ? `使用 ${hint} 之前必须先设置 primaryKey` : '必须先设置 primaryKey');
        }
        return this.ctx.primaryKey;
    }
    /** 设置流水线的输入数据 */
    input(input) {
        if (this._dataSource != null || this._columns != null) {
            throw new Error('input 不能调用两次');
        }
        this._dataSource = input.dataSource;
        this._columns = input.columns;
        this.snapshot('input');
        return this;
    }
    /** 设置 dataSource */
    dataSource(rows) {
        this._dataSource = rows;
        return this;
    }
    /** 设置 columns */
    columns(cols) {
        this._columns = cols;
        return this;
    }
    /** 设置主键 */
    primaryKey(key) {
        this.ctx.primaryKey = key;
        return this;
    }
    /** 保存快照 */
    snapshot(name) {
        this._snapshots[name] = {
            dataSource: this._dataSource,
            columns: this._columns,
            rowPropsGetters: this._rowPropsGetters.slice(),
        };
        return this;
    }
    /** @deprecated
     *  应用一个 ali-react-table-dist Table transform */
    useTransform(transform) {
        const next = transform({
            dataSource: this.getDataSource(),
            columns: this.getColumns(),
        });
        return this.dataSource(next.dataSource).columns(next.columns);
    }
    /** 使用 pipeline 功能拓展 */
    use(step) {
        return step(this);
    }
    /** 转换 dataSource */
    mapDataSource(mapper) {
        return this.dataSource(mapper(this.getDataSource()));
    }
    /** 转换 columns */
    mapColumns(mapper) {
        return this.columns(mapper(this.getColumns()));
    }
    /** 获取 BaseTable 的 props，结果中包含 dataSource/columns/primaryKey/getRowProps 四个字段 */
    getProps() {
        const result = {
            dataSource: this._dataSource,
            columns: this._columns,
        };
        if (this.ctx.primaryKey) {
            result.primaryKey = this.ctx.primaryKey;
        }
        if (this._rowPropsGetters.length > 0) {
            result.getRowProps = (row, rowIndex) => {
                return this._rowPropsGetters.reduce((res, get) => {
                    return mergeCellProps(res, get(row, rowIndex));
                }, {});
            };
        }
        return result;
    }
}
TablePipeline.defaultIndents = {
    iconIndent: -8,
    iconWidth: 16,
    iconGap: 0,
    indentSize: 16,
};
function useTablePipeline(ctx) {
    const [state, setState] = useState({});
    return new TablePipeline({ state, setState, ctx });
}

export { BaseTable as B, Classes as C, ExpansionCell as E, InlineFlexCell as I, SpanManager as S, TablePipeline as T, __rest as _, internals as a, icons as b, collectNodes as c, arrayUtils as d, always as e, flatMap as f, getTreeDepth as g, treeMetaSymbol as h, isLeafNode as i, groupBy2 as j, fromEntries as k, mergeCellProps as m, treeMode as t, useTablePipeline as u };
