import {forwardRef, memo, useImperativeHandle, useRef} from "react"
import {AllowSecretLocalJson, LocalEngineProps} from "./LocalEngineType"
import {useMemoizedFn} from "ahooks"
import {debugToPrintLog} from "@/utils/logCollection"
import {grpcCheckAllowSecretLocal} from "../../grpc"
import {isIRify} from "@/utils/envfile"

export const LocalEngine: React.FC<LocalEngineProps> = memo(
    forwardRef((props, ref) => {
        const {setLog, onLinkEngine, setYakitStatus, buildInEngineVersion, setRestartLoading} = props
        const allowSecretLocalJson = useRef<AllowSecretLocalJson>(null)

        const handleAllowSecretLocal = useMemoizedFn(async (port: number) => {
            setLog(["开始检查随机密码模式中..."])
            const res = await grpcCheckAllowSecretLocal({port, isIRify: isIRify()})
            setRestartLoading(false)
            if (res.ok && res.status === "success") {
                setLog((arr) => arr.concat(["检查通过，已支持随机密码模式"]))
                setYakitStatus("")
                allowSecretLocalJson.current = res.json
                await startYakEngine()
                return
            }
            allowSecretLocalJson.current = null
            switch (res.status) {
                case "timeout":
                    setLog((arr) => arr.concat(["命令执行超时，可查看日志详细信息..."]))
                    setYakitStatus("check_timeout")
                    break
                case "call_error":
                    setLog((arr) => arr.concat(["引擎连接超时，可查看日志详细信息..."]))
                    setYakitStatus("check_timeout")
                    break
                case "old_version":
                    setLog((arr) =>
                        arr.concat([
                            `引擎版本低，可点击${buildInEngineVersion ? "重置引擎版本更新..." : "下载引擎更新..."}`
                        ])
                    )
                    setYakitStatus("old_version")
                    break
                case "port_occupied":
                    setLog((arr) => arr.concat(["端口不可用，可查看日志报错信息进行处理..."]))
                    setYakitStatus("port_occupied")
                    break
                case "antivirus_blocked":
                    setLog((arr) => arr.concat(["被杀软拦截，可将应用加入白名单后重启..."]))
                    setYakitStatus("antivirus_blocked")
                    break
                case "build_yak_error":
                case "dial_error":
                    setLog((arr) => arr.concat(["连接引擎出现问题，可点击重置引擎版本更新..."]))
                    setYakitStatus("skipAgreement_Install")
                    break
                case "database_error":
                    setLog((arr) => arr.concat(["检测到本地数据库出现错误，可点击修复进行处理..."]))
                    setYakitStatus("database_error")
                    break
                default:
                    setLog((arr) =>
                        arr.concat([
                            "无法启动，可将日志信息发送给工作人员处理...",
                            `[Reason]：${res.status}：${res.message || "无"}`
                        ])
                    )
                    setYakitStatus("allow-secret-error")
            }
        })

        const startYakEngine = useMemoizedFn(async () => {
            try {
                if (allowSecretLocalJson.current) {
                    debugToPrintLog(`------ 准备开始启动引擎逻辑 ------`)
                    setLog([`引擎版本号——${allowSecretLocalJson.current.version}`, "准备开始本地连接中"])
                    setTimeout(() => {
                        onLinkEngine({
                            port: allowSecretLocalJson.current.port,
                            secret: allowSecretLocalJson.current.secret
                        })
                    }, 1000)
                }
            } catch (err) {}
        })

        // 全部流程
        const initLink = useMemoizedFn((port: number) => {
            handleAllowSecretLocal(port)
        })

        // 后续不再检测更新操作
        const toLink = useMemoizedFn((port: number) => {
            handleAllowSecretLocal(port)
        })

        useImperativeHandle(
            ref,
            () => ({
                init: initLink,
                link: toLink
            }),
            []
        )

        return <></>
    })
)
