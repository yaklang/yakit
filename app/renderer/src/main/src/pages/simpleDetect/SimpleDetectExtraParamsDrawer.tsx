import {PortScanExecuteExtraFormValue} from "../securityTool/newPortScan/NewPortScanType"
import styles from "./SimpleDetectExtraParamsDrawer.module.scss"
import {Form} from "antd"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {useMemoizedFn} from "ahooks"
import {useEffect, useState} from "react"
import React from "react"
import {BruteExecuteExtraFormValue} from "../securityTool/newBrute/NewBruteType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {BruteSettings} from "../securityTool/newBrute/BruteExecuteParamsDrawer"
import {
    BasicCrawlerSettingsPanel,
    FingerprintSettingsPanel,
    NetworkCardSettingsPanel,
    ScanOtherSettingsPanel
} from "../securityTool/newPortScan/NewPortScanExtraParamsDrawer"
import {defaultBruteExecuteExtraFormValue} from "@/defaultConstants/NewBrute"

const {YakitPanel} = YakitCollapse

export interface SimpleDetectExtraParam {
    portScanParam: PortScanExecuteExtraFormValue
    bruteExecuteParam: BruteExecuteExtraFormValue
}
interface SimpleDetectExtraParamsDrawerProps {
    extraParamsValue: SimpleDetectExtraParam
    visible: boolean
    onSave: (v: SimpleDetectExtraParam) => void
}

const SimpleDetectExtraParamsDrawer: React.FC<SimpleDetectExtraParamsDrawerProps> = React.memo((props) => {
    const {extraParamsValue, visible, onSave} = props

    const [activeKey, setActiveKey] = useState<string[]>(["弱口令配置"])

    const [bruteForm] = Form.useForm()
    const [portScanForm] = Form.useForm()
    useEffect(() => {
        if (visible) {
            bruteForm.setFieldsValue({...extraParamsValue.bruteExecuteParam})
            portScanForm.setFieldsValue({...extraParamsValue.portScanParam})
        }
    }, [visible, extraParamsValue])
    const onClose = useMemoizedFn(() => {
        onSaveSetting()
    })
    const onSaveSetting = useMemoizedFn(() => {
        const bruteFormValue = bruteForm.getFieldsValue()
        portScanForm.validateFields().then((portScanFormValue) => {
            const formValue = {
                bruteExecuteParam: bruteFormValue,
                portScanParam: portScanFormValue
            }
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
            <Form size='small' labelWrap={true} labelCol={{span: 6}} wrapperCol={{span: 18}} form={bruteForm} style={{marginBottom: 8}}>
                <YakitCollapse
                    destroyInactivePanel={false}
                    activeKey={activeKey}
                    onChange={(key) => setActiveKey(key as string[])}
                    bordered={false}
                >
                    <BruteSettingsPanel key='弱口令配置' visible={visible} />
                </YakitCollapse>
            </Form>
            <Form size='small' labelCol={{span: 6}} wrapperCol={{span: 18}} form={portScanForm}>
                <SimpleDetectExtraParams visible={visible} />
            </Form>
            <div className={styles["to-end"]}>已经到底啦～</div>
        </YakitDrawer>
    )
})

export default SimpleDetectExtraParamsDrawer

interface BruteSettingsPanelProps {
    visible: boolean
}
export const BruteSettingsPanel: React.FC<BruteSettingsPanelProps> = React.memo((props) => {
    const {visible, ...restProps} = props
    const form = Form.useFormInstance()
    const onResetBrute = useMemoizedFn(() => {
        form.setFieldsValue({
            ...defaultBruteExecuteExtraFormValue
        })
    })
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
                            onResetBrute()
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
    visible: boolean
}
const SimpleDetectExtraParams: React.FC<SimpleDetectExtraParamsProps> = React.memo((props) => {
    const {visible} = props
    const [activeKey, setActiveKey] = useState<string[]>(["网卡配置", "指纹扫描配置", "基础爬虫配置", "其他配置"])

    return (
        <>
            <YakitCollapse
                destroyInactivePanel={false}
                activeKey={activeKey}
                onChange={(key) => setActiveKey(key as string[])}
                bordered={false}
            >
                <NetworkCardSettingsPanel key='网卡配置' visible={visible} />
                <FingerprintSettingsPanel key='指纹扫描配置' isSimpleDetect={true} />
                <BasicCrawlerSettingsPanel key='基础爬虫配置' />
                <ScanOtherSettingsPanel key='其他配置' />
            </YakitCollapse>
        </>
    )
})
