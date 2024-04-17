import {E} from "@/alibaba/ali-react-table-dist/dist/chunks/ali-react-table-pipeline-2201dfe0.esm"
import {PortScanExecuteExtraFormValue} from "../securityTool/newPortScan/NewPortScanType"
import styles from "./SimpleDetectExtraParamsDrawer.module.scss"
import {Form, FormInstance} from "antd"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {useMemoizedFn} from "ahooks"
import {useEffect, useState} from "react"
import React from "react"
import { BruteExecuteExtraFormValue } from "../securityTool/newBrute/NewBruteType"
import { YakitButton } from "@/components/yakitUI/YakitButton/YakitButton"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import { BruteSettings } from "../securityTool/newBrute/BruteExecuteParamsDrawer"

const {YakitPanel} = YakitCollapse
interface SimpleDetectExtraParamsDrawerProps {
    extraParamsValue: PortScanExecuteExtraFormValue
    visible: boolean
    onSave: (v: PortScanExecuteExtraFormValue) => void
}

const SimpleDetectExtraParamsDrawer: React.FC<SimpleDetectExtraParamsDrawerProps> = React.memo((props) => {
    const {extraParamsValue, visible, onSave} = props
    const [form] = Form.useForm()
    useEffect(() => {
        if (visible) {
            form.setFieldsValue({...extraParamsValue})
        }
    }, [visible, extraParamsValue])
    const onClose = useMemoizedFn(() => {
        onSaveSetting()
    })
    const onSaveSetting = useMemoizedFn(() => {
        form.validateFields().then((formValue) => {
            onSave(formValue)
        })
    })
    return (
        <YakitDrawer
            className={styles["simple-detect-execute-extra-params-drawer"]}
            visible={visible}
            onClose={onClose}
            width='65%'
            title='额外参数'
        >
            <Form size='small' labelCol={{span: 6}} wrapperCol={{span: 18}} form={form}>
                <SimpleDetectExtraParams form={form} visible={visible} />
                <div className={styles["to-end"]}>已经到底啦～</div>
            </Form>
        </YakitDrawer>
    )
})

export default SimpleDetectExtraParamsDrawer

interface BruteSettingsPanelProps {
    onReset: (s: string) => void
    visible: boolean
    form: FormInstance<BruteExecuteExtraFormValue>
}
export const BruteSettingsPanel: React.FC<BruteSettingsPanelProps> = React.memo((props) => {
    const {onReset, visible, form, ...restProps} = props
    return (
        <>
            <YakitPanel
                {...restProps} // 仅为了让Panel正确得渲染/展开折叠，暂无其他作用
                header='弱口令设置'
                key='弱口令设置'
                extra={
                    <YakitButton
                        type='text'
                        colors='danger'
                        size='small'
                        onClick={(e) => {
                            e.stopPropagation()
                            onReset("弱口令设置")
                        }}
                    >
                        重置
                    </YakitButton>
                }
            >
                <BruteSettings visible={visible} form={form} />
            </YakitPanel>
        </>
    )
})
interface SimpleDetectExtraParamsProps {
    form: FormInstance<PortScanExecuteExtraFormValue>
    visible: boolean
}
const SimpleDetectExtraParams: React.FC<SimpleDetectExtraParamsProps> = React.memo((props) => {
    const [activeKey, setActiveKey] = useState<string[]>(["指纹扫描配置", "弱口令配置", "基础爬虫配置", "其他配置"])
    return <div></div>
})
