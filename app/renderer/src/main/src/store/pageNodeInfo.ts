/**
 * @description 页面节点数据中心  目前仅支持多开页面
 */

import { AdvancedConfigValueProps } from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import { YakitRoute } from "../routes/newRoute"
import create, { useStore } from "zustand"
import { subscribeWithSelector } from 'zustand/middleware'
import { randomString } from "@/utils/randomUtil"


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
    pageId: string
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
    currentSelectGroup: Map<string, PageNodeItemProps>

    getCurrentGroupAllTabName: (key) => string[]
    getCurrentSelectGroup: (key) => PageNodeItemProps | undefined
    setCurrentSelectGroup: (key, pageGroupId: string) => void
    removeCurrentSelectGroup: (key) => void

    getPageNodeInfoByPageId: (key, pageId: string) => NodeInfoProps | undefined
    updatePageNodeInfoByPageId: (key, pageId: string, val: PageNodeItemProps) => void
    /**
     * @name 通过pageId删除该页面的数据 
     * @returns {PageNodeItemProps} 返回被删除的页面数据
    */
    removePageNodeInfoByPageId: (key, pageId: string) => PageNodeItemProps | undefined


    getPageNodeInfoByPageGroupId: (key, pageGroupId: string) => PageNodeItemProps | undefined
    /**@name 设置组内的数据 */
    setPageNodeInfoByPageGroupId: (key, pageGroupId: string, list: PageNodeItemProps[]) => void
    /**@name 通过pageGroupId找到对应的组数据,向该组内新增数据 */
    addPageNodeInfoByPageGroupId: (key, pageGroupId: string, val: PageNodeItemProps, destinationIndex?: number) => void


    /**@name 通过tab组的pageGroupId删除该组下的所有数据 */
    removePageNodeByPageGroupId: (key, pageGroupId: string) => void
    /**@name 1.通过tab组的pageGroupId删除该组下的所有数据2.将组(pageGroupId)内的数据从pageChildrenList扁平/游离状态 */
    flatPageChildrenListAndRemoveGroupByPageGroupId: (key, pageGroupId: string) => void
    /**@name 组内交换顺序 */
    exchangeOrderPageNodeByPageGroupId: (key, pageGroupId: string, sourceIndex: number, destinationIndex: number) => void

    /**@name 新增二级tab数据(包括游离和组两种类型的数据增加) */
    addPageNode: (key, list: PageNodeItemProps) => void
    getPageNode: (key) => PageInfoProps | undefined
    setPageNode: (key, v) => void
    removePageNode: (key: string) => void
    clearPageNode: () => void
}

