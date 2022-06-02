import React, {useEffect, useState, Suspense, lazy} from 'react';
import {Form, Modal, notification, Spin, Tabs, Typography} from "antd";

// by types
import {yakEcho} from "./utils/yakEcho";
import {failed, info, success} from "./utils/notification";
import {AutoSpin} from "./components/AutoSpin";
import {useHotkeys} from "react-hotkeys-hook";
import {testExportData} from "./utils/exporter";

const InterceptKeyword = [
    // "KeyA",
    // "KeyB",
    // "KeyC",
    "KeyD",
    "KeyE",
    // "KeyF",
    "KeyG",
    "KeyH",
    "KeyI",
    "KeyJ",
    "KeyK",
    "KeyL",
    // "KeyM",
    "KeyN",
    // "KeyO",
    // "KeyP",
    // "KeyQ",
    "KeyR",
    // "KeyS",
    "KeyT",
    // "KeyU",
    // "KeyV",
    "KeyW",
    // "KeyX",
    // "KeyY",
    // "KeyZ",
]

// import Main from "./pages/MainOperator";
const Main = lazy(() => import("./pages/MainOperator"));
// import {YakEnvironment} from "./protected/YakEnvironment";
const YakEnvironment = lazy(() => import("./protected/YakEnvironment"));

const {ipcRenderer} = window.require("electron");
const FormItem = Form.Item;
const {Text, Title, Paragraph} = Typography;

const UserProtocolAgreed = "user-protocol-agreed"

export const UserProtocol = () => <>
    <Typography>
        <Title level={2}>免责声明</Title>

        <Paragraph>
            1. 本工具仅面向 <Text mark={true} strong={true}
                            underline={true}>合法授权</Text> 的企业安全建设行为与个人学习行为，如您需要测试本工具的可用性，请自行搭建靶机环境。
        </Paragraph>

        <Paragraph>
            2. 在使用本工具进行检测时，您应确保该行为符合当地的法律法规，并且已经取得了足够的授权。<Text
            style={{color: "red"}} underline={true}>请勿对非授权目标进行扫描。</Text>
        </Paragraph>

        <Paragraph>
            3. 禁止对本软件实施逆向工程、反编译、试图破译源代码，植入后门传播恶意软件等行为。
        </Paragraph>

        <Paragraph>
            <Text strong={true} style={{color: "red"}}>如果发现上述禁止行为，我们将保留追究您法律责任的权利。</Text>
        </Paragraph>

        <Paragraph>
            如您在使用本工具的过程中存在任何非法行为，您需自行承担相应后果，我们将不承担任何法律及连带责任。
        </Paragraph>

        <Paragraph>
            在安装并使用本工具前，请您 <Text strong={true} underline={true} style={{color: "red"}}>务必审慎阅读、充分理解各条款内容</Text>
        </Paragraph>

        <Paragraph>
            限制、免责条款或者其他涉及您重大权益的条款可能会以 <Text strong={true}>加粗</Text>、<Text underline={true}>加下划线</Text>等形式提示您重点注意。
        </Paragraph>

        <Paragraph>
            除非您已充分阅读、完全理解并接受本协议所有条款，否则，请您不要安装并使用本工具。您的使用行为或者您以其他任何明示或者默示方式表示接受本协议的，即视为您已阅读并同意本协议的约束。
        </Paragraph>
    </Typography>
</>

function App() {
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tlsGRPC, setTlsGRPC] = useState(false);
    const [addr, setAddr] = useState("");
    const [mode, setMode] = useState<"remote" | "local">();

    // 用户协议相关内容
    const [agreed, setAgreed] = useState(false);
    const [readingSeconds, setReadingSeconds] = useState<number>(1);

    useEffect(() => {
        setLoading(true)
        ipcRenderer.invoke("get-value", UserProtocolAgreed).then((value: any) => {
            setAgreed(!!value)
        }).catch(() => {
        }).finally(() => setTimeout(() => setLoading(false), 300))
    }, [])

    useEffect(() => {
        let second = readingSeconds;
        let id = setInterval(() => {
            second--
            if (second >= 0) {
                setReadingSeconds(second)
            }
            if (second <= 0) {
                clearInterval(id)
            }
        }, 1000)
    }, []);

    const testYak = () => {
        if (loading) {
            return
        }
        setLoading(true)
        yakEcho()
    }

    useEffect(() => {
        if (mode !== "local") {
            return
        }

        ipcRenderer.on("client-yak-local-grpc-error", async (e: any, data: any) => {
            failed("Yak 本地 gRPC 服务器发生错误: " + data)
        })
        ipcRenderer.on("client-yak-local-grpc-close", async (e: any, msg: any) => {
            info("Yak 本地 gRPC 服务器已退出: " + msg)
        });

        return () => {
            ipcRenderer.removeAllListeners("client-yak-local-grpc-error");
            ipcRenderer.removeAllListeners("client-yak-local-grpc-close");
        }
    }, [mode])

    useEffect(() => {
        ipcRenderer.on("client-echo-yak", async (e: any, ok: boolean, text: string) => {
            if (ok) {
                // success("Yakit Server 认证成功")
            } else {
                failed(`Yakit Server 认证失败：${text}`)
            }
            setConnected(ok)
            setTimeout(() => setLoading(false), 500)
        })

        if (mode === "remote") {
            testYak()
        }
        return () => {
            ipcRenderer.removeAllListeners("client-echo-yak")
        }
    }, [])

    useEffect(() => {
        let originEvent = window.onkeydown;
        window.onkeydown = (ev) => {
            let code = ev.code

            // 屏蔽当前事件
            if ((ev.metaKey || ev.ctrlKey) && InterceptKeyword.includes(code)) {
                return false
            }

            // @ts-ignore
            originEvent && originEvent(ev)
            return
        }
        return () => {
            window.onkeydown = originEvent
        }
    }, [])

    const userProtocol = () => <Modal
        title={"用户协议"} visible={true} width={"75%"}
        onCancel={() => {
            Modal.info({title: "不同意使用协议将无法使用"})
        }}
        closable={false}
        cancelText={"关闭 / Closed"} okButtonProps={{disabled: readingSeconds > 0}}
        onOk={() => {
            ipcRenderer.invoke("set-value", UserProtocolAgreed, true)
            setAgreed(true)
        }}
        okText={readingSeconds > 0 ? `我已认真阅读本协议(${readingSeconds}s)` : "我已认真阅读本协议，认同协议内容"}
    >
        {UserProtocol()}
    </Modal>;
    if (!agreed) {
        return userProtocol()
    }

    return connected ? <Suspense fallback={<div>Loading Main</div>}>
            <Main
                onErrorConfirmed={() => {
                    setConnected(false)
                }}
            />
        </Suspense> :
        <Suspense fallback={<div style={{width: "100%", marginTop: 200, textAlign: "center"}}>
            <AutoSpin spinning={loading} tip={"Yakit 正在检测 Yak gRPC 核心引擎环境..."}/>
        </div>}>
            <YakEnvironment
                setMode={setMode}
                onConnected={() => {
                    testYak()
                }}
                onTlsGRPC={e => {
                    setTlsGRPC(e)
                }}
                onAddrChanged={setAddr}
            />
        </Suspense>
}

export default App;
