import {useRequest} from "ahooks"
import {useSafeState} from "ahooks"
import {info, failed} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {targetInstallList, exclude} from "../utils"

const {ipcRenderer} = window.require("electron")

export const useCheckKnowledgePlugin = () => {
    const [installPlug, setInstallPlug] = useSafeState(false)

    const {
        data,
        loading,
        refresh,
        runAsync: ThirdPartyBinaryRunAsync
    } = useRequest(
        async () => {
            const result = await ipcRenderer.invoke("ListThirdPartyBinary", {
                Pagination: {Limit: 999}
            })

            const binariesList =
                result?.Binaries?.map((it) => ({
                    Name: it?.Name,
                    InstallPath: it?.InstallPath,
                    installToken: randomString(50),
                    Description: it.Description
                })) ?? []

            return targetInstallList
                .map((name) => binariesList.find((it) => it.Name === name))
                .filter((v) => v !== undefined)
        },
        {
            onSuccess: (result) => {
                const needInstall = targetInstallList
                    .map((name) => result.find((it) => it.Name === name && !it.InstallPath))
                    .filter((v) => v !== undefined)

                const filteredInstall = needInstall.filter((item) => !exclude.includes(item.Name))

                if (filteredInstall.length !== 0) {
                    setInstallPlug(true)
                } else {
                    setInstallPlug(false)
                }
            },
            onError: () => {}
        }
    )

    return {
        installPlug,
        binariesToInstall: data,
        loading,
        refresh,
        ThirdPartyBinaryRunAsync
    }
}
