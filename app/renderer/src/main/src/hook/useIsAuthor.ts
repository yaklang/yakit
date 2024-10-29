import {useStore} from "@/store"

/** @name 判断传入的用户(ID)是否为当前登录用户 */
function useIsLoginAuthor(state: number): boolean {
    const userInfo = useStore((s) => s.userInfo)
    return userInfo.user_id === state
}

export default useIsLoginAuthor
