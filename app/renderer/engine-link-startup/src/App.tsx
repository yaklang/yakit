import {memo, useEffect, useState} from "react"
import {StartupPage} from "./pages/StartupPage"
import "./theme/ThemeClass.scss"
import {getReleaseEditionName, isCommunityEdition, isIRify} from "./utils/envfile"
import {ipcEventPre} from "./utils/ipcEventPre"
import {getLocalValue, setLocalValue} from "./utils/kv"
import {LocalGVS} from "./enums/yakitGV"
import {YakitModal} from "./components/yakitUI/YakitModal/YakitModal"

import styles from "./App.module.scss"
const {ipcRenderer} = window.require("electron")

const App: React.FC = memo(() => {
    /** 是否展示用户协议 */
    const [agreed, setAgreed] = useState<boolean>(undefined)

    useEffect(() => {
        getLocalValue(LocalGVS.UserProtocolAgreed)
            .then((value: any) => {
                setAgreed(!!value)
            })
            .catch(() => {})

        const titleElement = document.getElementById("app-html-title")
        if (titleElement) {
            titleElement.textContent = getReleaseEditionName()
        }

        // 解压命令执行引擎脚本压缩包
        ipcRenderer.invoke(ipcEventPre + "generate-start-engine")
        // 告诉主进程软件的版本(CE|EE)
        ipcRenderer.invoke(ipcEventPre + "is-enpritrace-to-domain", !isCommunityEdition())

        // 通知应用退出
        ipcRenderer.on("close-engineLinkWin-renderer", async (e, res: any) => {
            ipcRenderer.invoke("app-exit", {showCloseMessageBox: true, isIRify: isIRify(), isEngineLinkWin: true})
        })
        return () => {
            ipcRenderer.removeAllListeners("close-engineLinkWin-renderer")
        }
    }, [])

    // 在获取 agreed 前不渲染任何界面
    if (agreed === undefined) return null
    if (!agreed) {
        return (
            <>
                <div className={styles["yakit-mask-drag-wrapper"]}></div>
                <YakitModal
                    title='用户协议'
                    centered={true}
                    visible={true}
                    closable={false}
                    width='75%'
                    cancelText={"关闭 / Closed"}
                    onCancel={() => ipcRenderer.invoke(ipcEventPre + "UIOperate", "close")}
                    onOk={() => {
                        setLocalValue(LocalGVS.UserProtocolAgreed, true)
                        setAgreed(true)
                    }}
                    okText='我已认真阅读本协议，认同协议内容'
                    bodyStyle={{padding: "16px 24px 24px 24px"}}
                >
                    <div className={styles["yakit-agr-modal-body"]}>
                        <div className={styles["body-title"]}>免责声明</div>
                        <div className={styles["body-content"]}>
                            1. 本工具仅面向 <span className={styles["sign-content"]}>合法授权</span>{" "}
                            的企业安全建设行为与个人学习行为，如您需要测试本工具的可用性，请自行搭建靶机环境。
                            <br />
                            2. 在使用本工具进行检测时，您应确保该行为符合当地的法律法规，并且已经取得了足够的授权。
                            <span className={styles["underline-content"]}>请勿对非授权目标进行扫描。</span>
                            <br />
                            3. 禁止对本软件实施逆向工程、反编译、试图破译源代码，植入后门传播恶意软件等行为。
                            <br />
                            4. 如果您需要使用Yakit<span className={styles["sign-bold-content"]}>用于商业化目的</span>
                            ，请确保你们已经<span className={styles["sign-bold-content"]}>获得官方授权</span>
                            ，否则我们将追究您的相关责任。
                            <br />
                            <span className={styles["sign-bold-content"]}>
                                如果发现上述禁止行为，我们将保留追究您法律责任的权利。
                            </span>
                            <br />
                            如您在使用本工具的过程中存在任何非法行为，您需自行承担相应后果，我们将不承担任何法律及连带责任。
                            <br />
                            在安装并使用本工具前，请您{" "}
                            <span className={styles["sign-bold-content"]}>务必审慎阅读、充分理解各条款内容。</span>
                            <br />
                            限制、免责条款或者其他涉及您重大权益的条款可能会以{" "}
                            <span className={styles["sign-bold-content"]}>加粗</span>、
                            <span className={styles["underline-content"]}>加下划线</span>
                            等形式提示您重点注意。
                            <br />
                            除非您已充分阅读、完全理解并接受本协议所有条款，否则，请您不要安装并使用本工具。您的使用行为或者您以其他任何明示或者默示方式表示接受本协议的，即视为您已阅读并同意本协议的约束。
                        </div>
                    </div>
                </YakitModal>
            </>
        )
    }

    return (
        <div className={styles["app"]}>
            <StartupPage />
        </div>
    )
})

export default App
