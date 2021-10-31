'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var pipeline = require('./chunks/ali-react-table-pipeline-1b7628dd.js');
var React = require('react');
var rxjs = require('rxjs');
var styled = require('styled-components');
require('classnames');
require('rxjs/operators');
require('resize-observer-polyfill');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var React__default = /*#__PURE__*/_interopDefaultLegacy(React);
var styled__default = /*#__PURE__*/_interopDefaultLegacy(styled);

function simpleEncode(path) {
    if (path.length === 0) {
        return 'key:@total@';
    }
    return `key:${path.join(' ')}`;
}

/** 根据指定的 code 序列计算下钻树 */
function buildDrillTree(data, codes, { encode = simpleEncode, totalValue = '总计', includeTopWrapper = false, isExpand = pipeline.always(true), enforceExpandTotalNode = true, } = {}) {
    const emptyPath = [];
    const totalKey = encode(emptyPath);
    let array;
    let hasChild = false;
    if (codes.length === 0) {
        array = [];
    }
    else if (!enforceExpandTotalNode && !isExpand(totalKey)) {
        array = [];
        hasChild = data.length > 0;
    }
    else {
        array = dfs(data, []);
    }
    if (includeTopWrapper) {
        const rootNode = {
            key: totalKey,
            value: totalValue,
            path: emptyPath,
            children: array,
        };
        if (hasChild) {
            rootNode.hasChild = hasChild;
        }
        return [rootNode];
    }
    if (includeTopWrapper) {
        return [
            {
                key: totalKey,
                value: totalValue,
                path: emptyPath,
                children: array,
            },
        ];
    }
    return array;
    function dfs(slice, path) {
        const depth = path.length;
        const array = [];
        const code = codes[depth];
        const groups = pipeline.groupBy2(slice, (row) => row[code]);
        for (const groupKey of groups.keys()) {
            path.push(groupKey);
            const node = {
                key: encode(path),
                value: groupKey,
                path: path.slice(),
            };
            array.push(node);
            const group = groups.get(groupKey);
            if (group.length > 0 && depth < codes.length - 1) {
                if (isExpand(node.key)) {
                    node.children = dfs(group, path);
                }
                else {
                    node.hasChild = true;
                }
            }
            path.pop();
        }
        return array;
    }
}

