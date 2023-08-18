import { NoPaddingRoute, RouteToPage, YakitRoute } from "@/routes/newRoute"
import React, { useContext, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { useMap, useDebounceEffect, useMemoizedFn } from "ahooks"
import styles from "./RenderSubPage.module.scss"
import { PageItemProps, RenderFuzzerSequenceProps, RenderSubPageItemProps, RenderSubPageProps } from "./RenderSubPageType"
import { SubPageContext } from "../../MainContext"
import { MultipleNodeInfo } from "../MainOperatorContentType"
import FuzzerSequence from "@/pages/fuzzer/FuzzerSequence/FuzzerSequence"
import { WebFuzzerPage } from "@/pages/fuzzer/WebFuzzerPage/WebFuzzerPage"
import { WebFuzzerType } from "@/pages/fuzzer/WebFuzzerPage/WebFuzzerPageType"
import { FuzzerSequenceListProps, useFuzzerSequence } from "@/store/fuzzerSequence"

export const RenderSubPage: React.FC<RenderSubPageProps> = React.memo((props) => {
    const { renderSubPage, route, pluginId, selectSubMenuId } = props;

    const [pageRenderList, { set: setPageRenderList, get: getPageRenderList }] = useMap<string, boolean>(
        new Map<string, boolean>()
    )
    useDebounceEffect(
        () => {
            if (getPageRenderList(selectSubMenuId)) return
            // 控制渲染
            setPageRenderList(selectSubMenuId, true)
        },
        [selectSubMenuId],
        { wait: 100, leading: true }
    )

    return (
        <>
            {renderSubPage.map((subItem, numberSub) => {
                return (
                    getPageRenderList(subItem.id) && (
                        <React.Fragment key={subItem.id}>
                            <RenderSubPageItem subItem={subItem} selectSubMenuId={selectSubMenuId} route={route} pluginId={pluginId} />
                        </React.Fragment>

                    )
                )
            })}

        </>)
}, (preProps, nextProps) => {
    const preIds = preProps.renderSubPage.map(ele => ele.id)
    const nextIds = nextProps.renderSubPage.map(ele => ele.id)
    if (preIds !== nextIds) {
        return false
    }
    if (preProps.selectSubMenuId !== nextProps.selectSubMenuId) {
        return false
    }
    return true
})


const RenderSubPageItem: React.FC<RenderSubPageItemProps> = React.memo((props) => {
    const { subItem, selectSubMenuId, route, pluginId } = props;
    return (<div
        key={subItem.id}
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
            params={subItem.params}
        />
    </div>)
}, (preProps, nextProps) => {
    if (preProps.selectSubMenuId !== nextProps.selectSubMenuId && preProps.selectSubMenuId === preProps.subItem.id) {
        return false
    }
    if (preProps.selectSubMenuId !== nextProps.selectSubMenuId && nextProps.selectSubMenuId === nextProps.subItem.id) {
        return false
    }
    return true
})


export const RenderFuzzerSequence: React.FC<RenderFuzzerSequenceProps> = React.memo((props) => {

    const { route } = props
    const { type, setType } = useContext(SubPageContext)
    const [fuzzerSequenceList, setFuzzerSequenceList] = useState<FuzzerSequenceListProps[]>([])
    const [selectGroupId, setSelectGroupId] = useState<string>('')

    const [pageSequenceRenderList, { set: setPageSequenceRenderList, get: getPageSequenceRenderList }] = useMap<string, boolean>(
        new Map<string, boolean>()
    )
    useEffect(() => {
        const unFuzzerSequenceList = useFuzzerSequence.subscribe(
            (state) => state.fuzzerSequenceList,
            (val) => {
                setFuzzerSequenceList(val)
            }
        )
        return () => {
            unFuzzerSequenceList()
        }
    }, [])
    useEffect(() => {
        const unSelectGroupId = useFuzzerSequence.subscribe(
            (state) => state.selectGroupId,
            (val) => {
                updateRender(val)
                setSelectGroupId(val)
            }
        )
        return () => {
            unSelectGroupId()
        }
    }, [])
    useEffect(() => {
        updateRender(selectGroupId)
    }, [type])
    const updateRender = useMemoizedFn((id: string) => {
        // 控制渲染
        if (getPageSequenceRenderList(id)) return
        if (type === 'sequence' && id !== '0') {
            setPageSequenceRenderList(id, true)
        }
    })
    return (<div className={styles['fuzzer-sequence-list']} tabIndex={type === 'sequence' ? 1 : -1} style={{ display: type === 'sequence' ? '' : 'none' }}>
        {
            route === YakitRoute.HTTPFuzzer && <>
                {
                    fuzzerSequenceList.map(ele => (
                        getPageSequenceRenderList(ele.groupId) && <div
                            key={ele.groupId}
                            className={styles['fuzzer-sequence-list-item']}
                            style={{ display: selectGroupId === ele.groupId ? '' : 'none' }}
                        >
                            <WebFuzzerPage type='sequence' groupId={ele.groupId}>
                                <FuzzerSequence groupId={ele.groupId} setType={setType} />
                            </WebFuzzerPage>
                        </div>))
                }
            </>
        }
    </div>)
})

const PageItem: React.FC<PageItemProps> = React.memo(
    (props) => {
        const { routeKey, yakScriptId, params } = props
        return <>{RouteToPage(routeKey, yakScriptId, params)}</>
    },
    (preProps, nextProps) => {
        if (preProps.routeKey === nextProps.routeKey) {
            return true
        }
        return false
    }
)

export default PageItem