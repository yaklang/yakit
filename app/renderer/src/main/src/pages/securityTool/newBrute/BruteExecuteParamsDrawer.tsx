import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import React, {useEffect, useState} from "react"
import styles from "./BruteExecuteParamsDrawer.module.scss"
import {BruteExecuteExtraFormValue} from "./NewBruteType"
import {Form, FormInstance} from "antd"
import {useControllableValue, useMemoizedFn} from "ahooks"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {apiGetAllPayloadGroup, apiPayloadByType} from "./utils"
import {yakitNotify} from "@/utils/notification"
import {PayloadGroupNodeProps} from "@/pages/payloadManager/newPayload"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"

interface BruteExecuteParamsDrawerProps {
    extraParamsValue: BruteExecuteExtraFormValue
    visible: boolean
    onSave: (value: BruteExecuteExtraFormValue) => void
}
const BruteExecuteParamsDrawer: React.FC<BruteExecuteParamsDrawerProps> = React.memo((props) => {
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
            className={styles["brute-execute-extra-params-drawer"]}
            visible={visible}
            onClose={onClose}
            width='60%'
            title='额外参数'
        >
            <Form size='small' labelCol={{span: 6}} wrapperCol={{span: 18}} form={form}>
                <BruteSettings visible={visible} form={form} />
                <div className={styles["to-end"]}>已经到底啦～</div>
            </Form>
        </YakitDrawer>
    )
})
export default BruteExecuteParamsDrawer

interface BruteSettingsProps {
    visible: boolean
    form: FormInstance<BruteExecuteExtraFormValue>
}
/**弱口令检测 */
export const BruteSettings: React.FC<BruteSettingsProps> = React.memo((props) => {
    const {visible, form} = props

    const [userType, setUserType] = useState<string>()
    const [password, setPassword] = useState<string>()

    const delayMin = Form.useWatch("DelayMin", form)
    const delayMax = Form.useWatch("DelayMax", form)

    const usernamesDict = Form.useWatch("UsernamesDict", form) || []
    const usernames = Form.useWatch("usernames", form)

    const passwordsDict = Form.useWatch("PasswordsDict", form) || []
    const passwords = Form.useWatch("passwords", form)

    const userSelectType = Form.useWatch("userSelectType", form)
    const passwordSelectType = Form.useWatch("passwordSelectType", form)

    useEffect(() => {
        if (usernamesDict.length === 0 && !usernames) {
            form.setFieldsValue({replaceDefaultUsernameDict: true})
        }
    }, [usernamesDict, usernames])
    useEffect(() => {
        if (passwordsDict.length === 0 && !passwords) {
            form.setFieldsValue({replaceDefaultPasswordDict: true})
        }
    }, [passwordsDict, passwords])

    useEffect(() => {
        setUserType(userSelectType)
    }, [userSelectType])
    useEffect(() => {
        setPassword(passwordSelectType)
    }, [passwordSelectType])

    const onSetUser = useMemoizedFn((v) => {
        form.setFieldsValue({userSelectType: v})
    })
    const onSetPassword = useMemoizedFn((v) => {
        form.setFieldsValue({passwordSelectType: v})
    })
    return (
        <>
            <Form.Item label='选择的用户字典类型,隐藏' name='userSelectType' style={{display: "none"}} />
            <Form.Item
                label='爆破用户字典'
                name='UsernamesDict'
                valuePropName='contentValue'
                trigger='setContentValue'
                validateTrigger='setContentValue'
                normalize={(value) => {
                    return value ? value.split(/,|\r?\n/) : []
                }}
            >
                <SelectPayload visible={visible} selectValue={userType} setSelectValue={onSetUser} />
            </Form.Item>
            <Form.Item label='爆破用户' name='usernames'>
                <YakitInput.TextArea placeholder='请输入爆破用户，多个爆破用户用“英文逗号”或换行分隔' rows={3} />
            </Form.Item>
            <Form.Item label={" "} colon={false} name='replaceDefaultUsernameDict' valuePropName='checked'>
                <YakitCheckbox disabled={usernamesDict.length === 0 && !usernames}>同时使用默认用户字典</YakitCheckbox>
            </Form.Item>
            <Form.Item label='选择的密码字典类型,隐藏' name='passwordSelectType' style={{display: "none"}} />
            <Form.Item
                label='爆破密码字典'
                name='PasswordsDict'
                valuePropName='contentValue'
                trigger='setContentValue'
                validateTrigger='setContentValue'
                normalize={(value) => {
                    return value ? value.split(/,|\r?\n/) : []
                }}
            >
                <SelectPayload visible={visible} selectValue={password} setSelectValue={onSetPassword} />
            </Form.Item>
            <Form.Item label='爆破密码' name='passwords'>
                <YakitInput.TextArea placeholder='请输入爆破密码，多个爆破密码用“英文逗号”或换行分隔' rows={3} />
            </Form.Item>
            <Form.Item label={" "} colon={false} name='replaceDefaultPasswordDict' valuePropName='checked'>
                <YakitCheckbox disabled={passwordsDict.length === 0 && !passwords}>同时使用默认密码字典</YakitCheckbox>
            </Form.Item>
            <Form.Item label='目标并发' name='Concurrent' help='同时爆破 n 个目标'>
                <YakitInputNumber min={0} type='horizontal' />
            </Form.Item>
            <Form.Item label='目标内并发' name='TargetTaskConcurrent' help='每个目标同时执行多少爆破任务'>
                <YakitInputNumber min={0} type='horizontal' />
            </Form.Item>
            <Form.Item label='自动停止' name='OkToStop' help='遇到第一个爆破结果时终止任务' valuePropName='checked'>
                <YakitSwitch />
            </Form.Item>

            <Form.Item label='最小延迟' name='DelayMin'>
                <YakitInputNumber min={0} max={delayMax} type='horizontal' />
            </Form.Item>
            <Form.Item label='最大延迟' name='DelayMax'>
                <YakitInputNumber min={delayMin} type='horizontal' />
            </Form.Item>
        </>
    )
})

