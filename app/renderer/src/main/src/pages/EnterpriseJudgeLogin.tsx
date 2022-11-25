import React, {ReactNode, useEffect, useRef, useState} from "react"
import {failed, info, success} from "@/utils/notification"
import LicensePage from "./LicensePage"
import {ConfigPrivateDomain} from "@/components/ConfigPrivateDomain/ConfigPrivateDomain"
import {NetWorkApi} from "@/services/fetch"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {API} from "@/services/swagger/resposeType"
const {ipcRenderer} = window.require("electron")
export interface EnterpriseJudgeLoginProps {
    setJudgeLicense: (v: boolean) => void
}
interface LicensePostProps {
    licenseActivation: string
    machineCode: string
}
const EnterpriseJudgeLogin: React.FC<EnterpriseJudgeLoginProps> = (props) => {
    const {setJudgeLicense} = props
    // License
    const [licenseVerified, setLicenseVerified] = useState<boolean>(false)
    const [machineCode, setMachineCode] = useState<string>("")
    const [activateLicense, setActivateLicense] = useState<boolean>(false)
    useEffect(() => {
        // 获取机器码
        ipcRenderer
            .invoke("GetMachineID", {})
            .then((e) => {
                console.log("GetMachineID", e)
                const machineCode = e.MachineID
                setMachineCode(machineCode)
            })
            .catch((e) => {
                failed(`获取GetMachineID失败: ${e}`)
            })
            .finally(() => {})
    }, [])

    const judgeLicense = () => {
        getRemoteValue("LICENSE_ACTIVATION").then((setting) => {
            if (!setting) {
                setActivateLicense(true)
                return
            }
            const licenseActivation = JSON.parse(setting)
            if (machineCode && licenseActivation) {
                NetWorkApi<LicensePostProps, API.ActionSucceeded>({
                    method: "post",
                    url: "license",
                    data: {
                        machineCode,
                        licenseActivation
                    }
                })
                    .then((res) => {
                        console.log("License激活数据源：", res)
                        if (res.ok) {
                            setJudgeLicense(false)
                        }
                    })
                    .catch((err) => {
                        setActivateLicense(true)
                        failed("激活License失败：" + err)
                    })
                    .finally(() => {})
            } else {
                setActivateLicense(true)
            }
        })
    }
    return (
        <>
            {activateLicense ? (
                <div style={{width: 480, margin: "0 auto", paddingTop: 200}}>
                    <ConfigPrivateDomain enterpriseLogin={true} />
                </div>
            ) : (
                <LicensePage onLicenseVerified={() => setJudgeLicense(false)} machineCode={machineCode} />
            )}
        </>
    )
}
export default EnterpriseJudgeLogin