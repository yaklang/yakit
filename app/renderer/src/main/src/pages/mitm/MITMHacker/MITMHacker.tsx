import React, {useEffect, useState} from "react"
import {MITMHackerProps} from "./MITMHackerType"
import {YakitRoute} from "@/enums/yakitRoute"
import {usePageInfo, PageNodeItemProps, MITMHackerPageInfoProps} from "@/store/pageInfo"
import {useMemoizedFn} from "ahooks"
import {shallow} from "zustand/shallow"
import {defaultMITMHackerPageInfo} from "@/defaultConstants/mitm"

const MITMHacker: React.FC<MITMHackerProps> = React.memo((props) => {
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
            YakitRoute.MITMHacker,
            YakitRoute.MITMHacker
        )
        if (currentItem && currentItem.pageParamsInfo.mitmHackerPageInfo) {
            return currentItem.pageParamsInfo.mitmHackerPageInfo
        }
        return {...defaultMITMHackerPageInfo}
    })
    const [pageInfo, setPageInfo] = useState<MITMHackerPageInfoProps>(initPageInfo())
    useEffect(() => {
        console.log("pageInfo", pageInfo)
    }, [])
    return <div>MITMHacker</div>
})

export default MITMHacker
