import {API} from "@/services/swagger/resposeType"
import create from "zustand"

export interface UserInfoProps {
    isLogin: boolean
    platform: string | null
    githubName: string | null
    githubHeadImg: string | null
    wechatName: string | null
    wechatHeadImg: string | null
    qqName: string | null
    qqHeadImg: string | null
    companyName:string | null,
    companyHeadImg:string |null,
    role: string | null
    user_id: number | null
    token: string,
    showStatusSearch?:boolean
}
interface StoreProps {
    /**@name 登录用户信息 */
    userInfo: UserInfoProps
    setStoreUserInfo: (info: UserInfoProps) => void
}

export const useStore = create<StoreProps>((set, get) => ({
    userInfo: {
        isLogin: false,
        platform: null,
        githubName: null,
        githubHeadImg: null,
        wechatName: null,
        wechatHeadImg: null,
        qqName: null,
        qqHeadImg: null,
        companyName:null,
        companyHeadImg:null,
        role: null,
        user_id: null,
        token: "",
        showStatusSearch:false,
    },
    setStoreUserInfo: (info) => set({userInfo: info})
}))

export interface StoreParamsProps{
    // 关键字搜索参数
    keywords:string
    // 插件类型参数
    plugin_type:string
    // 今日/本周
    time_search:string
    // 插件仓库页是否已渲染
    isShowYakitStorePage:boolean
}

interface YakitStoreParamsProps{
    /**@name 插件商店Home页面筛选参数 */
    storeParams: StoreParamsProps
    setYakitStoreParams: (info: StoreParamsProps) => void
}
const typeOnline = "yak,mitm,packet-hack,port-scan,codec,nuclei"
export const YakitStoreParams = create<YakitStoreParamsProps>((set, get) => ({
    storeParams: {
        keywords: "",
        plugin_type:typeOnline,
        isShowYakitStorePage:false,
        time_search:"",
    },
    setYakitStoreParams: (info) => set({storeParams: info})
}))

/**@name 企业简易版安全检测导航栏currentKey传递*/
export let simpleDetectTabsParams = {
    tabId:""
}