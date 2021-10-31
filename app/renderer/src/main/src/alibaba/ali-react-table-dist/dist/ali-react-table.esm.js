import React, {useState, useEffect} from 'react';
import styled__default from 'styled-components';
import {fromEvent} from 'rxjs';
import * as op from 'rxjs/operators';
import cx from 'classnames';
import 'resize-observer-polyfill';
import {
    f as flatMap,
    g as getTreeDepth,
    i as isLeafNode,
    c as collectNodes,
    a as internals,
    S as SpanManager,
    C as Classes,
    m as mergeCellProps,
    _ as __rest,
    b as icons,
    d as arrayUtils,
    e as always,
    I as InlineFlexCell,
    E as ExpansionCell,
    t as treeMode,
    h as treeMetaSymbol
} from './chunks/ali-react-table-pipeline-2201dfe0.esm.js';

export {
    B as BaseTable,
    C as Classes,
    T as TablePipeline,
    c as collectNodes,
    g as getTreeDepth,
    j as groupBy2,
    a as internals,
    i as isLeafNode,
    m as mergeCellProps,
    u as useTablePipeline
} from './chunks/ali-react-table-pipeline-2201dfe0.esm.js';

function groupBy(list, iteratee) {
    const groups = {};
    for (const item of list) {
        const key = iteratee(item);
        if (groups[key] == null) {
            groups[key] = [];
        }
        groups[key].push(item);
    }
    return groups;
}

/**
 * 以 input 作为输入，按序使用 transform.
 *
 * `applyTransforms(input, f1, f2, f3)` 等价于 `f3(f2(f1(input)))` */
function applyTransforms(input, ...transforms) {
    return transforms.reduce((v, fn) => fn(v), input);
}

/**
 * 根据 idProp 与 parentIdProp 从对象数组中构建对应的树
 * 当 A[parentIdProp] === B[idProp] 时，对象A会被移动到对象B的children。
 * 当一个对象的 parentIdProp 不与其他对象的 idProp 字段相等时，该对象被作为树的顶层节点
 * @example
 * const array = [
 *   { id: 'node-1', parent: 'root' },
 *   { id: 'node-2', parent: 'root' },
 *   { id: 'node-3', parent: 'node-2' },
 *   { id: 'node-4', parent: 'node-2' },
 *   { id: 'node-5', parent: 'node-4' },
 * ]
 * const tree = buildTree('id', 'parent', array)
 * expect(tree).toEqual([
 *   { id: 'node-1', parent: 'root' },
 *   {
 *     id: 'node-2',
 *     parent: 'root',
 *     children: [
 *       { id: 'node-3', parent: 'node-2' },
 *       {
 *         id: 'node-4',
 *         parent: 'node-2',
 *         children: [{ id: 'node-5', parent: 'node-4' }],
 *       },
 *     ],
 *   },
 * ])
 */
function buildTree$1(idProp, parentIdProp, items) {
    const wrapperMap = new Map();
    const ensure = (id) => {
        if (wrapperMap.has(id)) {
            return wrapperMap.get(id);
        }
        const wrapper = {id, parent: null, item: null, children: []};
        wrapperMap.set(id, wrapper);
        return wrapper;
    };
    for (const item of items) {
        const parentWrapper = ensure(item[parentIdProp]);
        const itemWrapper = ensure(item[idProp]);
        itemWrapper.parent = parentWrapper;
        parentWrapper.children.push(itemWrapper);
        itemWrapper.item = item;
    }
    const topLevelWrappers = flatMap(Array.from(wrapperMap.values()).filter((wrapper) => wrapper.parent == null), (wrapper) => wrapper.children);
    return unwrapRecursively(topLevelWrappers);

    function unwrapRecursively(wrapperArray) {
        const result = [];
        for (const wrapper of wrapperArray) {
            if (wrapper.children.length === 0) {
                result.push(wrapper.item);
            } else {
                result.push(Object.assign(Object.assign({}, wrapper.item), {children: unwrapRecursively(wrapper.children)}));
            }
        }
        return result;
    }
}

function safeGetSpanRect(column, record, rowIndex, colIndex) {
    let colSpan = 1;
    let rowSpan = 1;
    if (column.getSpanRect) {
        const value = internals.safeGetValue(column, record, rowIndex);
        const spanRect = column.getSpanRect(value, record, rowIndex);
        colSpan = spanRect == null ? 1 : spanRect.right - colIndex;
        rowSpan = spanRect == null ? 1 : spanRect.bottom - rowIndex;
    } else {
        const cellProps = internals.safeGetCellProps(column, record, rowIndex);
        if (cellProps.colSpan != null) {
            colSpan = cellProps.colSpan;
        }
        if (cellProps.rowSpan != null) {
            rowSpan = cellProps.rowSpan;
        }
    }
    // 注意这里没有考虑「rowSpan/colSpan 不能过大，避免 rowSpan/colSpan 影响因虚拟滚动而未渲染的单元格」
    return {
        top: rowIndex,
        bottom: rowIndex + rowSpan,
        left: colIndex,
        right: colIndex + colSpan,
    };
}

function move({c, r}, dx, dy) {
    return {c: c + dx, r: r + dy};
}

function sanitizeCellDatum(value) {
    if (value === Infinity || value === -Infinity || (typeof value === 'number' && isNaN(value))) {
        return null;
    } else {
        return value;
    }
}

/** 根据 BaseTable 的 dataSource 和 column，将表格数据导出为 Excel 文件 */
function exportTableAsExcel(xlsxPackage, dataSource, columns, filename) {
    const sheet = xlsxPackage.utils.aoa_to_sheet([]);
    const topHeaderHeight = getTreeDepth(columns) + 1;
    const origin = {c: 0, r: 0};
    addTopHeaders(origin);
    addDataPart(move(origin, 0, topHeaderHeight));
    xlsxPackage.writeFile({
        SheetNames: ['Sheet1'],
        Sheets: {Sheet1: sheet},
    }, filename);

    function addTopHeaders(origin) {
        dfs(columns, 0, 0);

        function dfs(cols, startDx, startDy) {
            var _a;
            const start = move(origin, startDx, startDy);
            let offsetX = 0;
            for (const col of cols) {
                if ((_a = col.features) === null || _a === void 0 ? void 0 : _a.noExport) {
                    continue;
                }
                const current = move(start, offsetX, 0);
                addOne(col.name, current);
                if (isLeafNode(col)) {
                    offsetX += 1;
                    mergeCells(current, 1, topHeaderHeight - startDy);
                } else {
                    const childrenWidth = dfs(col.children, startDx + offsetX, startDy + 1);
                    mergeCells(current, childrenWidth, 1);
                    offsetX += childrenWidth;
                }
            }
            return offsetX;
        }
    }

    function addDataPart(origin) {
        const leafColumns = collectNodes(columns, 'leaf-only').filter((col) => {
            var _a;
            return !((_a = col.features) === null || _a === void 0 ? void 0 : _a.noExport);
        });
        const spanManager = new SpanManager();
        const dataPart = dataSource.map((record, rowIndex) => {
            spanManager.stripUpwards(rowIndex);
            return leafColumns.map((col, colIndex) => {
                if (spanManager.testSkip(rowIndex, colIndex)) {
                    return null;
                }
                const spanRect = safeGetSpanRect(col, record, rowIndex, colIndex);
                const rowSpan = spanRect.bottom - spanRect.top;
                const colSpan = spanRect.right - spanRect.left;
                if (rowSpan > 1 || colSpan > 1) {
                    spanManager.add(spanRect.top, spanRect.left, colSpan, rowSpan);
                    mergeCells(move(origin, spanRect.left, spanRect.top), colSpan, rowSpan);
                }
                return sanitizeCellDatum(internals.safeGetValue(col, record, rowIndex));
            });
        });
        add(dataPart, origin);
    }

    function add(data, origin) {
        xlsxPackage.utils.sheet_add_aoa(sheet, data, {origin});
    }

    function addOne(datum, origin) {
        xlsxPackage.utils.sheet_add_aoa(sheet, [[datum]], {origin});
    }

    function mergeCells(addr, width, height) {
        if (width === 1 && height === 1) {
            return;
        }
        if (sheet['!merges'] == null) {
            sheet['!merges'] = [];
        }
        sheet['!merges'].push({s: addr, e: move(addr, width - 1, height - 1)});
    }
}

/** 对树状结构的数据进行排序.
 * layeredSort 是一个递归的过程，针对树上的每一个父节点，该函数都会重新对其子节点数组（children) 进行排序.
 * */
function layeredSort(array, compare) {
    return dfs(array);

    function dfs(rows) {
        if (!Array.isArray(array)) {
            return array;
        }
        return rows
            .map((row) => {
                if (isLeafNode(row)) {
                    return row;
                }
                return Object.assign(Object.assign({}, row), {children: dfs(row.children)});
            })
            .sort(compare);
    }
}

const factorySymbol = Symbol('factory-symbol');

function isProtoFactory(v) {
    return v && v[factorySymbol];
}

function proto(baseRecord, ensureArray = 'auto') {
    const baseKeys = Object.keys(baseRecord);

    function process(record) {
        const result = Object.assign({}, record);
        baseKeys.forEach((key) => {
            var _a;
            if (result[key] === proto.empty) {
                delete result[key];
                return;
            }
            const base = baseRecord[key];
            if (isProtoFactory(base)) {
                result[key] = base(result[key]);
            } else {
                result[key] = (_a = result[key]) !== null && _a !== void 0 ? _a : base;
            }
        });
        return result;
    }

    function factory(arg) {
        const isEnsureArray = ensureArray === 'auto' ? Array.isArray(arg) : ensureArray;
        if (isEnsureArray) {
            if (arg == null) {
                return [];
            }
            return arg.map(process);
        } else {
            return process(arg);
        }
    }

    // @ts-ignore
    factory[factorySymbol] = true;
    factory.extends = (extRecord) => {
        const extFactory = proto(extRecord, ensureArray);
        return (arg) => factory(extFactory(arg));
    };
    return factory;
}

proto.empty = Symbol('proto.empty');
proto.string = ((v) => {
    if (v != null && typeof v !== 'string') {
        throw new Error('must be string');
    }
    return v;
});
proto.string[factorySymbol] = true;
proto.number = ((v) => {
    if (v != null && typeof v !== 'number') {
        throw new Error('must be number');
    }
    return v;
});
proto.number[factorySymbol] = true;
proto.notNull = ((v) => {
    if (v == null) {
        throw new Error('must be not null');
    }
    return v;
});
proto.notNull[factorySymbol] = true;
proto.object = (baseRecord) => proto(baseRecord, false);
proto.array = (baseRecord) => proto(baseRecord, true);

function makeRecursiveMapper(fn) {
    return (tree) => {
        return dfs(tree, 0, []).result;

        function dfs(nodes, parentStartIndex, path) {
            let flatCount = 0;
            const result = [];
            for (const node of nodes) {
                path.push(node);
                const startIndex = parentStartIndex + flatCount;
                let subResult;
                if (isLeafNode(node)) {
                    subResult = fn(node, {
                        startIndex,
                        endIndex: startIndex + 1,
                        path: path.slice(),
                        isLeaf: true,
                    });
                    flatCount += 1;
                } else {
                    const dfsResult = dfs(node.children, startIndex, path);
                    subResult = fn(Object.assign(Object.assign({}, node), {children: dfsResult.result}), {
                        startIndex,
                        endIndex: startIndex + dfsResult.flatCount,
                        path: path.slice(),
                        isLeaf: false
                    });
                    flatCount += dfsResult.flatCount;
                }
                if (Array.isArray(subResult)) {
                    result.push(...subResult);
                } else if (subResult != null) {
                    result.push(subResult);
                }
                path.pop();
            }
            return {result, flatCount};
        }
    };
}

/** 比较函数，支持字符串、数字、数组和 null。
 * * 对于字符串将比较两者的字典序；
 * * 对数字将比较两者大小；
 * * null 值在比较时总是小于另一个值；
 * * 对于数组来说，将逐个比较数组中的元素，第一个不相等的比较结果将作为整个数组的比较结果
 *
 * 数组的比较可参考 python 中的元祖比较：
 * https://stackoverflow.com/questions/5292303/how-does-tuple-comparison-work-in-python */
