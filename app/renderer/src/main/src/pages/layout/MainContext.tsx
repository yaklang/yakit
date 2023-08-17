import { createContext } from "react";
import { YakitRoute } from "@/routes/newRoute";
import { MultipleNodeInfo, PageCache } from "./mainOperatorContent/MainOperatorContentType";
import { RouteToPageProps } from "./publicMenu/PublicMenu";
import { WebFuzzerType } from "../fuzzer/WebFuzzerPage/WebFuzzerPageType";


/**
 * @description MainOperatorContextProps
 * @property pageCache  路由数据
 * @function setPageCache 修改路由
 * @property currentTabKey 一级选中的tab
 * @function setCurrentTabKey 设置选中tab
 * @property TabMenuHeight tab-menu内容高度
 * @function setTabMenuHeight 设置tab-menu的内容高度
 * @function openMultipleMenuPage 打开页面
 * @function afterDeleteFirstPage 删除一级页面的回调  'all'|'other'|'single' 
 * @function afterDeleteSubPage 删除二级页面的回调 'other'|'single'
 * @function afterUpdateSubItem 更新页面信息后的回调
 * @function onUpdateSubPage 二级tab整体需要修改
 */
export interface MainOperatorContextProps {
    pageCache: PageCache[]
    setPageCache: (p: PageCache[]) => void
    currentTabKey: string
    setCurrentTabKey: (s: YakitRoute | string) => void
    tabMenuHeight: number
    setTabMenuHeight: (n: number) => void
    openMultipleMenuPage: (route: RouteToPageProps) => void
    afterDeleteFirstPage: (type: 'all' | 'other' | 'single', page?: PageCache) => void
    afterDeleteSubPage: (type: 'other' | 'single', r: YakitRoute | string, subItem: MultipleNodeInfo) => void
    afterUpdateSubItem: (page: PageCache, subItem: MultipleNodeInfo) => void
    onUpdateSubPage: (page: PageCache, subItems: MultipleNodeInfo[]) => void
}

export const MainOperatorContext = createContext<MainOperatorContextProps>({
    pageCache: [],
    setPageCache: () => { },
    currentTabKey: "",
    setCurrentTabKey: () => { },
    tabMenuHeight: 0,
    setTabMenuHeight: () => { },
    openMultipleMenuPage: () => { },
    afterDeleteFirstPage: () => { },
    afterDeleteSubPage: () => { },
    afterUpdateSubItem: () => { },
    onUpdateSubPage: () => { }
})

interface SubPageContextProps {
    // fuzzerSequenceList:FuzzerSequenceReducerProps[]
    // dispatch: React.Dispatch<FuzzerSequenceReducerAction>
    subPage: MultipleNodeInfo[]
    selectSubMenu: MultipleNodeInfo
    type: WebFuzzerType
    setSubPage: (m: MultipleNodeInfo[]) => void
    setSelectSubMenu: (m: MultipleNodeInfo) => void
    setType: (w: WebFuzzerType) => void
    onAddGroup: (pageId: string) => void
}
export const SubPageContext = createContext<SubPageContextProps>({
    // fuzzerSequenceList:[],
    // dispatch: () => { },
    subPage: [],
    selectSubMenu:{
        id: "0",
        verbose: "",
        sortFieId: 1,
        groupId: "0"
    },
    type: 'config',
    setSubPage: () => { },
    setSelectSubMenu: () => { },
    setType: () => { },
    onAddGroup: () => { }
})