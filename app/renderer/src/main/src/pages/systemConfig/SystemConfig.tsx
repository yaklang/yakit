import React, {useEffect, useRef, useState} from "react"
import {Form} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./SystemConfig.module.scss"
import {yakitNotify} from "@/utils/notification"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
export interface SystemConfigProps {}
export const SystemConfig: React.FC<SystemConfigProps> = (props) => {
    const [form] = Form.useForm()
    const openWatermarkWatch = Form.useWatch("openWatermark", form)
    const isCustomizeWatermarkWatch = Form.useWatch("isCustomizeWatermark", form)

    useEffect(() => {
        NetWorkApi<any, API.SystemConfigResponse>({
            method: "get",
            url: "system/config"
        }).then((res) => {
            const data = res.data || []
            if (data.length) {
                const initVal = {}
                data.forEach((item) => {
                    initVal[item.configName] = item.isOpen
                    if (item.configName === "openWatermark") {
                        initVal["isCustomizeWatermark"] = item.content === "" ? 0 : 1
                        initVal["watermarkValue"] = item.content
                    }
                })
                form.setFieldsValue(initVal)
            }
        })
    }, [])

    const handleClickSave = useMemoizedFn(() => {
        form.validateFields()
            .then((values) => {
                const paramsArr: API.SystemConfigDetail[] = []
                Object.keys(values).forEach((key) => {
                    if (!["isCustomizeWatermark", "watermarkValue"].includes(key)) {
                        const item = {
                            configName: key,
                            isOpen: values[key],
                            content:
                                key === "openWatermark"
                                    ? values["isCustomizeWatermark"] === 0
                                        ? ""
                                        : values["watermarkValue"] || ""
                                    : ""
                        }
                        paramsArr.push(item)
                    }
                })
                NetWorkApi<API.SystemConfigDetail[], API.ActionSucceeded>({
                    method: "post",
                    url: "system/config",
                    data: paramsArr
                }).then((res) => {
                    if (res.ok) {
                        yakitNotify("success", "保存成功")
                    }
                })
            })
            .catch((err) => {})
    })
    return (
        <div className={styles["systemSetting"]}>
            <div className={styles["title-box"]}>系统设置</div>
            <Form
                form={form}
                layout='horizontal'
                autoComplete='off'
                labelCol={{span: 2}}
                wrapperCol={{span: 16}}
                initialValues={{
                    openWatermark: false,
                    isCustomizeWatermark: 0,
                    watermarkValue: "",
                    syncData: false,
                    collectData: false
                }}
            >
                <Form.Item label='水印' name='openWatermark' valuePropName={"checked"}>
                    <YakitSwitch checkedChildren='开' unCheckedChildren='关' size='large' />
                </Form.Item>
                {openWatermarkWatch && (
                    <Form.Item
                        label='水印内容'
                        name='isCustomizeWatermark'
                        style={{marginBottom: 10}}
                        extra={
                            isCustomizeWatermarkWatch === 1 && (
                                <Form.Item
                                    label={<> </>}
                                    colon={false}
                                    labelCol={{span: 1}}
                                    wrapperCol={{span: 6}}
                                    style={{marginLeft: 30}}
                                    name='watermarkValue'
                                    rules={[{required: true, message: "请输入自定义水印内容"}]}
                                >
                                    <YakitInput maxLength={15} placeholder='不超过15个字' />
                                </Form.Item>
                            )
                        }
                    >
                        <YakitRadioButtons
                            options={[
                                {
                                    value: 0,
                                    label: "默认"
                                },
                                {
                                    value: 1,
                                    label: "自定义"
                                }
                            ]}
                        />
                    </Form.Item>
                )}

                {/* <Form.Item
                    label='同步数据'
                    name='syncData'
                    valuePropName={"checked"}
                    tooltip='同步各账号的流量数据、漏洞数据等到Web端'
                >
                    <YakitSwitch checkedChildren='开' unCheckedChildren='关' size='large' />
                </Form.Item>
                <Form.Item
                    label='采集使用数据'
                    name='collectData'
                    valuePropName={"checked"}
                    tooltip='采集使用人数与时长数据'
                >
                    <YakitSwitch checkedChildren='开' unCheckedChildren='关' size='large' />
                </Form.Item> */}
                <Form.Item wrapperCol={{span: 12, offset: 2}}>
                    <YakitButton type='primary' onClick={handleClickSave}>
                        保存
                    </YakitButton>
                </Form.Item>
            </Form>
        </div>
    )
}
