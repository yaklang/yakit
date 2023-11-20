import { ResultObjProps } from "@/pages/dynamicControl/DynamicControl"
import {API} from "@/services/swagger/resposeType"
import {create} from "zustand"

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

export interface DynamicStatusProps extends ResultObjProps{
    /**是否远程控制中*/
    isDynamicStatus:boolean
    /**是否被远程控制中*/
    isDynamicSelfStatus:boolean
    /**私有域地址*/
    baseUrl:string
}

interface YakitDynamicStatusProps{
    /**@name 远程控制状态参数 */
    dynamicStatus: DynamicStatusProps
    setDynamicStatus: (info: DynamicStatusProps) => void
}

export const yakitDynamicStatus = create<YakitDynamicStatusProps>((set, get) => ({
    dynamicStatus: {
        isDynamicStatus:false,
        isDynamicSelfStatus:false,
        baseUrl:"",
        id: "",
        host:"",
        port:0,
        note:"",
        pubpem:"",
        secret:"",
    },
    setDynamicStatus: (info) => set({dynamicStatus: info})
}))