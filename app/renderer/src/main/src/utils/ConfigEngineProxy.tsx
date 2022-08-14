import React, {useEffect, useState} from "react";
import {useMemoizedFn} from "ahooks";
import {Alert, Button, Form, Space, Tag} from "antd";
import {info} from "@/utils/notification";
import {ReloadOutlined} from "@ant-design/icons";
import {showModal} from "@/utils/showModal";
import {InputItem} from "@/utils/inputUtil";
import {getRemoteValue, setRemoteValue} from "@/utils/kv";
import {removeRepeatedElement} from "@/utils/str";

export interface ConfigEngineProxyProp {

}

const HISTORY_ENGINE_PROXY = "HISTORY_ENGINE_PROXY"
const {ipcRenderer} = window.require("electron");
export const ConfigEngineProxy: React.FC<ConfigEngineProxyProp> = (props) => {
    const [proxy, setProxy] = useState("");
    const [loading, setLoading] = useState(false);
    const [historyProxy, setHistoryProxy] = useState<string[]>([]);

    const update = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer.invoke("GetEngineDefaultProxy", {}).then((e: { Proxy: string }) => {
            setProxy(e.Proxy)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        update()

        getRemoteValue(HISTORY_ENGINE_PROXY).then(e => {
            try {
                const arr: string[] = JSON.parse(e);
                setHistoryProxy(removeRepeatedElement(arr))
            } catch (e) {

            }
        })
    }, [])

    return <Form
        onSubmitCapture={e => {
            e.preventDefault()

            setLoading(true)
            ipcRenderer.invoke("SetEngineDefaultProxy", {
                Proxy: proxy,
            }).then(() => {
                try {
                    if (historyProxy.includes(proxy)) {
                        const newHistories = historyProxy.filter(i => i !== proxy);
                        newHistories.unshift(proxy)
                        setRemoteValue(HISTORY_ENGINE_PROXY, JSON.stringify(newHistories))
                        setHistoryProxy([...newHistories])
                    } else {
                        historyProxy.unshift(proxy)
                        setRemoteValue(HISTORY_ENGINE_PROXY, JSON.stringify(historyProxy))
                        setHistoryProxy([...historyProxy])
                    }
                } catch (e) {

                }

                info("设置引擎代理成功")
            }).finally(() => setTimeout(() => setLoading(false), 300))
        }}
        labelCol={{span: 5}} wrapperCol={{span: 14}}
    >
        <Form.Item label={" "} colon={false}>
            <Alert
                closable={false} type={"info"}
                message={<>
                    <Space direction={"vertical"}>
                        <Space>
                            <div>
                                当前引擎代理为：
                            </div>
                            <Tag color={"red"}>{proxy}</Tag>
                            <Button type={"link"} icon={<ReloadOutlined/>} onClick={update}/>
                        </Space>
                        <div>
                            本配置将会对绝大部分 Yak 插件自动生效，如果在扫描模块中配置代理，一般来说，配置的代理将会自动覆盖这个配置。
                        </div>
                    </Space>
                </>}
            />
        </Form.Item>
        <InputItem
            label={"代理"} value={proxy} setValue={setProxy} autoComplete={historyProxy}
            help={"例如 http://127.0.0.1:7890 或 socks://127.0.0.1:7890 等配置均可"}
        />
        <Form.Item colon={false} label={" "}>
            <Button loading={loading} type="primary" htmlType="submit"> 更新引擎代理 </Button>
        </Form.Item>
    </Form>
};

export const showConfigEngineProxyForm = () => {
    showModal({
        title: "配置引擎扫描代理",
        width: 800,
        content: (
            <>
                <ConfigEngineProxy/>
            </>
        )
    })
}