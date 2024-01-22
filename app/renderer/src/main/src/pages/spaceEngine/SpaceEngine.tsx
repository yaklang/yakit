import React, {MouseEventHandler, ReactNode, useEffect, useRef, useState} from "react"
import styles from "./SpaceEngine.module.scss"
import {OutlineChevrondoubledownIcon, OutlineChevrondoubleupIcon} from "@/assets/icon/outline"
import {ExpandAndRetract} from "../plugins/operator/expandAndRetract/ExpandAndRetract"
import {useInViewport, useMemoizedFn} from "ahooks"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute, YakitRouteToPageInfo} from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"
import {Form} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"

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
    const [form] = Form.useForm()
    /**是否展开/收起 */
    const [isExpand, setIsExpand] = useState<boolean>(false)
    const [tabName, setTabName] = useState<string>(initSpaceEnginePageInfo())
    /**是否在执行中 */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)

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
    const onStartExecute = useMemoizedFn(() => {})
    const onStopExecute = useMemoizedFn(() => {})
    return (
        <div className={styles["space-engine-wrapper"]} ref={spaceEngineWrapperRef}>
            <ExpandAndRetract className={styles["space-engine-heard"]} onExpand={onExpand} isExpand={isExpand}>
                <span className={styles["space-engine-heard-tabName"]}>{tabName}</span>
            </ExpandAndRetract>
            <Form
                form={form}
                onFinish={onStartExecute}
                labelCol={{span: 6}}
                wrapperCol={{span: 12}} //这样设置是为了让输入框居中
                validateMessages={{
                    /* eslint-disable no-template-curly-in-string */
                    required: "${label} 是必填字段"
                }}
                labelWrap={true}
            >
                <SpaceEngineFormContent />
                <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                    <div className={styles["space-engine-form-operate"]}>
                        {isExecuting ? (
                            <YakitButton danger onClick={onStopExecute} size='large'>
                                停止
                            </YakitButton>
                        ) : (
                            <YakitButton
                                className={styles["space-engine-form-operate-start"]}
                                htmlType='submit'
                                size='large'
                            >
                                开始执行
                            </YakitButton>
                        )}
                    </div>
                </Form.Item>
            </Form>
        </div>
    )
})
interface SpaceEngineFormContentProps {}
const SpaceEngineFormContent: React.FC<SpaceEngineFormContentProps> = React.memo((props) => {
    return (
        <>
            <Form.Item name='Type' label='引擎' rules={[{required: true, message: "请选择引擎"}]}>
                <YakitSelect
                    options={[
                        {label: "ZoomEye", value: "zoomeye"},
                        {label: "Fofa", value: "fofa"},
                        {label: "Shodan", value: "shodan"},
                        {label: "不设置", value: ""}
                    ]}
                />
            </Form.Item>
        
        </>
    )
})