function fallbackAggregate(slice) {
    return slice.length === 1 ? slice[0] : {};
}
/** 根据表格左侧与上方的下钻树，从全量明细数据中计算对应的数据立方 */
function buildRecordMatrix({ data, leftCodes, topCodes, aggregate = fallbackAggregate, encode = simpleEncode, isLeftExpand = pipeline.always(true), isTopExpand = pipeline.always(true), prebuiltLeftTree, prebuiltTopTree, }) {
    const ctx = {
        peculiarity: new Set(),
    };
    const [leftRootDrillNode] = prebuiltLeftTree !== null && prebuiltLeftTree !== void 0 ? prebuiltLeftTree : buildDrillTree(data, leftCodes, {
        encode,
        includeTopWrapper: true,
        isExpand: isLeftExpand,
    });
    const [topRootDrillNode] = prebuiltTopTree !== null && prebuiltTopTree !== void 0 ? prebuiltTopTree : buildDrillTree(data, topCodes, {
        encode,
        includeTopWrapper: true,
        isExpand: isTopExpand,
    });
    const transientMatrixRow = buildByLeft(ctx, data, leftRootDrillNode, 0);
    return makeMatrix(transientMatrixRow);
    function buildByLeft(ctx, slice, drillNode, depth) {
        let children = null;
        let col;
        if (pipeline.isLeafNode(drillNode)) {
            col = buildByTop(ctx, slice, topRootDrillNode, 0);
        }
        else {
            children = [];
            const code = leftCodes[depth];
            const groups = pipeline.groupBy2(slice, (dwdRow) => dwdRow[code]);
            ctx.peculiarity.add(code);
            for (const child of drillNode.children) {
                const group = groups.get(child.value);
                if (group) {
                    children.push(buildByLeft(ctx, group, child, depth + 1));
                }
            }
            ctx.peculiarity.delete(code);
            col = mergeColsByTopTree(ctx, children.map((child) => child.col));
        }
        return {
            leftKey: drillNode.key,
            children,
            col,
        };
    }
    function buildByTop(ctx, slice, drillNode, depth) {
        let children = null;
        let record;
        if (pipeline.isLeafNode(drillNode)) {
            record = aggregate(slice, ctx);
        }
        else {
            children = [];
            const code = topCodes[depth];
            const groups = pipeline.groupBy2(slice, (dwdRow) => dwdRow[code]);
            ctx.peculiarity.add(code);
            for (const child of drillNode.children) {
                const group = groups.get(child.value);
                if (group) {
                    children.push(buildByTop(ctx, group, child, depth + 1));
                }
            }
            ctx.peculiarity.delete(code);
            record = aggregate(children.map((child) => child.record), ctx);
        }
        return {
            topKey: drillNode.key,
            topValue: drillNode.value,
            children,
            record,
        };
    }
    function mergeColsByTopTree(ctx, colsToMerge) {
        return dfs(ctx, colsToMerge, topRootDrillNode, 0);
        function dfs(ctx, cols, topDrillNode, depth) {
            let children = null;
            const record = aggregate(cols.map((c) => c.record), ctx);
            if (!pipeline.isLeafNode(topDrillNode)) {
                const topCode = topCodes[depth];
                ctx.peculiarity.add(topCode);
                const drillChildDict = pipeline.fromEntries(topDrillNode.children.map((child) => [child.value, child]));
                const colChildDictArray = cols.map((col) => pipeline.fromEntries(col.children.map((child) => [child.topValue, child])));
                children = topDrillNode.children.map((item) => {
                    const childCols = colChildDictArray.map((colChildDict) => colChildDict[item.value]).filter(Boolean);
                    return dfs(ctx, childCols, drillChildDict[item.value], depth + 1);
                });
                ctx.peculiarity.delete(topCode);
            }
            return {
                topKey: topDrillNode.key,
                topValue: topDrillNode.value,
                record,
                children,
            };
        }
    }
    function makeMatrix(rootRow) {
        const result = new Map();
        dfsRow(result, rootRow);
        return result;
        function dfsRow(matrix, row) {
            const subMap = new Map();
            matrix.set(row.leftKey, subMap);
            dfsCol(subMap, row.col);
            if (!pipeline.isLeafNode(row)) {
                row.children.forEach((childRow) => {
                    dfsRow(matrix, childRow);
                });
            }
        }
        function dfsCol(subMap, col) {
            subMap.set(col.topKey, col.record);
            if (!pipeline.isLeafNode(col)) {
                col.children.forEach((childCol) => {
                    dfsCol(subMap, childCol);
                });
            }
        }
    }
}
/** buildRecordMatrix 的简化版本，只能处理一个维度序列，返回一个 Map。
 * 相当于只处理 matrix 的第一行（汇总行） */
function buildRecordMap({ codes, encode = simpleEncode, data, aggregate, isExpand, }) {
    const matrix = buildRecordMatrix({
        data,
        leftCodes: [],
        topCodes: codes,
        isTopExpand: isExpand,
        aggregate,
        encode,
    });
    const totalKey = encode([]);
    return matrix.get(totalKey);
}

