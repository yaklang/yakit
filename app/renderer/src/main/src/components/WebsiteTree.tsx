import React from "react";

export interface WebsiteTreeViewerProp {

}

export interface WebsiteForest {
    size: number
    trees: WebsiteNode[]
    uuid: string
}

export interface WebsiteNode {
    children: WebsiteNode[],
    node_name: string,
    path: string,
    request_ids?: any[],
    urls: string[],
    website_name: string
    uuid: string
}

export interface AntDTreeData {
    title: string
    key: string
    icon?: any
    children: AntDTreeData[]
    urls: string[]
    parent?: AntDTreeData
}

export const ConvertWebsiteForestToTreeData = (forest: WebsiteForest) => {
    const viewTree = (t: WebsiteNode) => {
        const antDTreeData: AntDTreeData = {
            title: t.node_name,
            key: t.uuid, children: [],
            urls: t.urls || [],
        };
        try {
            (t.children || []).map(viewTree).forEach(r => {
                r.parent = antDTreeData;
                antDTreeData.children.push(r)
            })
        } catch (e) {
        }
        return antDTreeData
    };

    const nodes = (forest.trees || []).map(viewTree)
    nodes.sort((a, b) => a.title.localeCompare(b.title))
    const shrinkNode = (node: AntDTreeData) => {
        node.children.map(shrinkNode);

        if (!node.parent) {
            return node
        }

        if ((node.urls || []).length > 0) {
            return node
        }

        if (((node.children || []).length <= 1) && node.title !== "/") {
            return node
        }

        // 移除当前节点
        node.parent.children = node.parent.children.filter(i => i.key !== node.key)
        node.parent.children = [...node.parent.children, ...node.children.map(i => {
            i.title = node.title + i.title
            i.parent = node.parent
            return i
        })];
        return undefined
    };

    return [
        ...nodes.map(shrinkNode)
    ];
};