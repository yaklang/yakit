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
    role: string | null
    user_id: number | null
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
        role: null,
        user_id: null
    },
    setStoreUserInfo: (info) => set({userInfo: info})
}))