const ExpandSpan = styled__default['default'].span `
  display: inline-flex;
  align-items: center;
  padding: 2px 8px 2px 0;
  cursor: pointer;

  .icon {
    fill: #999;
    margin-right: 4px;

    &.expanded {
      transform-origin: center center;
      transform: rotate(90deg);
    }
  }
`;
function convertDrillTreeToCrossTree(drillTree, { indicators, encode = simpleEncode, generateSubtotalNode, enforceExpandTotalNode = true, expandKeys, onChangeExpandKeys = rxjs.noop, supportsExpand, } = {}) {
    const totalKey = encode([]);
    if (supportsExpand && expandKeys == null) {
        throw new Error('[ali-react-table-dist] convertDrillTreeToCrossTree(...) 设置 supportsExpand=true 时，expandKeys 不能为 null/undefined.');
    }
    const expandKeySet = new Set(expandKeys);
    return dfs(drillTree);
    /** 在 indicators 非空的情况下获取指标对应的 CrossTreeNode */
    function getIndicators(node, nodeData) {
        return indicators.map((indicator) => (Object.assign({ key: encode(node.path.concat([indicator.code])), value: indicator.name, data: Object.assign(Object.assign({}, nodeData), { indicator }) }, indicator)));
    }
    function drillNodeToTreeNode(node, nodeData) {
        if (indicators != null) {
            return {
                key: node.key,
                value: node.value,
                data: nodeData,
                children: getIndicators(node, nodeData),
            };
        }
        else {
            return {
                key: node.key,
                value: node.value,
                data: nodeData,
            };
        }
    }
    function dfs(drillNodes, depth) {
        const result = [];
        for (const node of drillNodes) {
            const nodeData = { dataKey: node.key, dataPath: node.path };
            if (pipeline.isLeafNode(node) && !node.hasChild) {
                result.push(drillNodeToTreeNode(node, nodeData));
            }
            else {
                let needProcessChildren = true;
                let crossTreeNode = {
                    key: node.key,
                    value: node.value,
                    data: nodeData,
                };
                if (!supportsExpand || (enforceExpandTotalNode && node.key === totalKey)) {
                    // 不支持展开功能 或是强制展开
                    crossTreeNode.children = dfs(node.children);
                }
                else if (expandKeySet.has(node.key)) {
                    // 展开的父节点
                    // @ts-ignore
                    crossTreeNode.title = (React__default['default'].createElement(ExpandSpan, { onClick: () => {
                            onChangeExpandKeys(expandKeys.filter((k) => k !== node.key), node, 'collapse');
                        } },
                        React__default['default'].createElement(pipeline.icons.CaretRight, { className: "icon expanded" }),
                        node.value));
                    crossTreeNode.children = dfs(node.children);
                }
                else {
                    // 收拢的父节点
                    needProcessChildren = false;
                    crossTreeNode.title = (React__default['default'].createElement(ExpandSpan, { onClick: () => {
                            onChangeExpandKeys(expandKeys.concat([node.key]), node, 'expand');
                        } },
                        React__default['default'].createElement(pipeline.icons.CaretRight, { className: "icon collapsed" }),
                        node.value));
                    if (indicators != null) {
                        crossTreeNode.children = getIndicators(node, nodeData);
                    }
                }
                if (needProcessChildren) {
                    const subtotalNodeData = generateSubtotalNode === null || generateSubtotalNode === void 0 ? void 0 : generateSubtotalNode(node);
                    if (subtotalNodeData) {
                        const { position = 'start', value } = subtotalNodeData;
                        const subtotalPath = node.path.concat([value]);
                        const subtotalDrillNode = {
                            key: encode(subtotalPath),
                            path: subtotalPath,
                            value,
                        };
                        const subtotalTreeNode = drillNodeToTreeNode(subtotalDrillNode, nodeData);
                        if (position === 'start') {
                            crossTreeNode.children.unshift(subtotalTreeNode);
                        }
                        else {
                            crossTreeNode.children.push(subtotalTreeNode);
                        }
                    }
                }
                result.push(crossTreeNode);
            }
        }
        return result;
    }
}

const ROW_KEY = 'rowKey';

