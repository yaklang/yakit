import React, {MouseEventHandler, ReactNode, useEffect, useRef, useState} from "react"
import styles from "./SpaceEngine.module.scss"
import {OutlineChevrondoubledownIcon, OutlineChevrondoubleupIcon} from "@/assets/icon/outline"
import {ExpandAndRetract} from "../plugins/operator/expandAndRetract/ExpandAndRetract"
import {useInViewport, useMemoizedFn} from "ahooks"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute, YakitRouteToPageInfo} from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"

interface SpaceEngineProps {
    /**页面id */
    pageId: string
}
export const SpaceEngine: React.FC<SpaceEngineProps> = React.memo((props) => {
    const {pageId} = props
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const initSpaceEnginePageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.Space_Engine, pageId)
        if (currentItem && currentItem.pageName) {
            return currentItem.pageName
        }
        return YakitRouteToPageInfo[YakitRoute.Space_Engine].label
    })
    /**是否展开/收起 */
    const [isExpand, setIsExpand] = useState<boolean>(false)
    const [tabName, setTabName] = useState<string>(initSpaceEnginePageInfo())

    const spaceEngineWrapperRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(spaceEngineWrapperRef)

    useEffect(() => {
        if (inViewport) emiter.on("secondMenuTabDataChange", onSetTabName)
        return () => {
            emiter.off("secondMenuTabDataChange", onSetTabName)
        }
    }, [inViewport])
    const onSetTabName = useMemoizedFn(() => {
        setTabName(initSpaceEnginePageInfo())
    })
    const onExpand = useMemoizedFn((e) => {
        setIsExpand(!isExpand)
    })
    return (
        <div className={styles["space-engine-wrapper"]} ref={spaceEngineWrapperRef}>
            <ExpandAndRetract className={styles["space-engine-heard"]} onExpand={onExpand} isExpand={isExpand}>
                <span className={styles["space-engine-heard-tabName"]}>{tabName}</span>
            </ExpandAndRetract>
        </div>
    )
})