function smartCompare(x, y) {
    // 将 null 排在最后面
    if (x == null) {
        return 1;
    }
    if (y == null) {
        return -1;
    }
    if (typeof x === 'number' && typeof y === 'number') {
        return x - y;
    }
    if (typeof x === 'string' && typeof y === 'string') {
        // 字符串使用 默认的字典序
        if (x < y) {
            return -1;
        } else if (x > y) {
            return 1;
        } else {
            return 0;
        }
    }
    if (Array.isArray(x) && Array.isArray(y)) {
        const len = Math.min(x.length, y.length);
        for (let i = 0; i < len; i++) {
            const cmp = smartCompare(x[i], y[i]);
            if (cmp !== 0) {
                return cmp;
            }
        }
        // 数组长度不等时，元素少的字段放在前面
        return x.length - y.length;
    }
    // 对于不认识的数据类型，返回 0
    return 0;
}

function normalizeAsArray(input) {
    if (input == null) {
        return [];
    } else if (Array.isArray(input)) {
        return input;
    } else {
        return [input];
    }
}

/** @deprecated 该 API 已经过时，请使用 makeRecursiveMapper */
function traverseColumn(fn) {
    return ({columns, dataSource}) => {
        return {dataSource, columns: dfs(columns, 0).result};

        function dfs(columns, parentStartColIndex) {
            let flatColCount = 0;
            const result = [];
            for (const col of columns) {
                const startColIndex = parentStartColIndex + flatColCount;
                let unNormalized;
                if (isLeafNode(col)) {
                    unNormalized = fn(col, {
                        range: {start: startColIndex, end: startColIndex + 1},
                        dataSource,
                    });
                    flatColCount += 1;
                } else {
                    const dfsResult = dfs(col.children, startColIndex);
                    unNormalized = fn(Object.assign(Object.assign({}, col), {children: dfsResult.result}), {
                        range: {
                            start: startColIndex,
                            end: startColIndex + dfsResult.flatColCount,
                        },
                        dataSource,
                    });
                    flatColCount += dfsResult.flatColCount;
                }
                result.push(...normalizeAsArray(unNormalized));
            }
            return {result, flatColCount};
        }
    };
}

const warnedSet = new Set();

function warnTransformsDeprecated(apiName) {
    if (!warnedSet.has(apiName)) {
        warnedSet.add(apiName);
        console.warn(`[ali-react-table] transform 用法已经过时，请使用 pipeline 来对表格进行拓展` +
            `\n  请移除以下 API 的调用：${apiName}`);
    }
}

function isIdentity$1(x, y) {
    return x === y;
}

/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
function makeAutoRowSpanTransform() {
    warnTransformsDeprecated('makeAutoRowSpanTransform');
    return traverseColumn((col, {dataSource, range}) => {
        var _a;
        if (!((_a = col.features) === null || _a === void 0 ? void 0 : _a.autoRowSpan)) {
            return col;
        }
        if (!isLeafNode(col)) {
            return col;
        }
        const isFunc = typeof col.features.autoRowSpan === 'function';
        const shouldMergeCell = isFunc ? col.features.autoRowSpan : isIdentity$1;
        const spanRects = [];
        let lastBottom = 0;
        let prevValue = null;
        let prevRow = null;
        for (let rowIndex = 0; rowIndex < dataSource.length; rowIndex++) {
            const row = dataSource[rowIndex];
            const value = internals.safeGetValue(col, row, rowIndex);
            if (rowIndex === 0 || !shouldMergeCell(prevValue, value, prevRow, row)) {
                const spanRect = {
                    top: lastBottom,
                    bottom: rowIndex,
                    left: range.start,
                    right: range.end,
                };
                for (let i = lastBottom; i < rowIndex; i++) {
                    spanRects.push(spanRect);
                }
                lastBottom = rowIndex;
            }
            prevValue = value;
            prevRow = row;
        }
        for (let i = lastBottom; i < dataSource.length; i++) {
            spanRects.push({
                top: lastBottom,
                bottom: dataSource.length,
                left: range.start,
                right: range.end,
            });
        }
        return Object.assign(Object.assign({}, col), {
            getSpanRect(value, row, rowIndex) {
                return spanRects[rowIndex];
            }
        });
    });
}

const AUTO_WIDTH_WRAPPER_CLS = 'auto-width-wrapper';
const AUTO_WIDTH_EXPANDER_CLS = 'auto-width-expander';
const AutoWidthWrapper = styled__default.div`
  height: 100%;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  padding: 8px 12px;
`;

function isSameArray(arr1, arr2) {
    return arr1.length === arr2.length && arr1.every((x, i) => x === arr2[i]);
}

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
function useAutoWidthTransform(tableRef, options, deps) {
    warnTransformsDeprecated('useAutoWidthTransform');
    const [widthList, setWidthList] = useState([]);
    useEffect(() => {
        const artTable = tableRef.current.getDoms().artTable;
        const rows = Array.from(artTable.querySelectorAll(`.${Classes.tableRow}`));
        if (rows.length === 0) {
            return;
        }
        const preferredWidthList = [];
        for (const row of rows) {
            const autoWidthDivList = row.querySelectorAll(`.${AUTO_WIDTH_WRAPPER_CLS}`);
            autoWidthDivList.forEach((div, i) => {
                var _a;
                preferredWidthList[i] = Math.max((_a = preferredWidthList[i]) !== null && _a !== void 0 ? _a : 0, div.scrollWidth);
            });
        }
        if (!isSameArray(preferredWidthList, widthList)) {
            setWidthList(preferredWidthList);
        }
    }, deps);
    let i = 0;
    const innerTransform = traverseColumn((col) => {
        var _a, _b, _c;
        if (!isLeafNode(col)) {
            return col;
        }
        if (!((_a = col.features) === null || _a === void 0 ? void 0 : _a.autoWidth)) {
            return col;
        }
        const {max = Infinity, min = -Infinity} = col.features.autoWidth;
        const width = (_c = (_b = widthList[i++]) !== null && _b !== void 0 ? _b : col.width) !== null && _c !== void 0 ? _c : options === null || options === void 0 ? void 0 : options.initColumnWidth;
        const clampedWidth = Math.max(min, Math.min(max, width));
        return Object.assign(Object.assign({}, col), {
            width: clampedWidth, getCellProps(_, record, rowIndex) {
                return mergeCellProps(internals.safeGetCellProps(col, record, rowIndex), {
                    style: {padding: 0},
                });
            }, render(_, record, rowIndex) {
                return (React.createElement(AutoWidthWrapper, {
                    className: AUTO_WIDTH_WRAPPER_CLS,
                    style: options === null || options === void 0 ? void 0 : options.wrapperStyle
                }, internals.safeRender(col, record, rowIndex)));
            }
        });
    });
    return (input) => {
        var _a;
        const {columns, dataSource} = innerTransform(input);
        const expanderVisibility = (_a = options === null || options === void 0 ? void 0 : options.expanderVisibility) !== null && _a !== void 0 ? _a : 'visible';
        return {
            columns: (options === null || options === void 0 ? void 0 : options.appendExpander)
                ? columns.concat([
                    {
                        name: '',
                        headerCellProps: {
                            className: AUTO_WIDTH_EXPANDER_CLS,
                            style: {
                                background: expanderVisibility === 'hidden' ? 'var(--bgcolor)' : undefined,
                                border: expanderVisibility === 'hidden' ? 'none' : undefined,
                            },
                        },
                        getCellProps() {
                            return {
                                className: AUTO_WIDTH_EXPANDER_CLS,
                                style: {visibility: expanderVisibility},
                            };
                        },
                    },
                ])
                : columns,
            dataSource,
        };
    };
}

/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
function makeBuildTreeTransform(idProp, parentIdProp) {
    warnTransformsDeprecated('makeBuildTreeTransform');
    return ({columns, dataSource}) => {
        return {columns, dataSource: buildTree$1(idProp, parentIdProp, dataSource)};
    };
}

/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
function makeColumnHoverTransform({hoverColor = 'var(--hover-bgcolor)', hoverColIndex, onChangeHoverColIndex,}) {
    warnTransformsDeprecated('makeColumnHoverTransform');
    return traverseColumn((col, {range}) => {
        if (!isLeafNode(col)) {
            return col;
        }
        const colIndexMatched = range.start <= hoverColIndex && hoverColIndex < range.end;
        const prevGetCellProps = col.getCellProps;
        return Object.assign(Object.assign({}, col), {
            getCellProps(value, record, rowIndex) {
                const prevCellProps = prevGetCellProps === null || prevGetCellProps === void 0 ? void 0 : prevGetCellProps(value, record, rowIndex);
                return mergeCellProps(prevCellProps, {
                    style: {'--bgcolor': colIndexMatched ? hoverColor : undefined},
                    onMouseEnter() {
                        onChangeHoverColIndex(range.start);
                    },
                    onMouseLeave() {
                        onChangeHoverColIndex(-1);
                    },
                });
            }
        });
    });
}

/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
function useColumnHoverTransform({hoverColor, defaultHoverColIndex = -1,} = {}) {
    const [hoverColIndex, onChangeHoverColIndex] = useState(defaultHoverColIndex);
    return makeColumnHoverTransform({hoverColor, hoverColIndex, onChangeHoverColIndex});
}

const EMPTY_RANGE$1 = {
    start: -1,
    end: -1,
};

/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
function makeColumnRangeHoverTransform({
                                           hoverColor = 'var(--hover-bgcolor)',
                                           headerHoverColor = 'var(--header-hover-bgcolor)',
                                           hoverRange,
                                           onChangeHoverRange,
                                       }) {
    warnTransformsDeprecated('makeColumnRangeHoverTransform');
    return traverseColumn((col, {range: colRange}) => {
        const match = colRange.end > hoverRange.start && hoverRange.end > colRange.start;
        if (!isLeafNode(col)) {
            if (headerHoverColor == null) {
                return col;
            }
            return Object.assign(Object.assign({}, col), {
                headerCellProps: mergeCellProps(col.headerCellProps, {
                    onMouseEnter() {
                        onChangeHoverRange(colRange);
                    },
                    onMouseLeave() {
                        onChangeHoverRange(EMPTY_RANGE$1);
                    },
                    style: {'--header-bgcolor': match ? headerHoverColor : undefined},
                })
            });
        }
        const prevGetCellProps = col.getCellProps;
        return Object.assign(Object.assign({}, col), {
            headerCellProps: mergeCellProps(col.headerCellProps, {
                onMouseEnter() {
                    onChangeHoverRange(colRange);
                },
                onMouseLeave() {
                    onChangeHoverRange(EMPTY_RANGE$1);
                },
                style: {'--header-bgcolor': match ? headerHoverColor : undefined},
            }), getCellProps(value, record, rowIndex) {
                const prevCellProps = prevGetCellProps === null || prevGetCellProps === void 0 ? void 0 : prevGetCellProps(value, record, rowIndex);
                return mergeCellProps(prevCellProps, {
                    onMouseEnter() {
                        onChangeHoverRange(colRange);
                    },
                    onMouseLeave() {
                        onChangeHoverRange(EMPTY_RANGE$1);
                    },
                    style: {'--bgcolor': match ? hoverColor : undefined},
                });
            }
        });
    });
}

/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
function useColumnHoverRangeTransform({hoverColor, headerHoverColor, defaultHoverRange = EMPTY_RANGE$1,} = {}) {
    const [hoverRange, onChangeHoverRange] = useState(defaultHoverRange);
    return makeColumnRangeHoverTransform({hoverColor, headerHoverColor, hoverRange, onChangeHoverRange});
}

function clamp$1(min, x, max) {
    return Math.max(min, Math.min(max, x));
}

const RESIZE_EXPANDER_CLS = 'resize-expander';
const ResizeHandle$1 = styled__default.span`
  position: absolute;
  top: 0;
  bottom: 0;
  right: -5px;
  width: 10px;
  cursor: col-resize;
  z-index: 1;
`;