function buildCrossTable(options) {
    var _a, _b, _c, _d, _e, _f;
    const { leftTotalNode, topTotalNode } = options;
    const columnOffset = (_a = options.columnOffset) !== null && _a !== void 0 ? _a : 0;
    const rowOffset = (_b = options.rowOffset) !== null && _b !== void 0 ? _b : 0;
    const hasOffset = columnOffset !== 0 || rowOffset !== 0;
    // 有的时候 leftTree/topTree 是通过 node.children 传入的
    // 此时 leftTree/topTree 等于 null 和等于空数组是等价的
    // 故在这里兼容 leftTree/topTree 为空的情况
    const leftTree = (_c = options.leftTree) !== null && _c !== void 0 ? _c : [];
    const topTree = (_d = options.topTree) !== null && _d !== void 0 ? _d : [];
    const getValue = (_e = options.getValue) !== null && _e !== void 0 ? _e : pipeline.always(null);
    const leftMetaColumns = (_f = options.leftMetaColumns) !== null && _f !== void 0 ? _f : [];
    const leftHeaderWidth = Math.max(leftMetaColumns.length, pipeline.getTreeDepth(leftTree) + 1);
    return {
        columns: getColumns(),
        dataSource: getDataSource(),
    };
    /** 获取表格的列配置 */
    function getColumns() {
        return [...getLeftPartColumns(), ...getDataPartColumns()];
        function getLeftPartColumns() {
            var _a;
            const leftPartColumns = [];
            for (let index = 0; index < leftHeaderWidth; index++) {
                const metaCol = (_a = leftMetaColumns[index]) !== null && _a !== void 0 ? _a : {};
                const staticMetaColConfig = pipeline.__rest(metaCol, ["getCellProps", "render"]);
                leftPartColumns.push(Object.assign(Object.assign({ columnType: 'left', lock: true }, staticMetaColConfig), { getCellProps: leftHeaderGetCellPropsFactory(metaCol, index), getSpanRect: leftHeaderGetSpanRectFactory(metaCol, index), getValue: leftHeaderGetValueFactory(metaCol, index), render: leftHeaderRenderFactory(metaCol, index) }));
            }
            return leftPartColumns;
            function leftHeaderGetCellPropsFactory(metaCol, colIndex) {
                return (_value, row, rowIndex) => {
                    var _a;
                    const node = row.nodes[colIndex];
                    return (_a = metaCol.getCellProps) === null || _a === void 0 ? void 0 : _a.call(metaCol, node, colIndex);
                };
            }
            function leftHeaderGetSpanRectFactory(metaCol, colIndex) {
                return (_value, row) => {
                    const rect = row.rects[colIndex];
                    if (hasOffset) {
                        return {
                            left: rect.left + columnOffset,
                            right: rect.right + columnOffset,
                            top: rect.top + rowOffset,
                            bottom: rect.bottom + rowOffset,
                        };
                    }
                    return rect;
                };
            }
            function leftHeaderGetValueFactory(metaCol, colIndex) {
                return (row, rowIndex) => {
                    const node = row.nodes[colIndex];
                    return node.value;
                };
            }
            function leftHeaderRenderFactory(metaCol, colIndex) {
                return (v, row, rowIndex) => {
                    var _a;
                    const node = row.nodes[colIndex];
                    if (metaCol.render) {
                        return metaCol.render(node, colIndex);
                    }
                    return (_a = node.title) !== null && _a !== void 0 ? _a : node.value;
                };
            }
        }
        /** 获取表格数据部分的列配置 */
        function getDataPartColumns() {
            if (topTree.length > 0) {
                return dfs(topTree, { valuePath: [], depth: 0 });
            }
            else if (topTotalNode) {
                return dfs([topTotalNode], { valuePath: [], depth: 0 });
            }
            else {
                return [];
            }
            function dfs(nodes, ctx) {
                const result = [];
                for (const node of nodes) {
                    ctx.valuePath.push(node.value);
                    if (pipeline.isLeafNode(node)) {
                        // 叶子节点
                        result.push(getDataColumn(node, ctx.depth));
                    }
                    else {
                        const { key, value, children } = node, others = pipeline.__rest(node
                        // 强制展开的节点
                        , ["key", "value", "children"]);
                        // 强制展开的节点
                        result.push(Object.assign(Object.assign({ columnType: 'data-parent' }, others), { name: value, children: dfs(children, { valuePath: ctx.valuePath, depth: ctx.depth + 1 }) }));
                    }
                    ctx.valuePath.pop();
                }
                return result;
            }
        }
        function getDataColumn(topNode, topDepth) {
            const columnGetValue = (row) => {
                const leftDepth = row.nodes.length - 1;
                const leftNode = row.nodes[leftDepth];
                return getValue(leftNode, topNode, leftDepth, topDepth);
            };
            const { key, value, children } = topNode, others = pipeline.__rest(topNode, ["key", "value", "children"]);
            return Object.assign(Object.assign({ columnType: 'data' }, others), { getValue: columnGetValue, name: value, children: null, render(value, row) {
                    if (options.render) {
                        const leftDepth = row.nodes.length - 1;
                        const leftNode = row.nodes[leftDepth];
                        return options.render(value, leftNode, topNode, leftDepth, topDepth);
                    }
                    return value;
                },
                getCellProps(value, row) {
                    if (options.getCellProps) {
                        const leftDepth = row.nodes.length - 1;
                        const leftNode = row.nodes[leftDepth];
                        return options.getCellProps(value, leftNode, topNode, leftDepth, topDepth);
                    }
                } });
        }
    }
    function getDataSource() {
        const flatRows = [];
        const ctx = { depth: 0, nodes: [], rects: [], rowIndex: 0 };
        if (leftTree.length > 0) {
            dfs(leftTree, ctx);
        }
        else if (leftTotalNode) {
            dfs([leftTotalNode], ctx);
        } // else 表格没有行，展示空表格
        return flatRows;
        function dfs(nodes, ctx) {
            let count = 0;
            for (const node of nodes) {
                if (node.hidden) {
                    // 跳过被隐藏的节点
                    continue;
                }
                const rect = {
                    top: ctx.rowIndex + count,
                    bottom: -1,
                    left: ctx.depth,
                    right: -1, // 会在 dfs 之后算出结果
                };
                const row = {
                    [ROW_KEY]: node.key,
                    rects: [...ctx.rects, rect],
                    nodes: [...ctx.nodes, node],
                };
                if (pipeline.isLeafNode(node)) {
                    rect.right = leftHeaderWidth;
                    rect.bottom = rect.top + 1;
                    flatRows.push(row);
                    count += 1;
                }
                else {
                    ctx.rects.push(rect);
                    ctx.nodes.push(node);
                    const ret = dfs(node.children, {
                        nodes: ctx.nodes,
                        rects: ctx.rects,
                        depth: ctx.depth + 1,
                        rowIndex: ctx.rowIndex + count,
                    });
                    ctx.rects.pop();
                    ctx.nodes.pop();
                    count += ret.count;
                    rect.right = rect.left + 1;
                    rect.bottom = rect.top + ret.count;
                }
            }
            return { count };
        }
    }
}

