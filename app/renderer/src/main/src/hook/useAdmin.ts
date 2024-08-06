import {useEffect, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {useStore} from "@/store"
import {isCommunityEdition, isEnterpriseOrSimpleEdition} from "@/utils/envfile"

interface AdminProps {
    /** 是否为管理员 */
    isAdmin: boolean
    /** 是否为社区版管理员 */
    ce: boolean
    /** 是否为企业版管理员 */
    ee: boolean
}

/** @name 当前登录人是否为管理员 */
function useAdmin(): AdminProps {
    const userInfo = useStore((s) => s.userInfo)

    const [admin, setAdmin] = useState<AdminProps>({
        isAdmin: false,
        ce: false,
        ee: false
    })

    const updateAdmin = useMemoizedFn((role: string | null) => {
        let version: string = ""

        if (isCommunityEdition() && ["superAdmin", "admin"].includes(userInfo.role || "")) {
            version = "ce"
        }
        if (isEnterpriseOrSimpleEdition() && userInfo.role === "admin") {
            version = "ee"
        }

        setAdmin({
            isAdmin: !!version,
            ce: version === "ce",
            ee: version === "ee"
        })
    })

    useEffect(() => {
        updateAdmin(userInfo.role)
    }, [userInfo.role])

    return admin
}

export default useAdmin
