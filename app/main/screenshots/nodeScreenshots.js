const {platform, arch} = process

let nativeBinding = null
let loadError = null

try {
    switch (platform) {
        case "win32":
            switch (arch) {
                case "x64":
                    try {
                        nativeBinding = require("./lib/node-screenshots.win32-x64-msvc.node")
                    } catch (e) {
                        loadError = e
                    }
                    break
                case "ia32":
                    try {
                        nativeBinding = require("./lib/node-screenshots.win32-ia32-msvc.node")
                    } catch (e) {
                        loadError = e
                    }
                    break
                case "arm64":
                    try {
                        nativeBinding = require("./lib/node-screenshots.win32-arm64-msvc.node")
                    } catch (e) {
                        loadError = e
                    }
                    break
                default:
                    throw new Error(`Unsupported architecture on Windows: ${arch}`)
            }
            break
        case "darwin":
            switch (arch) {
                case "x64":
                    try {
                        nativeBinding = require("./lib/node-screenshots.darwin-x64.node")
                    } catch (e) {
                        loadError = e
                    }
                    break
                case "arm64":
                    try {
                        nativeBinding = require("./lib/node-screenshots.darwin-arm64.node")
                    } catch (e) {
                        loadError = e
                    }
                    break
                default:
                    throw new Error(`Unsupported architecture on macOS: ${arch}`)
            }
            break
        default:
            throw new Error(`Unsupported OS: ${platform}, architecture: ${arch}`)
    }

    if (!nativeBinding) {
        if (loadError) {
            throw loadError
        }
        throw new Error(`Failed to load native binding`)
    }
} catch (error) {}

/**
 * @typedef {Object} NodeScreenshots
 * @property {number} id
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {number} rotation
 * @property {number} scaleFactor
 * @property {boolean} isPrimary
 * @property {() => Array<NodeScreenshots>} all
 * @property {(x: number, y: number) => NodeScreenshots | null} fromPoint
 * @property {() => Buffer} captureSync
 * @property {() => Promise<Buffer>} capture
 * @property {(x: number, y: number, width: number, height: number) => Buffer} captureAreaSync
 * @property {(x: number, y: number, width: number, height: number) => Promise<Buffer>} captureArea
 */
/**
 * @typedef {Object} info
 * @property {NodeScreenshots} Screenshots
 */

/** @type {info} */
const {Screenshots} = nativeBinding || {}

module.exports.NodeScreenshots = Screenshots