function CrossTable(_a) {
    var { BaseTableComponent = pipeline.BaseTable, leftTree, leftTotalNode, topTree, topTotalNode, getValue, getCellProps, leftMetaColumns, render, baseTableRef } = _a, others = pipeline.__rest(_a, ["BaseTableComponent", "leftTree", "leftTotalNode", "topTree", "topTotalNode", "getValue", "getCellProps", "leftMetaColumns", "render", "baseTableRef"]);
    const { dataSource, columns } = buildCrossTable({
        leftTree,
        topTree,
        leftTotalNode,
        topTotalNode,
        getValue,
        getCellProps,
        render,
        leftMetaColumns,
    });
    return (React__default['default'].createElement(BaseTableComponent, Object.assign({ ref: baseTableRef }, others, { primaryKey: ROW_KEY, dataSource: dataSource, columns: columns })));
}

function buildCrossTreeTable(options) {
    var _a, _b;
    const { primaryColumn = { name: '' }, openKeys, onChangeOpenKeys, indentSize, isLeafNode: isLeafNodeOpt = pipeline.isLeafNode, } = options;
    // 有的时候 leftTree/topTree 是通过 node.children 传入的
    // 此时 leftTree/topTree 等于 null 和等于空数组是等价的
    // 故在这里兼容 leftTree/topTree 为空的情况
    const leftTree = (_a = options.leftTree) !== null && _a !== void 0 ? _a : [];
    const topTree = (_b = options.topTree) !== null && _b !== void 0 ? _b : [];
    const pipeline$1 = new pipeline.TablePipeline({
        state: {},
        setState: rxjs.noop,
        ctx: { primaryKey: ROW_KEY },
    });
    pipeline$1.input({ dataSource: getDataSource(), columns: getColumns() });
    pipeline$1.use(pipeline.treeMode({
        openKeys,
        onChangeOpenKeys,
        indentSize,
        isLeafNode(row, nodeMeta) {
            // 调用上层 isLeafNodeOpt 时，会从 row.node 中读取该表格行对应的 leftTreeNode
            return isLeafNodeOpt(row.node, nodeMeta);
        },
    }));
    return {
        dataSource: pipeline$1.getDataSource(),
        columns: pipeline$1.getColumns(),
    };
    /** 获取表格的列配置 */
    function getColumns() {
        return [
            Object.assign(Object.assign({}, primaryColumn), { getValue(row) {
                    return row.node.value;
                },
                getCellProps(value, row) {
                    if (primaryColumn.getCellProps) {
                        return primaryColumn.getCellProps(row.node, row.nodes.length - 1);
                    }
                },
                render(value, row) {
                    if (primaryColumn.render) {
                        return primaryColumn.render(row.node, row.nodes.length - 1);
                    }
                    return value;
                } }),
            ...getDataPartColumns(),
        ];
        /** 获取表格数据部分的列配置 */
        function getDataPartColumns() {
            return dfs(topTree, { depth: 0 });
            function dfs(nodes, ctx) {
                const result = [];
                for (const node of nodes) {
                    if (pipeline.isLeafNode(node)) {
                        result.push(getDataColumn(node, ctx.depth));
                    }
                    else {
                        const { key, value, children } = node, others = pipeline.__rest(node, ["key", "value", "children"]);
                        result.push(Object.assign(Object.assign({}, others), { name: value, children: dfs(children, { depth: ctx.depth + 1 }) }));
                    }
                }
                return result;
            }
        }
        function getDataColumn(topNode, topDepth) {
            const columnGetValue = (row) => {
                const leftDepth = row.nodes.length - 1;
                const leftNode = row.node;
                if (options.getValue) {
                    return options.getValue(leftNode, topNode, leftDepth, topDepth);
                }
                return null;
            };
            const { key, value, children } = topNode, others = pipeline.__rest(topNode, ["key", "value", "children"]);
            return Object.assign(Object.assign({}, others), { getValue: columnGetValue, name: value, children: null, render(value, row) {
                    if (options.render) {
                        const leftDepth = row.nodes.length - 1;
                        const leftNode = row.node;
                        return options.render(value, leftNode, topNode, leftDepth, topDepth);
                    }
                    return value;
                },
                getCellProps(value, row) {
                    if (options.getCellProps) {
                        const leftDepth = row.nodes.length - 1;
                        const leftNode = row.node;
                        return options.getCellProps(value, leftNode, topNode, leftDepth, topDepth);
                    }
                } });
        }
    }
    function getDataSource() {
        return dfs(leftTree, { nodes: [] });
        function dfs(nodes, ctx) {
            const result = [];
            for (const node of nodes) {
                if (node.hidden) {
                    // 跳过被隐藏的节点
                    continue;
                }
                if (pipeline.isLeafNode(node)) {
                    result.push({
                        [ROW_KEY]: node.key,
                        node,
                        nodes: [...ctx.nodes, node],
                    });
                }
                else {
                    const nodes = [...ctx.nodes, node];
                    ctx.nodes.push(node);
                    const children = dfs(node.children, ctx);
                    result.push({ [ROW_KEY]: node.key, node, nodes, children });
                    ctx.nodes.pop();
                }
            }
            return result;
        }
    }
}

