import {BusinessVersionOption} from "./config.mjs"
import Custom_Envs from "./env.mjs"

export const cliCommands = {
    "start-electron": "electron ."
}

/** electron构建命令生成 */
export const buildElectronCommand = (system, legacy, version) => {
    const signTag =
        system === "mac" ? (legacy ? "nonSignLegacy" : "signNormal") : legacy ? "nonSignLegacy" : "nonSignNormal"
    const versionEnv = BusinessVersionOption.find((item) => item.value === version)?.env || ""

    const envs = {...Custom_Envs[signTag], ...Custom_Envs[versionEnv]}

    return {cmd: `electron-builder build --${system} --config ./packageScript/electron-builder.config.js`, envs: envs}
}

/** link-render命令生成(开发|构建) */
export const buildLinkRenderCommand = (prod, devtools, version) => {
    const path = `cd app/renderer/engine-link-startup`
    const cmd = `yarn electron-render` //`yarn cli${prod ? " prod" : ""} ${version}`
    return `${path} && ${cmd}`
}

/** main-render命令生成(开发|构建) */
export const buildMainRenderCommand = (prod, devtools, version) => {
    const path = `cd app/renderer/src/main`
    const cmd = `yarn cli${prod ? " prod" : ""}${devtools ? " devtools" : ""} ${version}`
    return `${path} && ${cmd}`
}