/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
function makeColumnResizeTransform({
                                       sizes,
                                       onChangeSizes,
                                       minSize = 40,
                                       maxSize = Infinity,
                                       appendExpander,
                                       expanderVisibility = 'visible',
                                       disableUserSelectWhenResizing,
                                   }) {
    warnTransformsDeprecated('makeColumnResizeTransform');
    const startResize = (colIndex, e) => {
        const startX = e.clientX;
        const startSize = sizes[colIndex];
        const nextSizes$ = fromEvent(window, 'mousemove').pipe(op.takeUntil(fromEvent(window, 'mouseup')), op.map((e) => {
            const movingX = e.clientX;
            const nextSizes = sizes.slice();
            nextSizes[colIndex] = clamp$1(minSize, startSize + (movingX - startX), maxSize);
            return nextSizes;
        }));
        let prevUserSelect = '';
        let docElemStyle;
        if (disableUserSelectWhenResizing) {
            docElemStyle = document.documentElement.style;
            prevUserSelect = docElemStyle.userSelect;
            docElemStyle.userSelect = 'none';
        }
        nextSizes$.subscribe({
            next: onChangeSizes,
            complete() {
                if (disableUserSelectWhenResizing) {
                    docElemStyle.userSelect = prevUserSelect;
                }
            },
        });
    };
    const innerTransform = traverseColumn((col, {range}) => {
        var _a;
        if (!isLeafNode(col)) {
            return col;
        }
        const prevTitle = internals.safeRenderHeader(col);
        return Object.assign(Object.assign({}, col), {
            width: sizes[range.start],
            title: (React.createElement(React.Fragment, null,
                prevTitle,
                React.createElement(ResizeHandle$1, {
                    className: "resize-handle",
                    onMouseDown: (e) => startResize(range.start, e)
                }))),
            headerCellProps: Object.assign(Object.assign({}, col.headerCellProps), {
                style: Object.assign(Object.assign({}, (_a = col.headerCellProps) === null || _a === void 0 ? void 0 : _a.style), {
                    overflow: 'visible',
                    position: 'relative'
                })
            })
        });
    });
    return (input) => {
        const {columns, dataSource} = innerTransform(input);
        return {
            columns: appendExpander
                ? columns.concat([
                    {
                        name: '',
                        headerCellProps: {
                            className: RESIZE_EXPANDER_CLS,
                            style: {
                                background: expanderVisibility === 'hidden' ? 'var(--bgcolor)' : undefined,
                                border: expanderVisibility === 'hidden' ? 'none' : undefined,
                            },
                        },
                        getCellProps() {
                            return {
                                className: RESIZE_EXPANDER_CLS,
                                style: {visibility: expanderVisibility},
                            };
                        },
                    },
                ])
                : columns,
            dataSource,
        };
    };
}

/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
function useColumnResizeTransform(_a) {
    var {defaultSizes} = _a, others = __rest(_a, ["defaultSizes"]);
    const [sizes, onChangeSizes] = useState(defaultSizes);
    return makeColumnResizeTransform(Object.assign({sizes, onChangeSizes}, others));
}

/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
function makeFlattenTransform() {
    warnTransformsDeprecated('makeFlattenTransform');
    return traverseColumn((column) => {
        var _a;
        if (isLeafNode(column)) {
            return column;
        }
        return ((_a = column.features) === null || _a === void 0 ? void 0 : _a.flatten) ? column.children : column;
    });
}

/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
function makeOrderFieldTransform(startOrder = 1) {
    warnTransformsDeprecated('makeOrderFieldTransform');
    return traverseColumn((column) => {
        var _a, _b;
        if (((_a = column.features) === null || _a === void 0 ? void 0 : _a.order) || ((_b = column.features) === null || _b === void 0 ? void 0 : _b.orderField)) {
            return Object.assign(Object.assign({}, column), {
                getValue(record, index) {
                    return index + startOrder;
                }
            });
        }
        return column;
    });
}

function SortIcon$1({size = 32, style, className, order,}) {
    return (React.createElement("svg", {
            style: style,
            className: className,
            focusable: "false",
            preserveAspectRatio: "xMidYMid meet",
            width: size,
            height: size,
            viewBox: "0 0 32 32",
            "aria-hidden": "true"
        },
        React.createElement("path", {
            fill: order === 'asc' ? '#23A3FF' : '#bfbfbf',
            transform: "translate(0, 4)",
            d: "M8 8L16 0 24 8z"
        }),
        React.createElement("path", {
            fill: order === 'desc' ? '#23A3FF' : '#bfbfbf',
            transform: "translate(0, -4)",
            d: "M24 24L16 32 8 24z "
        })));
}

function DefaultSortHeaderCell$1({children, column, onToggle, sortOrder, sortIndex, sortOptions}) {
    // 通过 justify-content 来与 col.align 保持对齐方向一致
    const justifyContent = column.align === 'right' ? 'flex-end' : column.align === 'center' ? 'center' : 'flex-start';
    return (React.createElement(TableHeaderCell$1, {onClick: onToggle, style: {justifyContent}},
        children,
        React.createElement(SortIcon$1, {
            style: {userSelect: 'none', marginLeft: 2, flexShrink: 0},
            size: 16,
            order: sortOrder
        }),
        sortOptions.mode === 'multiple' && sortIndex != -1 && (React.createElement("div", {
            style: {
                userSelect: 'none',
                marginLeft: 2,
                color: '#666',
                flex: '0 0 auto',
                fontSize: 10,
                fontFamily: 'monospace',
            }
        }, sortIndex + 1))));
}

function hasAnySortableColumns$1(cols) {
    return cols.some((col) => {
        var _a;
        return Boolean((_a = col.features) === null || _a === void 0 ? void 0 : _a.sortable) || (!isLeafNode(col) && hasAnySortableColumns$1(col.children));
    });
}

const TableHeaderCell$1 = styled__default.div`
  cursor: pointer;
  display: flex;
  align-items: center;
`;

/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
function makeSortTransform({
                               sorts: inputSorts,
                               onChangeSorts: inputOnChangeSorts,
                               orders = ['desc', 'asc', 'none'],
                               mode = 'multiple',
                               SortHeaderCell = DefaultSortHeaderCell$1,
                               keepDataSource,
                               highlightColumnWhenActive,
                               stopClickEventPropagation,
                           }) {
    warnTransformsDeprecated('makeSortTransform');
    const filteredInputSorts = inputSorts.filter((s) => s.order !== 'none');
    // 单字段排序的情况下 sorts 中只有第一个排序字段才会生效
    const sorts = mode === 'multiple' ? filteredInputSorts : filteredInputSorts.slice(0, 1);
    const onChangeSorts = mode === 'multiple'
        ? inputOnChangeSorts
        : (nextSorts) => {
            // 单字段排序的情况下，nextSorts 中只有最后一个排序字段才会生效
            const len = nextSorts.length;
            inputOnChangeSorts(nextSorts.slice(len - 1));
        };
    const sortOptions = {
        sorts,
        onChangeSorts,
        orders,
        mode,
        keepDataSource,
        highlightColumnWhenActive,
        stopClickEventPropagation,
    };
    const sortMap = new Map(sorts.map((sort, index) => [sort.code, Object.assign({index}, sort)]));
    return ({dataSource, columns}) => {
        if (process.env.NODE_ENV !== 'production') {
            if (!hasAnySortableColumns$1(columns)) {
                console.warn('[ali-react-table-dist] commonTransform.sort 缺少可排序的列，请通过 column.features.sortable 来指定哪些列可排序', columns);
            }
        }
        return {columns: processColumns(columns), dataSource: processDataSource(dataSource)};

        function processDataSource(dataSource) {
            if (keepDataSource) {
                return dataSource;
            }
            const sortColumnsMap = new Map(collectNodes(columns, 'leaf-only')
                .filter((col) => {
                    var _a;
                    return ((_a = col.features) === null || _a === void 0 ? void 0 : _a.sortable) != null;
                })
                .map((col) => [col.code, col]));
            return layeredSort(dataSource, (x, y) => {
                for (const {code, order} of sorts) {
                    const column = sortColumnsMap.get(code);
                    // 如果 code 对应的 column 不可排序，我们跳过该 code
                    if (column == null) {
                        continue;
                    }
                    const sortable = column.features.sortable;
                    const compareFn = typeof sortable === 'function' ? sortable : smartCompare;
                    const xValue = internals.safeGetValue(column, x, -1);
                    const yValue = internals.safeGetValue(column, y, -1);
                    const cmp = compareFn(xValue, yValue);
                    if (cmp !== 0) {
                        return cmp * (order === 'asc' ? 1 : -1);
                    }
                }
                return 0;
            });
        }

        // 在「升序 - 降序 - 不排序」之间不断切换
        function toggle(code) {
            const sort = sortMap.get(code);
            if (sort == null) {
                onChangeSorts(sorts.concat([{code, order: orders[0]}]));
            } else {
                const index = sorts.findIndex((s) => s.code === code);
                const nextSorts = sorts.slice(0, index + 1);
                const nextOrder = getNextOrder(sort.order);
                if (nextOrder === 'none') {
                    nextSorts.pop();
                } else {
                    nextSorts[index] = Object.assign(Object.assign({}, nextSorts[index]), {order: nextOrder});
                }
                onChangeSorts(nextSorts);
            }
        }

        function processColumns(columns) {
            return columns.map(dfs);

            function dfs(col) {
                var _a;
                const result = Object.assign({}, col);
                const sortable = col.code && (((_a = col.features) === null || _a === void 0 ? void 0 : _a.sortable) || sortMap.has(col.code));
                const active = sortable && sortMap.has(col.code);
                if (sortable) {
                    let sortIndex = -1;
                    let sortOrder = 'none';
                    if (active) {
                        const {order, index} = sortMap.get(col.code);
                        sortOrder = order;
                        sortIndex = index;
                        if (highlightColumnWhenActive) {
                            result.headerCellProps = mergeCellProps(col.headerCellProps, {
                                style: {background: 'var(--header-highlight-bgcolor)'},
                            });
                            result.getCellProps = (value, row, rowIndex) => {
                                const prevCellProps = internals.safeGetCellProps(col, row, rowIndex);
                                return mergeCellProps(prevCellProps, {
                                    style: {background: 'var(--highlight-bgcolor)'},
                                });
                            };
                        }
                    }
                    result.title = (React.createElement(SortHeaderCell, {
                        onToggle: (e) => {
                            if (stopClickEventPropagation) {
                                e.stopPropagation();
                            }
                            toggle(col.code);
                        }, sortOrder: sortOrder, column: col, sortIndex: sortIndex, sortOptions: sortOptions
                    }, internals.safeRenderHeader(col)));
                }
                if (!isLeafNode(col)) {
                    result.children = col.children.map(dfs);
                }
                return result;
            }
        }
    };

    function getNextOrder(order) {
        const idx = orders.indexOf(order);
        return orders[idx === orders.length - 1 ? 0 : idx + 1];
    }
}

/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
function useSortTransform(_a = {}) {
    var {defaultSorts = []} = _a, others = __rest(_a, ["defaultSorts"]);
    const [sorts, onChangeSorts] = useState(defaultSorts);
    return makeSortTransform(Object.assign({sorts, onChangeSorts}, others));
}

const HeaderCellWithTips$1 = styled__default.div`
  display: flex;
  align-items: center;

  .tip-icon-wrapper {
    margin-left: 2px;
  }

  .tip-icon {
    display: flex;
    fill: currentColor;
  }
`;

/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
function makeTipsTransform({Balloon, Tooltip}) {
    warnTransformsDeprecated('makeTipsTransform');
    return traverseColumn((col) => {
        var _a;
        if (!((_a = col.features) === null || _a === void 0 ? void 0 : _a.tips)) {
            return col;
        }
        const justifyContent = col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start';
        return Object.assign(Object.assign({}, col), {
            title: (React.createElement(HeaderCellWithTips$1, {style: {justifyContent}},
                internals.safeRenderHeader(col),
                Balloon ? (
                    // fusion/hippo
                    React.createElement(Balloon, {
                        closable: false, trigger: React.createElement("div", {className: "tip-icon-wrapper"},
                            React.createElement(icons.Info, {className: "tip-icon"}))
                    }, col.features.tips)) : (
                    // antd
                    React.createElement(Tooltip, {title: col.features.tips},
                        React.createElement("div", {className: "tip-icon-wrapper"},
                            React.createElement(icons.Info, {className: "tip-icon"}))))))
        });
    });
}

