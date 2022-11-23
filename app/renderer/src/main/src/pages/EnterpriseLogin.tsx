import React, {ReactNode, useEffect, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import LicensePage from "./LicensePage"
import {ConfigPrivateDomain} from "@/components/ConfigPrivateDomain/ConfigPrivateDomain"
export interface EnterpriseLoginProps {
    setIsShowLogin: (v: boolean) => void
}

export const EnterpriseLogin: React.FC<EnterpriseLoginProps> = (props) => {
    const {setIsShowLogin} = props
    // License
    const [licenseVerified, setLicenseVerified] = useState<boolean>(false)
    useEffect(() => {}, [])
    return (
        <>
                <div style={{width: 480,margin:"0 auto",paddingTop:200}}>
                    <ConfigPrivateDomain enterpriseLogin={true} onSuccee={()=>{
                        setIsShowLogin(false)
                    }}/>
                </div>

            {/* <LicensePage onLicenseVerified={() => setIsShowLogin(false)} /> */}
        </>
    )
}
