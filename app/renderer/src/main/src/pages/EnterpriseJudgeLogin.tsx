import React, {ReactNode, useEffect, useRef, useState} from "react"
import {failed, info, success} from "@/utils/notification"
import {Spin} from "antd"
import LicensePage from "./LicensePage"
import {ConfigPrivateDomain} from "@/components/ConfigPrivateDomain/ConfigPrivateDomain"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {useGetState} from "ahooks"
import {aboutLoginUpload} from "@/utils/login"
import {isEnpriTrace, isEnpriTraceAgent} from "@/utils/envfile"
const {ipcRenderer} = window.require("electron")
export interface EnterpriseJudgeLoginProps {
    setJudgeLicense: (v: boolean) => void
    setJudgeLogin: (v: boolean) => void
}
const EnterpriseJudgeLogin: React.FC<EnterpriseJudgeLoginProps> = (props) => {
    const {setJudgeLicense, setJudgeLogin} = props
    // License
    // const [licenseVerified, setLicenseVerified] = useState<boolean>(false)
    const [activateLicense, setActivateLicense] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(true)
    const [licensePageLoading, setLicensePageLoading] = useState<boolean>(false)
    useEffect(() => {
        // 验证License
        judgeLicense()
    }, [])

    const judgeLogin = () => {
        ipcRenderer
            .invoke("get-login-user-info", {})
            .then((e) => {
                if (e?.isLogin) {
                    aboutLoginUpload(e?.token)
                    setJudgeLogin(true)
                    setJudgeLicense(false)
                } else {
                    setJudgeLogin(false)
                }
            })
            .finally(() => {
                setLoading(false)
                setLicensePageLoading(false)
            })
    }

    const judgeLicense = (license?: string) => {
        if (license?.length) {
            judgeLicenseGrpc(license)
        } else {
            getRemoteValue("LICENSE_ACTIVATION").then((setting) => {
                if (!setting) {
                    setLoading(false)
                    return
                }
                const licenseActivation = JSON.parse(setting)
                judgeLicenseGrpc(licenseActivation, true)
            })
        }
    }

    const judgeLicenseGrpc = (LicenseActivation: string, isCache = false) => {
        ipcRenderer
            .invoke("CheckLicense", {
                LicenseActivation,
                CompanyVersion: isEnpriTraceAgent() ? "EnpriTraceAgent" : "EnpriTrace"
            })
            .then((e) => {
                setActivateLicense(true)
                setRemoteValue("LICENSE_ACTIVATION", JSON.stringify(LicenseActivation))
                if (isCache) {
                    judgeLogin()
                }
            })
            .catch((e) => {
                info("请重新激活License")
                setLoading(false)
                setLicensePageLoading(false)
            })
            .finally(() => {
                if (!isCache) {
                    setLoading(false)
                    setLicensePageLoading(false)
                }
            })
    }
    return (
        <>
            {loading ? (
                <div style={{paddingTop: 10, textAlign: "center"}}>
                    <Spin tip='验证License中'></Spin>
                </div>
            ) : (
                <>
                    {activateLicense ? (
                        <div style={{width: 480, margin: "0 auto", paddingTop: 200, height: "100%"}}>
                            <ConfigPrivateDomain
                                enterpriseLogin={true}
                                onSuccee={() => setJudgeLicense(false)}
                                skipShow={isEnpriTrace()||isEnpriTraceAgent()}
                            />
                        </div>
                    ) : (
                        <LicensePage
                            judgeLicense={judgeLicense}
                            licensePageLoading={licensePageLoading}
                            setLicensePageLoading={setLicensePageLoading}
                        />
                    )}
                </>
            )}
        </>
    )
}
export default EnterpriseJudgeLogin