function isIdentity(x, y) {
    return x === y;
}

function autoRowSpan() {
    return function autoRowSpanStep(pipeline) {
        const dataSource = pipeline.getDataSource();
        return pipeline.mapColumns(makeRecursiveMapper((col, {startIndex, endIndex}) => {
            var _a;
            if (!((_a = col.features) === null || _a === void 0 ? void 0 : _a.autoRowSpan)) {
                return col;
            }
            if (!isLeafNode(col)) {
                return col;
            }
            const isFunc = typeof col.features.autoRowSpan === 'function';
            const shouldMergeCell = isFunc ? col.features.autoRowSpan : isIdentity;
            const spanRects = [];
            let lastBottom = 0;
            let prevValue = null;
            let prevRow = null;
            for (let rowIndex = 0; rowIndex < dataSource.length; rowIndex++) {
                const row = dataSource[rowIndex];
                const value = internals.safeGetValue(col, row, rowIndex);
                if (rowIndex === 0 || !shouldMergeCell(prevValue, value, prevRow, row)) {
                    const spanRect = {
                        top: lastBottom,
                        bottom: rowIndex,
                        left: startIndex,
                        right: endIndex,
                    };
                    for (let i = lastBottom; i < rowIndex; i++) {
                        spanRects.push(spanRect);
                    }
                    lastBottom = rowIndex;
                }
                prevValue = value;
                prevRow = row;
            }
            for (let i = lastBottom; i < dataSource.length; i++) {
                spanRects.push({
                    top: lastBottom,
                    bottom: dataSource.length,
                    left: startIndex,
                    right: endIndex,
                });
            }
            return Object.assign(Object.assign({}, col), {
                getSpanRect(value, row, rowIndex) {
                    return spanRects[rowIndex];
                }
            });
        }));
    };
}

function buildTree(idProp, parentIdProp) {
    return (pipeline) => pipeline.mapDataSource((rows) => buildTree$1(idProp, parentIdProp, rows));
}

function columnHover(opts = {}) {
    const stateKey = 'columnHover';
    return (pipeline) => {
        var _a, _b, _c, _d;
        const hoverColor = (_a = opts.hoverColor) !== null && _a !== void 0 ? _a : 'var(--hover-bgcolor)';
        const hoverColIndex = (_d = (_c = (_b = opts.hoverColIndex) !== null && _b !== void 0 ? _b : pipeline.getStateAtKey(stateKey)) !== null && _c !== void 0 ? _c : opts.defaultHoverColIndex) !== null && _d !== void 0 ? _d : -1;
        const onChangeHoverColIndex = (nextColIndex) => {
            var _a;
            pipeline.setStateAtKey(stateKey, nextColIndex);
            (_a = opts.onChangeHoverColIndex) === null || _a === void 0 ? void 0 : _a.call(opts, nextColIndex);
        };
        return pipeline.mapColumns(makeRecursiveMapper((col, {startIndex, endIndex}) => {
            const range = {start: startIndex, end: endIndex};
            if (!isLeafNode(col)) {
                return col;
            }
            const colIndexMatched = range.start <= hoverColIndex && hoverColIndex < range.end;
            const prevGetCellProps = col.getCellProps;
            return Object.assign(Object.assign({}, col), {
                getCellProps(value, record, rowIndex) {
                    const prevCellProps = prevGetCellProps === null || prevGetCellProps === void 0 ? void 0 : prevGetCellProps(value, record, rowIndex);
                    return mergeCellProps(prevCellProps, {
                        style: {'--bgcolor': colIndexMatched ? hoverColor : undefined},
                        onMouseEnter() {
                            onChangeHoverColIndex(range.start);
                        },
                        onMouseLeave() {
                            onChangeHoverColIndex(-1);
                        },
                    });
                }
            });
        }));
    };
}

const EMPTY_RANGE = {
    start: -1,
    end: -1,
};

function columnRangeHover(opts = {}) {
    const stateKey = 'columnHover';
    return function columnRangeHoverStep(pipeline) {
        var _a, _b, _c, _d, _e;
        const hoverRange = (_c = (_b = (_a = opts.hoverRange) !== null && _a !== void 0 ? _a : pipeline.getStateAtKey(stateKey)) !== null && _b !== void 0 ? _b : opts.defaultHoverRange) !== null && _c !== void 0 ? _c : EMPTY_RANGE;
        const hoverColor = (_d = opts.hoverColor) !== null && _d !== void 0 ? _d : 'var(--hover-bgcolor)';
        const headerHoverColor = (_e = opts.headerHoverColor) !== null && _e !== void 0 ? _e : 'var(--header-hover-bgcolor)';
        const onChangeHoverRange = (nextColIndexRange) => {
            var _a;
            pipeline.setStateAtKey(stateKey, nextColIndexRange);
            (_a = opts.onChangeHoverRange) === null || _a === void 0 ? void 0 : _a.call(opts, nextColIndexRange);
        };
        return pipeline.mapColumns(makeRecursiveMapper((col, {startIndex, endIndex}) => {
            const colRange = {start: startIndex, end: endIndex};
            const match = colRange.end > hoverRange.start && hoverRange.end > colRange.start;
            if (!isLeafNode(col)) {
                if (headerHoverColor == null) {
                    return col;
                }
                return Object.assign(Object.assign({}, col), {
                    headerCellProps: mergeCellProps(col.headerCellProps, {
                        onMouseEnter() {
                            onChangeHoverRange(colRange);
                        },
                        onMouseLeave() {
                            onChangeHoverRange(EMPTY_RANGE);
                        },
                        style: {'--header-bgcolor': match ? headerHoverColor : undefined},
                    })
                });
            }
            const prevGetCellProps = col.getCellProps;
            return Object.assign(Object.assign({}, col), {
                headerCellProps: mergeCellProps(col.headerCellProps, {
                    onMouseEnter() {
                        onChangeHoverRange(colRange);
                    },
                    onMouseLeave() {
                        onChangeHoverRange(EMPTY_RANGE);
                    },
                    style: {'--header-bgcolor': match ? headerHoverColor : undefined},
                }), getCellProps(value, record, rowIndex) {
                    const prevCellProps = prevGetCellProps === null || prevGetCellProps === void 0 ? void 0 : prevGetCellProps(value, record, rowIndex);
                    return mergeCellProps(prevCellProps, {
                        onMouseEnter() {
                            onChangeHoverRange(colRange);
                        },
                        onMouseLeave() {
                            onChangeHoverRange(EMPTY_RANGE);
                        },
                        style: {'--bgcolor': match ? hoverColor : undefined},
                    });
                }
            });
        }));
    };
}

function clamp(min, x, max) {
    return Math.max(min, Math.min(max, x));
}

const ResizeHandle = styled__default.span`
  position: absolute;
  top: 0;
  bottom: 0;
  right: -5px;
  width: 10px;
  cursor: col-resize;
  z-index: 1;
  transition: background-color 200ms;

  background: ${(props) => {
    return props['var-handleBackground'];
}};

  &:hover {
    background: ${(props) => {
    return props['var-handleHoverBackground'];
}};
  }
`;

function columnResize(opts = {}) {
    var _a, _b, _c, _d;
    const stateKey = 'columnResize';
    const disableUserSelectWhenResizing = (_a = opts.disableUserSelectWhenResizing) !== null && _a !== void 0 ? _a : true;
    const minSize = (_b = opts.minSize) !== null && _b !== void 0 ? _b : 60;
    const fallbackSize = (_c = opts.fallbackSize) !== null && _c !== void 0 ? _c : 150;
    const maxSize = (_d = opts.maxSize) !== null && _d !== void 0 ? _d : 1000;
    return function columnResizeFeature(pipeline) {
        var _a, _b, _c;
        const sizes = (_c = (_b = (_a = opts.sizes) !== null && _a !== void 0 ? _a : pipeline.getStateAtKey(stateKey)) !== null && _b !== void 0 ? _b : opts.defaultSizes) !== null && _c !== void 0 ? _c : [];
        const leafColumns = collectNodes(pipeline.getColumns(), 'leaf-only');
        leafColumns.forEach((col, colIndex) => {
            if (sizes[colIndex] == null) {
                if (typeof col.width === 'number') {
                    sizes[colIndex] = col.width;
                } else {
                    sizes[colIndex] = fallbackSize;
                }
            }
        });
        const onChangeSizes = (nextSizes) => {
            var _a;
            pipeline.setStateAtKey(stateKey, nextSizes);
            (_a = opts.onChangeSizes) === null || _a === void 0 ? void 0 : _a.call(opts, nextSizes);
        };
        const startResize = (startIndex, endIndex, e) => {
            const startX = e.clientX;
            const target = e.target;
            const nextSizes$ = fromEvent(window, 'mousemove').pipe(op.takeUntil(fromEvent(window, 'mouseup')), op.map((e) => {
                const movingX = e.clientX;
                const nextSizes = sizes.slice();
                const deltaSum = movingX - startX;
                const sizeSum = sizes.slice(startIndex, endIndex).reduce((sum, s) => sum + s, 0);
                let deltaRemaining = deltaSum;
                for (let colIndex = startIndex; colIndex < endIndex - 1; colIndex++) {
                    const startSize = sizes[colIndex];
                    // 将每一列的宽度变化量 都四舍五入至 整数，不然看起来非常难受
                    const colDelta = Math.round(deltaSum * (startSize / sizeSum));
                    nextSizes[colIndex] = clamp(minSize, startSize + colDelta, maxSize);
                    deltaRemaining -= colDelta;
                }
                // 因为前面的列宽都进行了四舍五入，最后一列的变化量需要使用 deltaRemaining 以避免误差
                nextSizes[endIndex - 1] = clamp(minSize, sizes[endIndex - 1] + deltaRemaining, maxSize);
                return nextSizes;
            }));
            let prevUserSelect = '';
            let docElemStyle;
            if (disableUserSelectWhenResizing) {
                docElemStyle = document.documentElement.style;
                prevUserSelect = docElemStyle.userSelect;
                docElemStyle.userSelect = 'none';
            }
            if (opts.handleActiveBackground) {
                target.style.background = opts.handleActiveBackground;
            }
            nextSizes$.subscribe({
                next: onChangeSizes,
                complete() {
                    if (disableUserSelectWhenResizing) {
                        docElemStyle.userSelect = prevUserSelect;
                    }
                    if (opts.handleActiveBackground) {
                        target.style.background = '';
                    }
                },
            });
        };
        return pipeline.mapColumns(makeRecursiveMapper((col, {startIndex, endIndex}) => {
            const prevTitle = internals.safeRenderHeader(col);
            return Object.assign(Object.assign({}, col), {
                width: sizes[startIndex], title: (React.createElement(React.Fragment, null,
                    prevTitle,
                    React.createElement(ResizeHandle, {
                        className: "resize-handle",
                        "var-handleBackground": opts.handleBackground,
                        "var-handleHoverBackground": opts.handleHoverBackground,
                        onMouseDown: (e) => startResize(startIndex, endIndex, e)
                    }))), headerCellProps: mergeCellProps(col.headerCellProps, {
                    style: {
                        overflow: 'visible',
                        position: 'relative',
                    },
                })
            });
        }));
    };
}

