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
import {apiSystemConfig} from "@/components/layout/utils"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
export interface SystemConfigProps {}
export const SystemConfig: React.FC<SystemConfigProps> = (props) => {
    const {t} = useI18nNamespaces(["setting", "yakitUi"])
    const [form] = Form.useForm()
    const openWatermarkWatch = Form.useWatch("openWatermark", form)
    const isCustomizeWatermarkWatch = Form.useWatch("isCustomizeWatermark", form)

    useEffect(() => {
        apiSystemConfig().then((res) => {
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
                        yakitNotify("success", t("YakitNotification.saved"))
                    }
                })
            })
            .catch((err) => {})
    })
    return (
        <div className={styles["systemSetting"]}>
            <div className={styles["title-box"]}>{t("SystemConfig.systemSettings")}</div>
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
                <Form.Item label={t("SystemConfig.watermark")} name='openWatermark' valuePropName={"checked"}>
                    <YakitSwitch
                        checkedChildren={t("SystemConfig.on")}
                        unCheckedChildren={t("SystemConfig.off")}
                        size='large'
                    />
                </Form.Item>
                {openWatermarkWatch && (
                    <Form.Item
                        label={t("SystemConfig.watermarkContent")}
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
                                    rules={[{required: true, message: t("SystemConfig.enterCustomWatermark")}]}
                                >
                                    <YakitInput maxLength={15} placeholder={t("SystemConfig.watermarkPlaceholder")} />
                                </Form.Item>
                            )
                        }
                    >
                        <YakitRadioButtons
                            options={[
                                {
                                    value: 0,
                                    label: t("SystemConfig.default")
                                },
                                {
                                    value: 1,
                                    label: t("SystemConfig.custom")
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
                        {t("YakitButton.save")}
                    </YakitButton>
                </Form.Item>
            </Form>
        </div>
    )
}
