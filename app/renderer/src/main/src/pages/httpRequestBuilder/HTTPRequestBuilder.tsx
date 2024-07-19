import React, {useState, useImperativeHandle, useRef, useEffect} from "react"
import {useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import {Form} from "antd"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {PlusIcon, TrashIcon} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import styles from "./HTTPRequestBuilder.module.scss"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {SetVariableItem} from "../fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfig"
import classNames from "classnames"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/enums/yakitRoute"
import emiter from "@/utils/eventBus/eventBus"

const {YakitPanel} = YakitCollapse

type fields = keyof HTTPRequestBuilderParams

interface VariableListProps {
    /**fuzzer页面数据中心的临时缓存的字段名 */
    cacheType?: "variableActiveKeys"
    /**fuzzer页面数据中心缓存的页面id */
    pageId?: string
    field: fields | string
    extra?: (i: number, info: {key; name}) => React.ReactNode
    ref: React.Ref<any>
    collapseWrapperClassName?: string
    onDel?: (i: number) => any
}

/**
 * 目前只有fuzzer的高级配置中使用
 */
export const VariableList: React.FC<VariableListProps> = React.forwardRef(
    ({extra, field, collapseWrapperClassName = "", onDel, pageId, cacheType}, ref) => {
        const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
            (s) => ({
                queryPagesDataById: s.queryPagesDataById,
                updatePagesDataCacheById: s.updatePagesDataCacheById
            }),
            shallow
        )
        const [variableActiveKey, setVariableActiveKey] = useState<string[]>(["0"])

        const formListRef = useRef<HTMLDivElement>(null)

        const [inViewport = true] = useInViewport(formListRef)

        useImperativeHandle(
            ref,
            () => ({
                variableActiveKey,
                setVariableActiveKey: onSetActiveKey
            }),
            [variableActiveKey]
        )

        useEffect(() => {
            if (!cacheType) return
            if (!pageId) return
            if (inViewport) {
                getVariableActiveKey()
                emiter.on("onRefVariableActiveKey", getVariableActiveKey)
            }
            return () => {
                emiter.off("onRefVariableActiveKey", getVariableActiveKey)
            }
        }, [pageId, inViewport])
        const onSetActiveKey = useMemoizedFn((key: string[] | string) => {
            setVariableActiveKey(key as string[])
            onUpdateVariableActiveKey(key as string[])
        })
        const getVariableActiveKey = useMemoizedFn(() => {
            if (!cacheType) return
            if (!pageId) return
            const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, pageId)
            if (currentItem && currentItem.pageParamsInfo.webFuzzerPageInfo) {
                const {webFuzzerPageInfo} = currentItem.pageParamsInfo
                const activeKeys = webFuzzerPageInfo[cacheType] || ["0"]
                setVariableActiveKey([...activeKeys])
            }
        })
        const onUpdateVariableActiveKey = useDebounceFn(
            (key: string[]) => {
                if (!cacheType) return
                if (!pageId) return
                const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, pageId)
                if (!currentItem) return
                if (currentItem.pageParamsInfo.webFuzzerPageInfo) {
                    const newCurrentItem: PageNodeItemProps = {
                        ...currentItem,
                        pageParamsInfo: {
                            webFuzzerPageInfo: {
                                ...currentItem.pageParamsInfo.webFuzzerPageInfo,
                                [cacheType]: key
                            }
                        }
                    }
                    updatePagesDataCacheById(YakitRoute.HTTPFuzzer, {...newCurrentItem})
                }
            },
            {wait: 200, leading: true}
        ).run
        return (
            <Form.List name={field}>
                {(fields, {add}) => {
                    return (
                        <>
                            <div ref={formListRef} />
                            <YakitCollapse
                                destroyInactivePanel={true}
                                defaultActiveKey={variableActiveKey}
                                activeKey={variableActiveKey}
                                onChange={onSetActiveKey}
                                className={classNames(styles["variable-list"], collapseWrapperClassName)}
                                bordered={false}
                            >
                                {fields.map(({key, name}, i) => (
                                    <YakitPanel
                                        key={`${key + ""}`}
                                        header={`变量 ${name}`}
                                        className={styles["variable-list-panel"]}
                                        extra={
                                            <div className={styles["extra-wrapper"]}>
                                                <TrashIcon
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (onDel) onDel(i)
                                                    }}
                                                    className={styles["variable-list-remove"]}
                                                />
                                                {extra ? extra(i, {key, name}) : null}
                                            </div>
                                        }
                                    >
                                        <SetVariableItem name={name} />
                                    </YakitPanel>
                                ))}
                            </YakitCollapse>
                            {fields?.length === 0 && (
                                <>
                                    <YakitButton
                                        type='outline2'
                                        onClick={() => {
                                            add({Key: "", Value: "", Type: "raw"})
                                            onSetActiveKey([
                                                ...(variableActiveKey || []),
                                                `${variableActiveKey?.length}`
                                            ])
                                        }}
                                        icon={<PlusIcon />}
                                        block
                                    >
                                        添加
                                    </YakitButton>
                                </>
                            )}
                        </>
                    )
                }}
            </Form.List>
        )
    }
)