function multiSelect(opts = {}) {
    return function multiSelectStep(pipeline) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const stateKey = 'multiSelect';
        const Checkbox = pipeline.ctx.components.Checkbox;
        if (Checkbox == null) {
            throw new Error('使用 multiSelect 之前需要设置 pipeline.ctx.components.Checkbox');
        }
        const primaryKey = pipeline.ensurePrimaryKey('multiSelect');
        const isDisabled = (_a = opts.isDisabled) !== null && _a !== void 0 ? _a : always(false);
        const clickArea = (_b = opts.clickArea) !== null && _b !== void 0 ? _b : 'checkbox';
        const value = (_f = (_e = (_c = opts.value) !== null && _c !== void 0 ? _c : (_d = pipeline.getStateAtKey(stateKey)) === null || _d === void 0 ? void 0 : _d.value) !== null && _e !== void 0 ? _e : opts.defaultValue) !== null && _f !== void 0 ? _f : [];
        const lastKey = (_k = (_j = (_g = opts.lastKey) !== null && _g !== void 0 ? _g : (_h = pipeline.getStateAtKey(stateKey)) === null || _h === void 0 ? void 0 : _h.lastKey) !== null && _j !== void 0 ? _j : opts.defaultLastKey) !== null && _k !== void 0 ? _k : '';
        const onChange = (nextValue, key, keys, action) => {
            var _a;
            (_a = opts.onChange) === null || _a === void 0 ? void 0 : _a.call(opts, nextValue, key, keys, action);
            pipeline.setStateAtKey(stateKey, {value: nextValue, lastKey: key}, {keys, action});
        };
        const dataSource = pipeline.getDataSource();
        /** dataSource 中包含的所有 keys */
        const fullKeySet = new Set();
        /** 所有有效的 keys（disable 状态为 false） */
        const allKeys = [];
        dataSource.forEach((row, rowIndex) => {
            const rowKey = internals.safeGetRowKey(primaryKey, row, rowIndex);
            fullKeySet.add(rowKey);
            // 在 allKeys 中排除被禁用的 key
            if (!isDisabled(row, rowIndex)) {
                allKeys.push(rowKey);
            }
        });
        const set = new Set(value);
        const isAllChecked = allKeys.length > 0 && allKeys.every((key) => set.has(key));
        const isAnyChecked = allKeys.some((key) => set.has(key));
        const defaultCheckboxColumnTitle = (React.createElement(Checkbox, {
            checked: isAllChecked, indeterminate: !isAllChecked && isAnyChecked, onChange: (_) => {
                if (isAllChecked) {
                    onChange(arrayUtils.diff(value, allKeys), '', allKeys, 'uncheck-all');
                } else {
                    onChange(arrayUtils.merge(value, allKeys), '', allKeys, 'check-all');
                }
            }
        }));
        const checkboxColumn = Object.assign(Object.assign({
            name: '是否选中',
            title: defaultCheckboxColumnTitle,
            width: 50,
            align: 'center'
        }, opts.checkboxColumn), {
            getCellProps(value, row, rowIndex) {
                const rowKey = internals.safeGetRowKey(primaryKey, row, rowIndex);
                if (fullKeySet.has(rowKey) && clickArea === 'cell') {
                    const prevChecked = set.has(rowKey);
                    const disabled = isDisabled(row, rowIndex);
                    return {
                        style: {cursor: disabled ? 'not-allowed' : 'pointer'},
                        onClick: disabled
                            ? undefined
                            : (e) => {
                                if (opts.stopClickEventPropagation) {
                                    e.stopPropagation();
                                }
                                onCheckboxChange(prevChecked, rowKey, e.shiftKey);
                            },
                    };
                }
            },
            render(_, row, rowIndex) {
                const key = internals.safeGetRowKey(primaryKey, row, rowIndex);
                const checked = set.has(key);
                return (React.createElement(Checkbox, {
                    checked: checked, disabled: isDisabled(row, rowIndex), onChange: clickArea === 'checkbox'
                        ? (arg1, arg2) => {
                            var _a;
                            // 这里要同时兼容 antd 和 fusion 的用法
                            // fusion: arg2?.nativeEvent
                            // antd: arg1.nativeEvent
                            const nativeEvent = (_a = arg2 === null || arg2 === void 0 ? void 0 : arg2.nativeEvent) !== null && _a !== void 0 ? _a : arg1.nativeEvent;
                            if (nativeEvent) {
                                if (opts.stopClickEventPropagation) {
                                    nativeEvent.stopPropagation();
                                }
                                onCheckboxChange(checked, key, nativeEvent.shiftKey);
                            }
                        }
                        : undefined
                }));
            }
        });
        const nextColumns = pipeline.getColumns().slice();
        const checkboxPlacement = (_l = opts.checkboxPlacement) !== null && _l !== void 0 ? _l : 'start';
        if (checkboxPlacement === 'start') {
            nextColumns.unshift(checkboxColumn);
        } else {
            nextColumns.push(checkboxColumn);
        }
        pipeline.columns(nextColumns);
        pipeline.appendRowPropsGetter((row, rowIndex) => {
            const rowKey = internals.safeGetRowKey(primaryKey, row, rowIndex);
            if (!fullKeySet.has(rowKey)) {
                // rowKey 不在 fullKeySet 中说明这一行是在 multiSelect 之后才生成的，multiSelect 不对之后生成的行进行处理
                return;
            }
            let style = {};
            let className;
            let onClick;
            const checked = set.has(rowKey);
            if (opts.highlightRowWhenSelected && checked) {
                className = 'highlight';
            }
            if (clickArea === 'row') {
                const disabled = isDisabled(row, rowIndex);
                if (!disabled) {
                    style.cursor = 'pointer';
                    onClick = (e) => {
                        if (opts.stopClickEventPropagation) {
                            e.stopPropagation();
                        }
                        onCheckboxChange(checked, rowKey, e.shiftKey);
                    };
                }
            }
            return {className, style, onClick};
        });
        return pipeline;

        function onCheckboxChange(prevChecked, key, batch) {
            let batchKeys = [key];
            if (batch && lastKey) {
                const lastIdx = allKeys.indexOf(lastKey);
                const cntIdx = allKeys.indexOf(key);
                const [start, end] = lastIdx < cntIdx ? [lastIdx, cntIdx] : [cntIdx, lastIdx];
                batchKeys = allKeys.slice(start, end + 1);
            }
            if (prevChecked) {
                onChange(arrayUtils.diff(value, batchKeys), key, batchKeys, 'uncheck');
            } else {
                onChange(arrayUtils.merge(value, batchKeys), key, batchKeys, 'check');
            }
        }
    };
}

const rowDetailSymbol = Symbol('row-detail');
const fallbackRenderDetail = () => (React.createElement("div", {style: {margin: '8px 24px'}},
    React.createElement("b", {style: {color: 'indianred'}},
        "\u8BBE\u7F6E ",
        React.createElement("code", null, "rowDetail.renderDetail"),
        " \u6765\u81EA\u5B9A\u4E49\u8BE6\u60C5\u5185\u5BB9")));

function rowDetail(opts = {}) {
    return function rowDetailStep(pipeline) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const stateKey = 'rowDetail';
        const primaryKey = pipeline.ensurePrimaryKey('rowDetail');
        if (typeof primaryKey !== 'string') {
            throw new Error('rowDetail 仅支持字符串作为 primaryKey');
        }
        const rowDetailMetaKey = (_a = opts.rowDetailMetaKey) !== null && _a !== void 0 ? _a : rowDetailSymbol;
        const indents = pipeline.ctx.indents;
        const textOffset = indents.iconIndent + indents.iconWidth + indents.iconGap;
        const clickArea = (_b = opts.clickArea) !== null && _b !== void 0 ? _b : 'cell';
        const getDetailKey = (_c = opts.getDetailKey) !== null && _c !== void 0 ? _c : ((row) => row[primaryKey] + '_detail');
        const renderDetail = (_d = opts.renderDetail) !== null && _d !== void 0 ? _d : fallbackRenderDetail;
        const hasDetail = (_e = opts.hasDetail) !== null && _e !== void 0 ? _e : always(true);
        const openKeys = (_h = (_g = (_f = opts.openKeys) !== null && _f !== void 0 ? _f : pipeline.getStateAtKey(stateKey)) !== null && _g !== void 0 ? _g : (opts.defaultOpenAll
            ? pipeline
                .getDataSource()
                .filter(hasDetail)
                .map((row) => row[primaryKey])
            : opts.defaultOpenKeys)) !== null && _h !== void 0 ? _h : [];
        const onChangeOpenKeys = (nextKeys, key, action) => {
            var _a;
            (_a = opts.onChangeOpenKeys) === null || _a === void 0 ? void 0 : _a.call(opts, nextKeys, key, action);
            pipeline.setStateAtKey(stateKey, nextKeys, {key, action});
        };
        const openKeySet = new Set(openKeys);
        const toggle = (rowKey) => {
            const expanded = openKeySet.has(rowKey);
            if (expanded) {
                onChangeOpenKeys(openKeys.filter((key) => key !== rowKey), rowKey, 'collapse');
            } else {
                onChangeOpenKeys([...openKeys, rowKey], rowKey, 'expand');
            }
        };
        return pipeline
            .dataSource(flatMap(pipeline.getDataSource(), (row, rowIndex) => {
                if (openKeySet.has(row[primaryKey])) {
                    return [row, Object.assign(Object.assign({[rowDetailMetaKey]: true}, row), {[primaryKey]: getDetailKey(row, rowIndex)})];
                } else {
                    return [row];
                }
            }))
            .columns(processColumns(pipeline.getColumns()))
            .appendRowPropsGetter((row) => {
                if (row[rowDetailMetaKey]) {
                    return {className: 'no-hover'};
                }
            });

        function processColumns(columns) {
            if (columns.length === 0) {
                return columns;
            }
            const columnFlatCount = collectNodes(columns, 'leaf-only').length;
            const [firstCol, ...others] = columns;
            const render = (value, row, rowIndex) => {
                if (row[rowDetailMetaKey]) {
                    return renderDetail(row, rowIndex);
                }
                const content = internals.safeRender(firstCol, row, rowIndex);
                if (!hasDetail(row, rowIndex)) {
                    return React.createElement(InlineFlexCell, {style: {marginLeft: textOffset}}, content);
                }
                const rowKey = row[primaryKey];
                const expanded = openKeySet.has(rowKey);
                const onClick = (e) => {
                    if (opts.stopClickEventPropagation) {
                        e.stopPropagation();
                    }
                    toggle(rowKey);
                };
                const expandCls = expanded ? 'expanded' : 'collapsed';
                return (React.createElement(ExpansionCell, {
                        className: cx('expansion-cell', expandCls),
                        style: {cursor: clickArea === 'content' ? 'pointer' : undefined},
                        onClick: clickArea === 'content' ? onClick : undefined
                    },
                    React.createElement(icons.CaretRight, {
                        style: {
                            cursor: clickArea === 'icon' ? 'pointer' : undefined,
                            marginLeft: indents.iconIndent,
                            marginRight: indents.iconGap,
                        },
                        className: cx('expansion-icon', expandCls),
                        onClick: clickArea === 'icon' ? onClick : undefined
                    }),
                    content));
            };
            const getCellProps = (value, row, rowIndex) => {
                var _a;
                if (row[rowDetailMetaKey]) {
                    return {
                        style: Object.assign({'--cell-padding': '0', overflow: 'hidden'}, opts.detailCellStyle),
                    };
                }
                const prevProps = (_a = firstCol.getCellProps) === null || _a === void 0 ? void 0 : _a.call(firstCol, value, row, rowIndex);
                if (!hasDetail(row, rowIndex)) {
                    return prevProps;
                }
                return mergeCellProps(prevProps, {
                    onClick(e) {
                        if (opts.stopClickEventPropagation) {
                            e.stopPropagation();
                        }
                        toggle(row[primaryKey]);
                    },
                    style: {cursor: 'pointer'},
                });
            };
            return [
                Object.assign(Object.assign({}, firstCol), {
                    title: (React.createElement("div", {
                        style: {
                            display: 'inline-block',
                            marginLeft: textOffset
                        }
                    }, internals.safeRenderHeader(firstCol))),
                    render,
                    getCellProps: clickArea === 'cell' ? getCellProps : firstCol.getCellProps,
                    getSpanRect(value, row, rowIndex) {
                        if (row[rowDetailMetaKey]) {
                            // detail 总是成一行
                            return {top: rowIndex, bottom: rowIndex + 1, left: 0, right: columnFlatCount};
                        }
                    }
                }),
                ...others,
            ];
        }
    };
}

