import {NoPaddingRoute, RouteToPage, RouteToPageItem, YakitRoute} from "@/routes/newRoute"
import React, {useContext, useEffect, useMemo, useReducer, useRef, useState} from "react"
import {useMap, useDebounceEffect, useMemoizedFn, useWhyDidYouUpdate} from "ahooks"
import styles from "./RenderSubPage.module.scss"
import {PageItemProps, RenderFuzzerSequenceProps, RenderSubPageItemProps, RenderSubPageProps} from "./RenderSubPageType"
import {MultipleNodeInfo} from "../MainOperatorContentType"
import FuzzerSequence from "@/pages/fuzzer/FuzzerSequence/FuzzerSequence"
import {WebFuzzerType} from "@/pages/fuzzer/WebFuzzerPage/WebFuzzerPageType"
import {FuzzerSequenceListProps, useFuzzerSequence} from "@/store/fuzzerSequence"
import {PageLoading} from "@ant-design/pro-layout"
import { usePageInfo } from "@/store/pageInfo"

const WebFuzzerPage = React.lazy(() => import("@/pages/fuzzer/WebFuzzerPage/WebFuzzerPage"))

export const RenderSubPage: React.FC<RenderSubPageProps> = React.memo(
    (props) => {
        const {renderSubPage, route, pluginId, selectSubMenuId = "0"} = props
        const pageRenderListRef = useRef<Map<string, boolean>>(new Map<string, boolean>())
        const pageRenderList = useMemo(() => {
            if (selectSubMenuId === "0") return pageRenderListRef.current
            pageRenderListRef.current.set(selectSubMenuId, true)
            return pageRenderListRef.current
        }, [selectSubMenuId])
        // useWhyDidYouUpdate("RenderSubPage", {...props, pageRenderList, pageRenderListRef})
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
                                    <PageItem routeKey={route} yakScriptId={+(pluginId || 0)} params={subItem.params} />
                                </div>
                                {/* <RenderSubPageItem subItem={subItem} selectSubMenuId={selectSubMenuId} route={route} pluginId={pluginId} /> */}
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

export const RenderSubPageItem: React.FC<RenderSubPageItemProps> = React.memo(
    (props) => {
        const {subItem, selectSubMenuId, route, pluginId} = props
        return (
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
                <PageItem routeKey={route} yakScriptId={+(pluginId || 0)} params={subItem.params} />
            </div>
        )
    },
    (preProps, nextProps) => {
        if (
            preProps.selectSubMenuId !== nextProps.selectSubMenuId &&
            preProps.selectSubMenuId === preProps.subItem.id
        ) {
            return false
        }
        if (
            preProps.selectSubMenuId !== nextProps.selectSubMenuId &&
            nextProps.selectSubMenuId === nextProps.subItem.id
        ) {
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
    const selectGroupId = usePageInfo((s) => s.selectGroupId.get(YakitRoute.HTTPFuzzer)||'')

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
                                        <WebFuzzerPage type='sequence' groupId={ele.groupId}>
                                            <FuzzerSequence groupId={ele.groupId} setType={setType} />
                                        </WebFuzzerPage>
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
