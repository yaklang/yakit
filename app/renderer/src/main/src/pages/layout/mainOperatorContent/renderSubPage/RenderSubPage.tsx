import {NoPaddingRoute, RouteToPageItem} from "@/routes/newRoute"
import React, {useEffect, useMemo, useRef} from "react"
import {useMap, useMemoizedFn} from "ahooks"
import styles from "./RenderSubPage.module.scss"
import {PageItemProps, RenderFuzzerSequenceProps, RenderSubPageProps} from "./RenderSubPageType"
import FuzzerSequence from "@/pages/fuzzer/FuzzerSequence/FuzzerSequence"
import {useFuzzerSequence} from "@/store/fuzzerSequence"
import {PageLoading} from "@ant-design/pro-layout"
import {usePageInfo} from "@/store/pageInfo"
import {YakitRoute} from "@/routes/newRouteConstants"

const FuzzerSequenceWrapper = React.lazy(() => import("@/pages/fuzzer/WebFuzzerPage/FuzzerSequenceWrapper"))

export const RenderSubPage: React.FC<RenderSubPageProps> = React.memo(
    (props) => {
        const {renderSubPage, route, pluginId, selectSubMenuId = "0"} = props
        const pageRenderListRef = useRef<Map<string, boolean>>(new Map<string, boolean>())
        const pageRenderList = useMemo(() => {
            if (selectSubMenuId === "0") return pageRenderListRef.current
            pageRenderListRef.current.set(selectSubMenuId, true)
            return pageRenderListRef.current
        }, [selectSubMenuId])
        return (
            <>
                {renderSubPage.map((subItem, numberSub) => {
                    return (
                        pageRenderList.get(subItem.id) && (
                            <React.Fragment key={subItem.id}>
                                <div
                                    key={subItem.id}
                                    id={subItem.id}
                                    tabIndex={selectSubMenuId === subItem.id ? 1 : -1}
                                    style={{
                                        display: selectSubMenuId === subItem.id ? "" : "none",
                                        padding: NoPaddingRoute.includes(route) ? 0 : "8px 16px 13px 16px"
                                    }}
                                    className={styles["page-body"]}
                                >
                                    <PageItem
                                        routeKey={route}
                                        yakScriptId={+(pluginId || 0)}
                                        params={subItem.pageParams}
                                    />
                                </div>
                            </React.Fragment>
                        )
                    )
                })}
            </>
        )
    },
    (preProps, nextProps) => {
        if (preProps.renderSubPage.length !== nextProps.renderSubPage.length) {
            return false
        }
        if (preProps.selectSubMenuId !== nextProps.selectSubMenuId) {
            return false
        }
        return true
    }
)

export const RenderFuzzerSequence: React.FC<RenderFuzzerSequenceProps> = React.memo((props) => {
    const {route, type, setType} = props

    const [pageSequenceRenderList, {set: setPageSequenceRenderList, get: getPageSequenceRenderList}] = useMap<
        string,
        boolean
    >(new Map<string, boolean>())
    const fuzzerSequenceList = useFuzzerSequence((s) => s.fuzzerSequenceList)
    const selectGroupId = usePageInfo((s) => s.selectGroupId.get(YakitRoute.HTTPFuzzer) || "")

    useEffect(() => {
        updateRender(selectGroupId)
    }, [type, selectGroupId])
    const updateRender = useMemoizedFn((id: string) => {
        // 控制渲染
        if (getPageSequenceRenderList(id)) return
        if (type === "sequence" && id !== "0") {
            setPageSequenceRenderList(id, true)
        }
    })
    return (
        <div
            className={styles["fuzzer-sequence-list"]}
            tabIndex={type === "sequence" ? 1 : -1}
            style={{display: type === "sequence" ? "" : "none"}}
        >
            {route === YakitRoute.HTTPFuzzer && (
                <>
                    {fuzzerSequenceList.map(
                        (ele) =>
                            getPageSequenceRenderList(ele.groupId) && (
                                <div
                                    key={ele.groupId}
                                    className={styles["fuzzer-sequence-list-item"]}
                                    style={{display: selectGroupId === ele.groupId ? "" : "none"}}
                                >
                                    <React.Suspense fallback={<PageLoading />}>
                                        <FuzzerSequenceWrapper>
                                            <FuzzerSequence groupId={ele.groupId} setType={setType} />
                                        </FuzzerSequenceWrapper>
                                    </React.Suspense>
                                </div>
                            )
                    )}
                </>
            )}
        </div>
    )
})

const PageItem: React.FC<PageItemProps> = React.memo(
    (props) => {
        // useWhyDidYouUpdate("PageItem", {...props})
        return <RouteToPageItem {...props} />
    },
    (preProps, nextProps) => {
        if (preProps.routeKey === nextProps.routeKey) {
            return true
        }
        return false
    }
)

export default PageItem