const groupingMetaSymbol = Symbol('row-grouping-meta');

function attachGroupingMeta(row) {
    return Object.assign({[groupingMetaSymbol]: {expandable: !isLeafNode(row)}}, row);
}

function getGroupingMeta(row) {
    if (row[groupingMetaSymbol] == null) {
        return {isGroupHeader: false, expandable: false};
    }
    return {isGroupHeader: true, expandable: row[groupingMetaSymbol].expandable};
}

function rowGroupingRowPropsGetter(row) {
    if (getGroupingMeta(row).isGroupHeader) {
        return {className: 'alternative'};
    }
}

function rowGrouping(opts = {}) {
    return (pipeline) => {
        var _a, _b, _c;
        const stateKey = 'rowGrouping';
        const indents = pipeline.ctx.indents;
        const textOffset = indents.iconIndent + indents.iconWidth + indents.iconGap;
        const primaryKey = pipeline.ensurePrimaryKey('rowGrouping');
        if (typeof primaryKey !== 'string') {
            throw new Error('rowGrouping 仅支持字符串作为 primaryKey');
        }
        const openKeys = (_c = (_b = (_a = opts.openKeys) !== null && _a !== void 0 ? _a : pipeline.getStateAtKey(stateKey)) !== null && _b !== void 0 ? _b : (opts.defaultOpenAll ? pipeline.getDataSource().map((row) => row[primaryKey]) : opts.defaultOpenKeys)) !== null && _c !== void 0 ? _c : [];
        const openKeySet = new Set(openKeys);
        const onChangeOpenKeys = (nextKeys, key, action) => {
            var _a;
            (_a = opts.onChangeOpenKeys) === null || _a === void 0 ? void 0 : _a.call(opts, nextKeys, key, action);
            pipeline.setStateAtKey(stateKey, nextKeys, {key, action});
        };
        return pipeline
            .mapDataSource(processDataSource)
            .mapColumns(processColumns)
            .appendRowPropsGetter(rowGroupingRowPropsGetter);

        function processDataSource(input) {
            return flatMap(input, (row) => {
                let result = [attachGroupingMeta(row)];
                const expanded = openKeySet.has(row[primaryKey]);
                if (expanded) {
                    if (Array.isArray(row.children)) {
                        result = result.concat(row.children);
                    }
                }
                return result;
            });
        }

        function processColumns(columns) {
            if (columns.length === 0) {
                return columns;
            }
            const columnFlatCount = collectNodes(columns, 'leaf-only').length;
            const [firstCol, ...others] = columns;
            const render = (value, row, rowIndex) => {
                var _a, _b;
                const content = internals.safeRender(firstCol, row, rowIndex);
                const meta = getGroupingMeta(row);
                if (!meta.isGroupHeader || !meta.expandable) {
                    const marginLeft = textOffset + (meta.isGroupHeader ? 0 : indents.indentSize);
                    return (React.createElement(InlineFlexCell, {style: {marginLeft}}, meta.isGroupHeader ? (_a = row.groupTitle) !== null && _a !== void 0 ? _a : content : content));
                }
                const expanded = openKeySet.has(row[primaryKey]);
                const expandCls = expanded ? 'expanded' : 'collapsed';
                return (React.createElement(ExpansionCell, {className: cx('expansion-cell', expandCls)},
                    React.createElement(icons.CaretRight, {
                        className: cx('expansion-icon', expandCls),
                        style: {marginLeft: indents.iconIndent, marginRight: indents.iconGap}
                    }), (_b = row.groupTitle) !== null && _b !== void 0 ? _b : content));
            };
            const getCellProps = (value, row, rowIndex) => {
                var _a;
                const meta = getGroupingMeta(row);
                if (!meta.isGroupHeader) {
                    return;
                }
                const {expandable} = meta;
                const rowKey = row[primaryKey];
                const expanded = openKeySet.has(rowKey);
                let onClick;
                if (expandable) {
                    onClick = (e) => {
                        if (opts.stopClickEventPropagation) {
                            e.stopPropagation();
                        }
                        if (expanded) {
                            onChangeOpenKeys(openKeys.filter((key) => key !== rowKey), rowKey, 'collapse');
                        } else {
                            onChangeOpenKeys([...openKeys, rowKey], rowKey, 'expand');
                        }
                    };
                }
                const prevProps = (_a = firstCol.getCellProps) === null || _a === void 0 ? void 0 : _a.call(firstCol, value, row, rowIndex);
                return mergeCellProps(prevProps, {
                    onClick,
                    style: {cursor: expandable ? 'pointer' : undefined},
                });
            };
            return [
                Object.assign(Object.assign({}, firstCol), {
                    title: (React.createElement("div", {
                        style: {
                            display: 'inline-block',
                            marginLeft: textOffset
                        }
                    }, internals.safeRenderHeader(firstCol))), render,
                    getCellProps, getSpanRect(value, row, rowIndex) {
                        if (getGroupingMeta(row).isGroupHeader) {
                            return {top: rowIndex, bottom: rowIndex + 1, left: 0, right: columnFlatCount};
                        }
                    }
                }),
                ...others,
            ];
        }
    };
}

function getFirstDefinedValue(...values) {
    for (let i = 0; i < values.length; i++) {
        const v = values[i];
        if (v !== undefined) {
            return v;
        }
    }
}

function singleSelect(opts = {}) {
    return function singleSelectStep(pipeline) {
        var _a, _b, _c;
        const Radio = pipeline.ctx.components.Radio;
        if (Radio == null) {
            throw new Error('使用 singleSelect 之前需要通过 pipeline context 设置 components.Radio');
        }
        const stateKey = 'singleSelect';
        const clickArea = (_a = opts.clickArea) !== null && _a !== void 0 ? _a : 'radio';
        const isDisabled = (_b = opts.isDisabled) !== null && _b !== void 0 ? _b : always(false);
        const primaryKey = pipeline.ensurePrimaryKey('singleSelect');
        const value = getFirstDefinedValue(opts.value, pipeline.getStateAtKey(stateKey), opts.defaultValue);
        const onChange = (rowKey) => {
            var _a;
            (_a = opts.onChange) === null || _a === void 0 ? void 0 : _a.call(opts, rowKey);
            pipeline.setStateAtKey(stateKey, rowKey);
        };
        const radioColumn = Object.assign(Object.assign({name: '', width: 50, align: 'center'}, opts.radioColumn), {
            getCellProps(value, row, rowIndex) {
                if (clickArea === 'cell') {
                    const rowKey = internals.safeGetRowKey(primaryKey, row, rowIndex);
                    const disabled = isDisabled(row, rowIndex);
                    return {
                        style: {cursor: disabled ? 'not-allowed' : 'pointer'},
                        onClick: disabled
                            ? undefined
                            : (e) => {
                                if (opts.stopClickEventPropagation) {
                                    e.stopPropagation();
                                }
                                onChange(rowKey);
                            },
                    };
                }
            }, render: (_, row, rowIndex) => {
                const rowKey = internals.safeGetRowKey(primaryKey, row, rowIndex);
                return (React.createElement(Radio, {
                    checked: value === rowKey, disabled: isDisabled(row, rowIndex), onChange: clickArea === 'radio'
                        ? (arg1, arg2) => {
                            var _a;
                            const nativeEvent = (_a = arg2 === null || arg2 === void 0 ? void 0 : arg2.nativeEvent) !== null && _a !== void 0 ? _a : arg1 === null || arg1 === void 0 ? void 0 : arg1.nativeEvent;
                            if (nativeEvent && opts.stopClickEventPropagation) {
                                nativeEvent.stopPropagation();
                            }
                            onChange(rowKey);
                        }
                        : undefined
                }));
            }
        });
        const nextColumns = pipeline.getColumns().slice();
        const radioPlacement = (_c = opts.radioPlacement) !== null && _c !== void 0 ? _c : 'start';
        if (radioPlacement === 'start') {
            nextColumns.unshift(radioColumn);
        } else {
            nextColumns.push(radioColumn);
        }
        pipeline.columns(nextColumns);
        pipeline.appendRowPropsGetter((row, rowIndex) => {
            const rowKey = internals.safeGetRowKey(primaryKey, row, rowIndex);
            let style = {};
            let className;
            let onClick;
            if (opts.highlightRowWhenSelected) {
                if (value === rowKey) {
                    className = 'highlight';
                }
            }
            if (clickArea === 'row' && !isDisabled(row, rowIndex)) {
                style.cursor = 'pointer';
                onClick = (e) => {
                    if (opts.stopClickEventPropagation) {
                        e.stopPropagation();
                    }
                    onChange(rowKey);
                };
            }
            return {className, style, onClick};
        });
        return pipeline;
    };
}

function SortIcon({size = 32, style, className, order, onClick}) {
    return (React.createElement("svg", {
            style: style,
            className: className,
            focusable: "false",
            preserveAspectRatio: "xMidYMid meet",
            width: size,
            height: size,
            viewBox: "0 0 32 32",
            "aria-hidden": "true",
            onClick: onClick
        },
        React.createElement("path", {
            fill: order === 'asc' ? '#23A3FF' : '#bfbfbf',
            transform: "translate(0, 4)",
            d: "M8 8L16 0 24 8z"
        }),
        React.createElement("path", {
            fill: order === 'desc' ? '#23A3FF' : '#bfbfbf',
            transform: "translate(0, -4)",
            d: "M24 24L16 32 8 24z "
        })));
}

function DefaultSortHeaderCell({children, column, onToggle, sortOrder, sortIndex, sortOptions, clickArea,}) {
    // 通过 justify-content 来与 col.align 保持对齐方向一致
    const justifyContent = column.align === 'right' ? 'flex-end' : column.align === 'center' ? 'center' : 'flex-start';
    return (React.createElement(TableHeaderCell, {
            onClick: clickArea === 'content' ? onToggle : undefined, style: {
                justifyContent,
                cursor: clickArea === 'content' ? 'pointer' : undefined,
            }
        },
        children,
        React.createElement(SortIcon, {
            onClick: clickArea === 'icon' ? onToggle : undefined, style: {
                userSelect: 'none',
                marginLeft: 2,
                flexShrink: 0,
                cursor: clickArea === 'icon' ? 'pointer' : undefined,
            }, size: 16, order: sortOrder
        }),
        sortOptions.mode === 'multiple' && sortIndex != -1 && (React.createElement("div", {
            style: {
                userSelect: 'none',
                marginLeft: 2,
                color: '#666',
                flex: '0 0 auto',
                fontSize: 10,
                fontFamily: 'monospace',
            }
        }, sortIndex + 1))));
}

function hasAnySortableColumns(cols) {
    return cols.some((col) => {
        var _a;
        return Boolean((_a = col.features) === null || _a === void 0 ? void 0 : _a.sortable) || (!isLeafNode(col) && hasAnySortableColumns(col.children));
    });
}

const TableHeaderCell = styled__default.div`
  display: flex;
  align-items: center;
`;
const stateKey = 'sort';

