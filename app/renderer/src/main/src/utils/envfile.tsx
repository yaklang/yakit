export enum ENTERPRISE_STATUS {
    IS_ENTERPRISE_STATUS = 1
}

export const getJuageEnvFile = () => {
    switch (process.env?.REACT_APP_PLATFORM) {
        case "enterprise":
            return ENTERPRISE_STATUS.IS_ENTERPRISE_STATUS
        default:
            return 0
    }
}