class CrossTreeTable extends React__default['default'].Component {
    constructor(props) {
        super(props);
        this.onChangeOpenKeys = (nextOpenKeys) => {
            this.props.onChangeOpenKeys(nextOpenKeys);
            if (!('openKeys' in this.props)) {
                this.setState({ openKeys: nextOpenKeys });
            }
        };
        this.state = {
            openKeys: props.defaultOpenKeys,
        };
    }
    static getDerivedStateFromProps(nextProps) {
        if ('openKeys' in nextProps) {
            return { openKeys: nextProps.openKeys };
        }
        return null;
    }
    render() {
        const _a = this.props, { BaseTableComponent = pipeline.BaseTable, leftTree, topTree, getValue, getCellProps, primaryColumn, render, openKeys: openKeysProp, defaultOpenKeys, onChangeOpenKeys, indentSize, isLeafNode, baseTableRef } = _a, others = pipeline.__rest(_a, ["BaseTableComponent", "leftTree", "topTree", "getValue", "getCellProps", "primaryColumn", "render", "openKeys", "defaultOpenKeys", "onChangeOpenKeys", "indentSize", "isLeafNode", "baseTableRef"]) // 透传其他 BaseTable 的 props
        ;
        const openKeys = openKeysProp !== null && openKeysProp !== void 0 ? openKeysProp : this.state.openKeys;
        const { dataSource, columns } = buildCrossTreeTable({
            leftTree,
            topTree,
            getValue,
            getCellProps,
            render,
            primaryColumn,
            openKeys,
            onChangeOpenKeys: this.onChangeOpenKeys,
            indentSize,
            isLeafNode,
        });
        return (React__default['default'].createElement(BaseTableComponent, Object.assign({ ref: baseTableRef }, others, { primaryKey: ROW_KEY, dataSource: dataSource, columns: columns })));
    }
}
CrossTreeTable.defaultProps = {
    defaultOpenKeys: [],
    onChangeOpenKeys: rxjs.noop,
};

exports.CrossTable = CrossTable;
exports.CrossTreeTable = CrossTreeTable;
exports.ROW_KEY = ROW_KEY;
exports.buildCrossTable = buildCrossTable;
exports.buildCrossTreeTable = buildCrossTreeTable;
exports.buildDrillTree = buildDrillTree;
exports.buildRecordMap = buildRecordMap;
exports.buildRecordMatrix = buildRecordMatrix;
exports.convertDrillTreeToCrossTree = convertDrillTreeToCrossTree;
exports.simpleEncode = simpleEncode;
