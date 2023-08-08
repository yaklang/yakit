/**
 * @description 页面节点数据中心  目前仅支持多开页面
 */

import { AdvancedConfigValueProps } from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import { YakitRoute } from "@/routes/newRoute"
import create, { useStore } from "zustand"
import { subscribeWithSelector } from 'zustand/middleware'


export const hTTPFuzzerRoute = YakitRoute.HTTPFuzzer  //'httpFuzzer'

/**
 * @description 页面暂存数据
 * @property {PageNodeItemProps[]} pageNodeList 页面的一些信息
 * @property {string} routeKey 路由
 * @property {boolean} singleNode 是否为单开页面
 */
export interface PageInfoProps {
    pageNodeList: PageNodeItemProps[]
    routeKey: string
    singleNode: boolean
}
export interface PageNodeItemProps {
    id: string
    routeKey: string
    pageGroupId: string
    pageId: string
    pageName: string
    pageParamsInfo: PageParamsInfoProps
    pageChildrenList: PageNodeItemProps[]
}
/** 页面保存的数据,目前只加了webFuzzer */
interface PageParamsInfoProps {
    webFuzzerPageInfo?: WebFuzzerPageInfoProps
}
export interface WebFuzzerPageInfoProps {
    advancedConfigValue: AdvancedConfigValueProps
    request: string
}
export interface NodeInfoProps {
    parentItem: PageNodeItemProps
    currentItem: PageNodeItemProps
    index: number
    subIndex: number
}

/**
 * @description 通过id在 pageNodeList 中找到对应的item
 * @returns {NodeInfoProps}
 * */
const getPageNodeInfoById = (pageNodeList: PageNodeItemProps[], id: string) => {
    let parentItem: PageNodeItemProps = {
        id: '',
        routeKey: "",
        pageGroupId: "",
        pageId: "0",
        pageName: "0",
        pageParamsInfo: {},
        pageChildrenList: [],
    }
    let currentItem: PageNodeItemProps = {
        id: '',
        routeKey: "",
        pageGroupId: "",
        pageId: "0",
        pageName: "0",
        pageParamsInfo: {},
        pageChildrenList: [],
    }
    let index = -1
    let subIndex = -1
    const l = pageNodeList.length
    for (let i = 0; i < l; i++) {
        const element = pageNodeList[i]
        if (element.pageId === id) {
            currentItem = { ...element }
            index = i
            break
        }
        let isBreak = false
        const childrenList = element.pageChildrenList || []
        const gLength = childrenList.length
        for (let j = 0; j < gLength; j++) {
            const children = childrenList[j]
            if (children.pageId === id) {
                currentItem = { ...children }
                parentItem = { ...element }
                isBreak = true
                index = i
                subIndex = j
                break
            }
        }
        if (isBreak) break
    }
    return { parentItem, currentItem, index, subIndex }
}
interface PageNodeInfoProps {
    pageNode: Map<string, PageInfoProps>
    getPageNodeInfo: (key, pageId: string) => NodeInfoProps | undefined
    setPageNodeInfo: (key, pageId: string, val) => void
    getPageNode: (key) => PageInfoProps | undefined
    setPageNode: (key, v) => void
    removePageNode: (key: string) => void

    clearPageNode: () => void
}

export const usePageNode = create<PageNodeInfoProps>()(subscribeWithSelector((set, get) => ({
    pageNode: new Map(),
    getPageNodeInfo: (key, pageId) => {
        const node = get().pageNode.get(key);
        if (!node) return
        const { pageNodeList } = node
        const item = getPageNodeInfoById(pageNodeList, pageId)
        return item
    },
    setPageNodeInfo: (key, pageId, val) => {
        const node = get().pageNode.get(key);
        if (!node) return
        const { pageNodeList } = node
        const item = getPageNodeInfoById(pageNodeList, pageId)
        const { index, subIndex } = item;
        if (index === -1 && subIndex === -1) return
        pageNodeList[index].pageChildrenList[subIndex] = { ...val }
        const newNode = new Map().set(key, {
            ...node,
        })
        set({
            pageNode: newNode
        })
    },
    getPageNode: (key) => get().pageNode.get(key),
    setPageNode: (key, ev) => {
        const newVal = get().pageNode
        newVal.set(key, ev)
        set({
            pageNode: newVal
        })
    },
    removePageNode: (key) => {
        const newVal = get().pageNode
        newVal.delete(key)
        set({
            pageNode: newVal
        })
    },
    clearPageNode: () => {
        const newVal = get().pageNode
        newVal.clear()
        set({
            pageNode: newVal
        })
    }
})))