function sort(opts = {}) {
    return function sortStep(pipeline) {
        var _a, _b, _c;
        const {
            orders = ['desc', 'asc', 'none'],
            mode = 'multiple',
            SortHeaderCell = DefaultSortHeaderCell,
            keepDataSource,
            highlightColumnWhenActive,
            stopClickEventPropagation,
            clickArea = 'content',
        } = opts;
        const inputSorts = (_c = (_b = (_a = opts.sorts) !== null && _a !== void 0 ? _a : pipeline.getStateAtKey(stateKey)) !== null && _b !== void 0 ? _b : opts.defaultSorts) !== null && _c !== void 0 ? _c : [];
        const activeSorts = inputSorts.filter((s) => s.order !== 'none');
        // 单字段排序的情况下 sorts 中只有第一个排序字段才会生效
        const sorts = mode === 'multiple' ? activeSorts : activeSorts.slice(0, 1);
        const onChangeSortsInMultipleMode = (nextSorts) => {
            var _a;
            (_a = opts.onChangeSorts) === null || _a === void 0 ? void 0 : _a.call(opts, nextSorts);
            pipeline.setStateAtKey(stateKey, nextSorts);
        };
        const onChangeSorts = mode === 'multiple'
            ? onChangeSortsInMultipleMode
            : (nextSorts) => {
                // 单字段排序的情况下，nextSorts 中只有最后一个排序字段才会生效
                const len = nextSorts.length;
                onChangeSortsInMultipleMode(nextSorts.slice(len - 1));
            };
        const sortOptions = {
            sorts,
            onChangeSorts,
            orders,
            mode,
            keepDataSource,
            highlightColumnWhenActive,
            stopClickEventPropagation,
            clickArea,
        };
        const sortMap = new Map(sorts.map((sort, index) => [sort.code, Object.assign({index}, sort)]));
        const dataSource = pipeline.getDataSource();
        const columns = pipeline.getColumns();
        if (process.env.NODE_ENV !== 'production') {
            if (!hasAnySortableColumns(columns)) {
                console.warn('[ali-react-table-dist] commonTransform.sort 缺少可排序的列，请通过 column.features.sortable 来指定哪些列可排序', columns);
            }
        }
        pipeline.dataSource(processDataSource(dataSource));
        pipeline.columns(processColumns(columns));
        return pipeline;

        function processDataSource(dataSource) {
            if (keepDataSource) {
                return dataSource;
            }
            const sortColumnsMap = new Map(collectNodes(columns, 'leaf-only')
                .filter((col) => {
                    var _a, _b;
                    return ((_a = col.features) === null || _a === void 0 ? void 0 : _a.sortable) !== false && ((_b = col.features) === null || _b === void 0 ? void 0 : _b.sortable) != null;
                })
                .map((col) => [col.code, col]));
            return layeredSort(dataSource, (x, y) => {
                for (const {code, order} of sorts) {
                    const column = sortColumnsMap.get(code);
                    // 如果 code 对应的 column 不可排序，我们跳过该 code
                    if (column == null) {
                        continue;
                    }
                    const sortable = column.features.sortable;
                    const compareFn = typeof sortable === 'function' ? sortable : smartCompare;
                    const xValue = internals.safeGetValue(column, x, -1);
                    const yValue = internals.safeGetValue(column, y, -1);
                    const cmp = compareFn(xValue, yValue, x, y);
                    if (cmp !== 0) {
                        return cmp * (order === 'asc' ? 1 : -1);
                    }
                }
                return 0;
            });
        }

        // 在「升序 - 降序 - 不排序」之间不断切换
        function toggle(code) {
            const sort = sortMap.get(code);
            if (sort == null) {
                onChangeSorts(sorts.concat([{code, order: orders[0]}]));
            } else {
                const index = sorts.findIndex((s) => s.code === code);
                const nextSorts = sorts.slice(0, index + 1);
                const nextOrder = getNextOrder(sort.order);
                if (nextOrder === 'none') {
                    nextSorts.pop();
                } else {
                    nextSorts[index] = Object.assign(Object.assign({}, nextSorts[index]), {order: nextOrder});
                }
                onChangeSorts(nextSorts);
            }
        }

        function processColumns(columns) {
            return columns.map(dfs);

            function dfs(col) {
                var _a;
                const result = Object.assign({}, col);
                const sortable = col.code && (((_a = col.features) === null || _a === void 0 ? void 0 : _a.sortable) || sortMap.has(col.code));
                const active = sortable && sortMap.has(col.code);
                if (sortable) {
                    let sortIndex = -1;
                    let sortOrder = 'none';
                    if (active) {
                        const {order, index} = sortMap.get(col.code);
                        sortOrder = order;
                        sortIndex = index;
                        if (highlightColumnWhenActive) {
                            result.headerCellProps = mergeCellProps(col.headerCellProps, {
                                style: {background: 'var(--header-highlight-bgcolor)'},
                            });
                            result.getCellProps = (value, row, rowIndex) => {
                                const prevCellProps = internals.safeGetCellProps(col, row, rowIndex);
                                return mergeCellProps(prevCellProps, {
                                    style: {background: 'var(--highlight-bgcolor)'},
                                });
                            };
                        }
                    }
                    result.title = (React.createElement(SortHeaderCell, {
                        clickArea: clickArea, onToggle: (e) => {
                            if (stopClickEventPropagation) {
                                e.stopPropagation();
                            }
                            toggle(col.code);
                        }, sortOrder: sortOrder, column: col, sortIndex: sortIndex, sortOptions: sortOptions
                    }, internals.safeRenderHeader(col)));
                }
                if (!isLeafNode(col)) {
                    result.children = col.children.map(dfs);
                }
                return result;
            }
        }

        function getNextOrder(order) {
            const idx = orders.indexOf(order);
            return orders[idx === orders.length - 1 ? 0 : idx + 1];
        }
    };
}

const HeaderCellWithTips = styled__default.div`
  display: flex;
  align-items: center;

  .tip-icon-wrapper {
    margin-left: 2px;
  }

  .tip-icon {
    display: flex;
    fill: currentColor;
  }
`;

function tips() {
    return function tipsSteap(pipeline) {
        const Balloon = pipeline.ctx.components.Balloon;
        const Tooltip = pipeline.ctx.components.Tooltip;
        if (Balloon == null && Tooltip == null) {
            throw new Error('使用 tips 之前需要通过 pipeline context 设置 components.Balloon / components.Tooltip');
        }
        return pipeline.mapColumns(makeRecursiveMapper((col) => {
            var _a;
            if (!((_a = col.features) === null || _a === void 0 ? void 0 : _a.tips)) {
                return col;
            }
            const justifyContent = col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start';
            return Object.assign(Object.assign({}, col), {
                title: (React.createElement(HeaderCellWithTips, {style: {justifyContent}},
                    internals.safeRenderHeader(col),
                    Balloon ? (
                        // fusion/hippo
                        React.createElement(Balloon, {
                            closable: false, trigger: React.createElement("div", {className: "tip-icon-wrapper"},
                                React.createElement(icons.Info, {className: "tip-icon"}))
                        }, col.features.tips)) : (
                        // antd
                        React.createElement(Tooltip, {title: col.features.tips},
                            React.createElement("div", {className: "tip-icon-wrapper"},
                                React.createElement(icons.Info, {className: "tip-icon"}))))))
            });
        }));
    };
}

class Wrapper$1 {
    constructor(input) {
        Object.assign(this, input);
    }
}

class StrictTreeDataHelper {
    constructor(opts) {
        this.opts = opts;
        this.valueSet = new Set(opts.value);
        this.initWrapperTree();
    }

    initWrapperTree() {
        const {getNodeValue} = this.opts;
        this.rootWrapper = new Wrapper$1({root: true, children: []});
        this.wrapperMap = new Map();
        const dfs = (parentWrapper, nodes) => {
            for (const node of nodes) {
                const wrapper = new Wrapper$1({
                    parent: parentWrapper,
                    node,
                    checked: this.valueSet.has(getNodeValue(node)),
                });
                this.wrapperMap.set(getNodeValue(node), wrapper);
                parentWrapper.children.push(wrapper);
                if (!isLeafNode(node)) {
                    wrapper.children = [];
                    dfs(wrapper, node.children);
                }
            }
        };
        dfs(this.rootWrapper, this.opts.tree);
    }

    get value() {
        return this.opts.value;
    }

    isIndeterminate(nodeValue) {
        return false;
    }

    isChecked(nodeValue) {
        return this.valueSet.has(nodeValue);
    }

    getValueAfterCheck(nodeValue) {
        if (!this.isChecked(nodeValue)) {
            return arrayUtils.merge(this.value, [nodeValue]);
        }
        return this.value;
    }

    getValueAfterUncheck(nodeValue) {
        if (this.isChecked(nodeValue)) {
            return arrayUtils.diff(this.value, [nodeValue]);
        }
        return this.value;
    }

    getValueAfterToggle(nodeValue) {
        if (this.isChecked(nodeValue)) {
            return this.getValueAfterUncheck(nodeValue);
        } else {
            return this.getValueAfterCheck(nodeValue);
        }
    }

    getNode(nodeValue) {
        var _a;
        return (_a = this.wrapperMap.get(nodeValue)) === null || _a === void 0 ? void 0 : _a.node;
    }

    getCleanValue() {
        return this.value;
    }
}

class Wrapper {
    constructor(input) {
        Object.assign(this, input);
    }
}

class TreeDataHelper {
    constructor(opts) {
        this.isDetached = (node) => {
            var _a, _b, _c;
            return (_c = (_b = (_a = this.opts).isDetached) === null || _b === void 0 ? void 0 : _b.call(_a, node)) !== null && _c !== void 0 ? _c : false;
        };
        this.opts = opts;
        this.valueSet = new Set(opts.value);
        this.initWrapperTree();
    }

    get value() {
        return this.opts.value;
    }

    initWrapperTree() {
        const valueSet = new Set(this.value);
        this.rootWrapper = new Wrapper({root: true, children: []});
        this.wrapperMap = new Map();
        const getNodeValue = this.opts.getNodeValue;
        const {isDetached, wrapperMap} = this;
        dfs(this.rootWrapper, this.opts.tree, false);

        function dfs(parentWrapper, nodes, inheritParentChecked) {
            // allChildrenChecked 先默认设置为 true
            // dfs 过程中可能会更新 allChildrenChecked
            parentWrapper.allChildrenChecked = true;
            if (process.env.NODE_ENV !== 'production') {
                if (nodes.every(isDetached)) {
                    console.warn('TreeDataHelper 检测到部分节点的下所有子节点均为 detached 状态，这将导致该节点变为「无效节点」', parentWrapper.node);
                }
            }
            for (const node of nodes) {
                const detached = isDetached(node);
                const exactChecked = valueSet.has(getNodeValue(node));
                if (exactChecked && !detached) {
                    parentWrapper.anyDescendentsChecked = true;
                }
                const parentChecked = !detached && inheritParentChecked;
                const checked = exactChecked || parentChecked;
                const wrapper = new Wrapper({
                    parent: parentWrapper,
                    node,
                    checked,
                    exactChecked,
                    parentChecked,
                    anyDescendentsChecked: checked,
                    detached,
                });
                wrapperMap.set(getNodeValue(node), wrapper);
                parentWrapper.children.push(wrapper);
                if (!isLeafNode(node)) {
                    wrapper.children = [];
                    dfs(wrapper, node.children, checked);
                    if (wrapper.anyDescendentsChecked && !detached) {
                        parentWrapper.anyDescendentsChecked = true;
                    }
                    if (wrapper.allChildrenChecked) {
                        wrapper.checked = true;
                        // 当一个节点因为「子节点被全选」而变为 checked 时，我们需要更新子节点的 parentChecked 字段
                        for (const child of wrapper.children) {
                            if (!child.detached) {
                                child.parentChecked = true;
                            }
                        }
                    }
                }
                if (!wrapper.checked && !detached) {
                    parentWrapper.allChildrenChecked = false;
                }
            }
        }
    }

    isIndeterminate(nodeValue) {
        const wrapper = this.wrapperMap.get(nodeValue);
        return !wrapper.checked && wrapper.anyDescendentsChecked;
    }

    isChecked(nodeValue) {
        const wrapper = this.wrapperMap.get(nodeValue);
        return wrapper.checked;
    }

    getValueAfterCheck(nodeValue) {
        if (this.isChecked(nodeValue)) {
            return this.getCleanValue();
        }
        const nextValue = arrayUtils.merge(this.value, [nodeValue]);
        return new TreeDataHelper(Object.assign(Object.assign({}, this.opts), {value: nextValue})).getCleanValue();
    }