interface SelectPayloadProps extends Omit<YakitSelectProps, "value" | "onChange"> {
    visible: boolean
    contentValue?: string | string[]
    setContentValue?: (s: string | string[]) => void
    selectValue?: string
    setSelectValue?: (s: string) => void
}
const SelectPayload: React.FC<SelectPayloadProps> = React.memo((props) => {
    const {visible, contentValue, setContentValue, selectValue, setSelectValue, ...restProps} = props

    const [valueSelect, setValueSelect] = useControllableValue<YakitSelectProps["value"]>(props, {
        valuePropName: "selectValue",
        trigger: "setSelectValue"
    })
    const [data, setData] = useState<PayloadGroupNodeProps[]>([])
    useEffect(() => {
        if (visible) fetchList()
    }, [visible])
    useEffect(() => {
        if (!contentValue?.length) {
            setValueSelect(undefined)
        }
    }, [contentValue])
    const fetchList = () => {
        apiGetAllPayloadGroup()
            .then((data: PayloadGroupNodeProps[]) => {
                setData(data)
            })
            .catch((e: any) => {
                yakitNotify("error", "获取字典列表失败" + e)
            })
            .finally()
    }
    const onSelectChange = useMemoizedFn((value) => {
        if (value) {
            apiPayloadByType(value).then((dict) => {
                if (setContentValue) setContentValue(dict)
            })
        } else {
            if (setContentValue) setContentValue("")
        }
        setValueSelect(value)
    })
    return (
        <YakitSelect allowClear {...restProps} value={valueSelect} onChange={onSelectChange}>
            {data.map((item) => {
                if (item.Type === "Folder") {
                    return item.Nodes.length > 0 ? (
                        <YakitSelect.OptGroup key={item.Name} label={item.Name}>
                            {item.Nodes.map((nodeItem) => (
                                <YakitSelect.Option key={nodeItem.Name} value={nodeItem.Name}>
                                    {nodeItem.Name}
                                </YakitSelect.Option>
                            ))}
                        </YakitSelect.OptGroup>
                    ) : (
                        <React.Fragment key={item.Name}></React.Fragment>
                    )
                }
                return <YakitSelect.Option key={item.Name}>{item.Name}</YakitSelect.Option>
            })}
        </YakitSelect>
    )
})