export const usePageNode = create<PageNodeInfoProps>()(subscribeWithSelector((set, get) => ({
    pageNode: new Map(),
    currentSelectGroup: new Map(),
    getCurrentGroupAllTabName: (key) => {
        const node = get().pageNode.get(key);
        if (!node) return []
        const { pageNodeList } = node
        const current: PageNodeItemProps | undefined = get().currentSelectGroup.get(key)
        if (!current) return []
        const item = getPageNodeInfoById(pageNodeList, current.pageId)
        return item.currentItem.pageChildrenList.map(ele => ele.pageName) || []
    },
    getCurrentSelectGroup: (key) => {
        const node: PageNodeItemProps | undefined = get().currentSelectGroup.get(key);
        if (!node) return
        return node
    },
    setCurrentSelectGroup: (key, groupId) => {
        const node = get().pageNode.get(key);
        if (!node) return
        const { pageNodeList } = node
        const selectGroup = get().currentSelectGroup
        const item = getPageNodeInfoById(pageNodeList, groupId)
        if (!item) return
        selectGroup.set(key, item.currentItem)
        set({
            ...get(),
            currentSelectGroup: selectGroup
        })
    },
    removeCurrentSelectGroup: (key) => {
        const currentSelectGroup = get().currentSelectGroup;
        currentSelectGroup.delete(key)
        set({
            ...get(),
            currentSelectGroup
        })
    },
    getPageNodeInfoByPageId: (key, pageId) => {
        const node = get().pageNode.get(key);
        if (!node) return
        const { pageNodeList } = node
        const item = getPageNodeInfoById(pageNodeList, pageId)
        return item
    },
    getPageNodeInfoByPageGroupId: (key, pageGroupId) => {
        const node = get().pageNode.get(key);
        if (!node) return
        const { pageNodeList } = node
        const item = pageNodeList.find(ele => ele.pageId === pageGroupId)
        return item
    },
    updatePageNodeInfoByPageId: (key, pageId, val) => {
        const node = get().pageNode.get(key);
        if (!node) return
        const { pageNodeList } = node
        const item = getPageNodeInfoById(pageNodeList, pageId)
        const { index, subIndex } = item;
        if (index === -1) return
        if (subIndex === -1) {
            pageNodeList[index] = { ...val }
        } else {
            pageNodeList[index].pageChildrenList[subIndex] = {
                ...val
            }
        }
        const newNode = new Map().set(key, {
            ...node,
        })
        set({
            ...get(),
            pageNode: newNode
        })
    },
    removePageNodeInfoByPageId: (key, pageId) => {
        const newVal = get().pageNode
        const node: PageInfoProps | undefined = newVal.get(key);
        if (!node) return
        const { pageNodeList } = node
        const itemNodeInfo = getPageNodeInfoById(pageNodeList, pageId)
        const { index, subIndex, parentItem, currentItem } = itemNodeInfo;
        const newPageChildrenList = parentItem.pageChildrenList.filter(ele => ele.pageId !== pageId)
        if (newPageChildrenList.length === 0) {
            pageNodeList.splice(index, 1)
        } else {
            pageNodeList[index].pageChildrenList = newPageChildrenList
        }
        node.pageNodeList = [...pageNodeList];
        newVal.set(key, { ...node })
        // console.log('removePageNodeInfoByPageId', newVal)
        set({
            ...get(),
            pageNode: newVal
        })
        return currentItem
    },
    setPageNodeInfoByPageGroupId: (key, pageGroupId, list) => {
        const newVal = get().pageNode
        const node = newVal.get(key);
        if (!node) return
        const { pageNodeList } = node
        const index = pageNodeList.findIndex(ele => ele.pageId === pageGroupId)
        if (index === -1) return
        pageNodeList[index].pageChildrenList = list
        node.pageNodeList = [...pageNodeList];

        newVal.set(key, { ...node })
        set({
            ...get(),
            pageNode: newVal
        })
    },
    removePageNodeByPageGroupId: (key, pageGroupId) => {
        const newVal = get().pageNode
        const node: PageInfoProps | undefined = newVal.get(key);
        if (!node) return
        const newPageNodeList: PageNodeItemProps[] = node.pageNodeList.filter(ele => ele.pageId !== pageGroupId)
        node.pageNodeList = [...newPageNodeList];
        newVal.set(key, { ...node })
        set({
            ...get(),
            pageNode: newVal
        })
    },
    flatPageChildrenListAndRemoveGroupByPageGroupId: (key, pageGroupId) => {
        const newVal = get().pageNode
        const node: PageInfoProps | undefined = newVal.get(key);
        if (!node) return
        let newPageNodeList: PageNodeItemProps[] = []
        const l = node.pageNodeList.length
        for (let index = 0; index < l; index++) {
            const element = node.pageNodeList[index];
            if (element.pageId === pageGroupId) {
                const childrenList: PageNodeItemProps[] = []
                element.pageChildrenList.forEach((ele) => {
                    childrenList.push({
                        ...ele,
                        pageGroupId: '0'
                    })
                })
                newPageNodeList = [
                    ...newPageNodeList,
                    ...childrenList,
                ]
            } else {
                newPageNodeList.push(element)
            }
        }
        node.pageNodeList = [...newPageNodeList];
        newVal.set(key, { ...node })
        set({
            ...get(),
            pageNode: newVal
        })
    },
    exchangeOrderPageNodeByPageGroupId: (key, pageGroupId, sourceIndex, destinationIndex) => {
        const newVal = get().pageNode
        const node: PageInfoProps | undefined = newVal.get(key);
        if (!node) return
        const { pageNodeList } = node
        const index = pageNodeList.findIndex(ele => ele.pageId === pageGroupId)
        if (index === -1) return
        const currentGroup = pageNodeList[index]
        // 交换元素位置
        let temp = currentGroup.pageChildrenList[sourceIndex]
        currentGroup.pageChildrenList[sourceIndex] = currentGroup.pageChildrenList[destinationIndex]
        currentGroup.pageChildrenList[destinationIndex] = temp

        pageNodeList[index] = currentGroup
        newVal.set(key, { ...node })
        set({
            ...get(),
            pageNode: newVal
        })
    },
    addPageNodeInfoByPageGroupId: (key, pageGroupId, val, destinationIndex) => {
        const newVal = get().pageNode
        const node: PageInfoProps | undefined = newVal.get(key);
        if (!node) return
        const { pageNodeList } = node
        const index = pageNodeList.findIndex(ele => ele.pageId === pageGroupId)
        if (index === -1) return
        const length = pageNodeList[index].pageChildrenList.length

        const addItem = { ...val, id: `${randomString(8)}-${length}` }
        if (destinationIndex === undefined) {
            pageNodeList[index].pageChildrenList.push(addItem)
        } else {
            pageNodeList[index].pageChildrenList.splice(destinationIndex, 0, addItem)
        }
        newVal.set(key, { ...node })
        set({
            ...get(),
            pageNode: newVal
        })
    },
    addPageNode: (key, list) => {
        const newVal = get().pageNode
        let current: PageInfoProps | undefined = newVal.get(key)
        if (!current) {
            current = {
                routeKey: key,
                singleNode: false,
                pageNodeList: [{
                    ...list,
                    id: `${randomString(8)}-${1}`,
                }]
            }
            newVal.set(key, current)
            set({
                ...get(),
                pageNode: newVal
            })
            return
        }
        const { pageNodeList } = current
        const { pageChildrenList } = list
        const newPageNodeList: PageNodeItemProps[] = pageNodeList.filter(ele => pageChildrenList.findIndex(l => l.pageId === ele.pageId) === -1)
        newPageNodeList.push({
            ...list,
            id: `${randomString(8)}-${newPageNodeList.length}`,
        })
        current.pageNodeList = [...newPageNodeList]
        newVal.set(key, current)
        set({
            ...get(),
            pageNode: newVal
        })
    },
    getPageNode: (key) => get().pageNode.get(key),
    setPageNode: (key, ev) => {
        const newVal = get().pageNode
        newVal.set(key, ev)
        set({
            ...get(),
            pageNode: newVal
        })
    },
    removePageNode: (key) => {
        const newVal = get().pageNode
        newVal.delete(key)
        set({
            ...get(),
            pageNode: newVal
        })
    },
    clearPageNode: () => {
        const newVal = get().pageNode
        newVal.clear()
        set({
            ...get(),
            pageNode: newVal
        })
    }
})))