    getValueAfterUncheck(nodeValue) {
        if (!this.isChecked(nodeValue)) {
            return this.getCleanValue();
        }
        const wrapper = this.wrapperMap.get(nodeValue);
        const {getNodeValue} = this.opts;
        const appendArray = getAppendArray(wrapper);
        const removeSet = getRemoveSet(wrapper);
        const nextValue = arrayUtils.diff(this.value.concat(appendArray), removeSet);
        return new TreeDataHelper(Object.assign(Object.assign({}, this.opts), {value: nextValue})).getCleanValue();

        function getAppendArray(startWrapper) {
            let result = [];
            let current = startWrapper;
            while (current.parentChecked && !current.detached) {
                for (const sibling of current.parent.children) {
                    if (sibling === current || sibling.exactChecked || sibling.detached) {
                        continue;
                    }
                    result.push(getNodeValue(sibling.node));
                }
                current = current.parent;
            }
            return result;
        }

        function getRemoveSet(startWrapper) {
            const result = new Set();
            let wrapper = startWrapper;
            // 不断向上收集选中的父节点
            while (true) {
                result.add(getNodeValue(wrapper.node));
                if (wrapper.detached || !wrapper.parentChecked) {
                    break;
                }
                wrapper = wrapper.parent;
            }

            function dfs(wrappers) {
                if (wrappers == null) {
                    return;
                }
                for (const wrapper of wrappers) {
                    if (wrapper.detached || !wrapper.checked) {
                        continue;
                    }
                    result.add(getNodeValue(wrapper.node));
                    if (!isLeafNode(wrapper) && wrapper.anyDescendentsChecked) {
                        dfs(wrapper.children);
                    }
                }
            }

            // 收集所有的子孙节点
            dfs(startWrapper.children);
            return result;
        }
    }

    getValueAfterToggle(nodeValue) {
        if (this.isChecked(nodeValue)) {
            return this.getValueAfterUncheck(nodeValue);
        } else {
            return this.getValueAfterCheck(nodeValue);
        }
    }

    getNode(nodeValue) {
        var _a;
        return (_a = this.wrapperMap.get(nodeValue)) === null || _a === void 0 ? void 0 : _a.node;
    }

    getCleanValue() {
        const {checkedStrategy, getNodeValue} = this.opts;
        const result = this.value.filter((nodeValue) => {
            return !this.wrapperMap.has(nodeValue);
        });
        dfs(this.rootWrapper.children);
        return result;

        function dfs(wrappers) {
            for (const wrapper of wrappers) {
                if (wrapper.checked) {
                    if (checkedStrategy === 'all') {
                        result.push(getNodeValue(wrapper.node));
                    } else if (checkedStrategy === 'parent') {
                        if (!wrapper.parentChecked) {
                            result.push(getNodeValue(wrapper.node));
                        }
                    } else {
                        // checkedStrategy === 'child'
                        if (isLeafNode(wrapper)) {
                            result.push(getNodeValue(wrapper.node));
                        }
                    }
                }
                if (!isLeafNode(wrapper)) {
                    dfs(wrapper.children);
                }
            }
        }
    }
}

const STATE_KEY = 'treeSelect';

function treeSelect(opts) {
    return function treeSelectStep(pipeline) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const Checkbox = pipeline.ctx.components.Checkbox;
        if (Checkbox == null) {
            throw new Error('使用 treeSelect 之前需要通过 pipeline context 设置 components.Checkbox');
        }
        const primaryKey = pipeline.ensurePrimaryKey('treeSelect');
        if (typeof primaryKey !== 'string') {
            throw new Error('treeSelect 仅支持字符串作为 primaryKey');
        }
        const clickArea = (_a = opts.clickArea) !== null && _a !== void 0 ? _a : 'checkbox';
        const isDisabled = (_b = opts.isDisabled) !== null && _b !== void 0 ? _b : always(false);
        const isDetached = (_c = opts.isDetached) !== null && _c !== void 0 ? _c : always(false);
        const value = (_f = (_e = (_d = opts.value) !== null && _d !== void 0 ? _d : pipeline.getStateAtKey(STATE_KEY)) !== null && _e !== void 0 ? _e : opts.defaultValue) !== null && _f !== void 0 ? _f : [];
        const tree = opts.rootKey != null ? [{[primaryKey]: opts.rootKey, children: opts.tree}] : opts.tree;
        const getNodeValue = (node) => node[primaryKey];
        const treeDataHelper = opts.checkStrictly
            ? new StrictTreeDataHelper({value, getNodeValue, tree})
            : new TreeDataHelper({
                value,
                getNodeValue,
                isDetached,
                tree,
                checkedStrategy: (_g = opts.checkedStrategy) !== null && _g !== void 0 ? _g : 'parent',
            });
        const onToggleKey = (key) => {
            var _a;
            const nextValue = treeDataHelper.getValueAfterToggle(key);
            pipeline.setStateAtKey(STATE_KEY, nextValue);
            (_a = opts.onChange) === null || _a === void 0 ? void 0 : _a.call(opts, nextValue);
        };
        const makeCheckbox = (key, root, row) => {
            return (React.createElement(Checkbox, {
                checked: treeDataHelper.isChecked(key),
                indeterminate: treeDataHelper.isIndeterminate(key),
                disabled: !root && isDisabled(row),
                onChange: clickArea === 'checkbox' || root ? () => onToggleKey(key) : undefined
            }));
        };
        const checkboxColumn = Object.assign(Object.assign({
            name: '',
            width: 50,
            align: 'center',
            title: opts.rootKey != null ? makeCheckbox(opts.rootKey, true) : undefined
        }, opts.checkboxColumn), {
            render(value, record) {
                return makeCheckbox(record[primaryKey], false, record);
            }, getCellProps(value, row) {
                const rowKey = row[primaryKey];
                if (clickArea !== 'cell') {
                    return;
                }
                const disabled = isDisabled(row);
                if (disabled) {
                    return {style: {cursor: 'not-allowed'}};
                }
                return {
                    style: {cursor: 'pointer'},
                    onClick(e) {
                        if (opts.stopClickEventPropagation) {
                            e.stopPropagation();
                        }
                        onToggleKey(rowKey);
                    },
                };
            }
        });
        const nextColumns = pipeline.getColumns().slice();
        const checkboxPlacement = (_h = opts.checkboxPlacement) !== null && _h !== void 0 ? _h : 'start';
        if (checkboxPlacement === 'start') {
            nextColumns.unshift(checkboxColumn);
        } else {
            nextColumns.push(checkboxColumn);
        }
        pipeline.columns(nextColumns);
        if (clickArea === 'row') {
            pipeline.appendRowPropsGetter((row) => {
                const disabled = isDisabled(row);
                if (!disabled) {
                    return {
                        style: {cursor: 'pointer'},
                        onClick(e) {
                            if (opts.stopClickEventPropagation) {
                                e.stopPropagation();
                            }
                            onToggleKey(row[primaryKey]);
                        },
                    };
                }
            });
        }
        if (opts.highlightRowWhenSelected) {
            pipeline.appendRowPropsGetter((row) => {
                if (treeDataHelper.isChecked(row[primaryKey])) {
                    return {className: 'highlight'};
                }
            });
        }
        return pipeline;
    };
}

var index = /*#__PURE__*/Object.freeze({
    __proto__: null,
    autoRowSpan: autoRowSpan,
    buildTree: buildTree,
    columnHover: columnHover,
    columnRangeHover: columnRangeHover,
    columnResize: columnResize,
    multiSelect: multiSelect,
    rowDetail: rowDetail,
    rowGrouping: rowGrouping,
    singleSelect: singleSelect,
    sort: sort,
    tips: tips,
    treeMode: treeMode,
    treeMetaSymbol: treeMetaSymbol,
    treeSelect: treeSelect
});

const ICON_WIDTH = 16;

/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
function makeTreeModeTransform({
                                   onChangeOpenKeys,
                                   openKeys,
                                   primaryKey,
                                   iconIndent = -6,
                                   iconGap = 0,
                                   indentSize = 16,
                                   isLeafNode: isLeafNode$1 = isLeafNode,
                                   clickArea = 'cell',
                                   treeMetaKey = treeMetaSymbol,
                                   stopClickEventPropagation,
                               }) {
    warnTransformsDeprecated('makeTreeModeTransform');
    const openKeySet = new Set(openKeys);
    const toggle = (rowKey) => {
        const expanded = openKeySet.has(rowKey);
        if (expanded) {
            onChangeOpenKeys(openKeys.filter((key) => key !== rowKey), rowKey, 'collapse');
        } else {
            onChangeOpenKeys([...openKeys, rowKey], rowKey, 'expand');
        }
    };
    return ({columns, dataSource}) => {
        return {
            columns: processColumns(columns),
            dataSource: processDataSource(dataSource),
        };

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
                    const isLeaf = isLeafNode$1(node, {depth, expanded, rowKey});
                    const treeMeta = {depth, isLeaf, expanded, rowKey};
                    result.push(Object.assign({[treeMetaKey]: treeMeta}, node));
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
                const {rowKey, depth, isLeaf, expanded} = record[treeMetaKey];
                const indent = iconIndent + depth * indentSize;
                if (isLeaf) {
                    return (React.createElement(InlineFlexCell, {className: "expansion-cell leaf"},
                        React.createElement("span", {style: {marginLeft: indent + ICON_WIDTH + iconGap}}, content)));
                }
                const onClick = (e) => {
                    if (stopClickEventPropagation) {
                        e.stopPropagation();
                    }
                    toggle(rowKey);
                };
                const expandCls = expanded ? 'expanded' : 'collapsed';
                return (React.createElement(ExpansionCell, {
                        className: cx('expansion-cell', expandCls), style: {
                            cursor: clickArea === 'content' ? 'pointer' : undefined,
                        }, onClick: clickArea === 'content' ? onClick : undefined
                    },
                    React.createElement(icons.CaretRight, {
                        className: cx('expansion-icon', expandCls), style: {
                            cursor: clickArea === 'icon' ? 'pointer' : undefined,
                            marginLeft: indent,
                            marginRight: iconGap,
                        }, onClick: clickArea === 'icon' ? onClick : undefined
                    }),
                    content));
            };
            const getCellProps = (value, record, rowIndex) => {
                const prevProps = internals.safeGetCellProps(firstCol, record, rowIndex);
                if (record[treeMetaKey] == null) {
                    // 没有 treeMeta 信息的话，就返回原先的 cellProps
                    return prevProps;
                }
                const {isLeaf, rowKey} = record[treeMetaKey];
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
                    style: {cursor: 'pointer'},
                });
            };
            return [
                Object.assign(Object.assign({}, firstCol), {
                    title: (React.createElement("span", {style: {marginLeft: iconIndent + ICON_WIDTH + iconGap}}, internals.safeRenderHeader(firstCol))),
                    render,
                    getCellProps: clickArea === 'cell' ? getCellProps : firstCol.getCellProps
                }),
                ...others,
            ];
        }
    };
}

/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
function useTreeModeTransform(_a) {
    var {defaultOpenKeys = []} = _a, others = __rest(_a, ["defaultOpenKeys"]);
    const [openKeys, onChangeOpenKeys] = useState(defaultOpenKeys);
    return makeTreeModeTransform(Object.assign({
        openKeys,
        onChangeOpenKeys
    }, others));
}

/** @deprecated transform 用法已经过时，请使用 pipeline 来对表格进行拓展 */
function makeVisibleTransform(visibleCodes) {
    warnTransformsDeprecated('makeVisibleTransform');
    const set = new Set(visibleCodes);
    return traverseColumn((column) => {
        if (!isLeafNode(column)) {
            return column;
        }
        return set.has(column.code) ? column : Object.assign(Object.assign({}, column), {hidden: true});
    });
}

export {
    applyTransforms,
    buildTree$1 as buildTree,
    exportTableAsExcel,
    index as features,
    groupBy,
    layeredSort,
    makeAutoRowSpanTransform,
    makeBuildTreeTransform,
    makeColumnHoverTransform,
    makeColumnRangeHoverTransform,
    makeColumnResizeTransform,
    makeFlattenTransform,
    makeOrderFieldTransform,
    makeRecursiveMapper,
    makeSortTransform,
    makeTipsTransform,
    makeTreeModeTransform,
    makeVisibleTransform,
    proto,
    smartCompare,
    traverseColumn,
    useAutoWidthTransform,
    useColumnHoverRangeTransform,
    useColumnHoverTransform,
    useColumnResizeTransform,
    useSortTransform,
    useTreeModeTransform
};
