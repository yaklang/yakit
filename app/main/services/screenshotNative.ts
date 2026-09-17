import { resourcePath } from '../paths'

interface NativeScreenshot {
  id: number
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scaleFactor: number
  isPrimary: boolean
  captureSync(): Buffer
  capture(): Promise<Buffer>
  captureAreaSync(x: number, y: number, width: number, height: number): Buffer
  captureArea(x: number, y: number, width: number, height: number): Promise<Buffer>
}
interface NativeBinding {
  Screenshots: { all(): NativeScreenshot[]; fromPoint(x: number, y: number): NativeScreenshot | null }
}
const { platform, arch } = process

let nativeBinding: NativeBinding | null = null
let loadError: unknown = null

try {
  switch (platform) {
    case 'win32':
      switch (arch) {
        case 'x64':
          try {
            nativeBinding = require(resourcePath('native', 'node-screenshots.win32-x64-msvc.node'))
          } catch (e) {
            loadError = e
          }
          break
        case 'ia32':
          try {
            nativeBinding = require(resourcePath('native', 'node-screenshots.win32-ia32-msvc.node'))
          } catch (e) {
            loadError = e
          }
          break
        case 'arm64':
          try {
            nativeBinding = require(resourcePath('native', 'node-screenshots.win32-arm64-msvc.node'))
          } catch (e) {
            loadError = e
          }
          break
        default:
          throw new Error(`Unsupported architecture on Windows: ${arch}`)
      }
      break
    case 'darwin':
      switch (arch) {
        case 'x64':
          try {
            nativeBinding = require(resourcePath('native', 'node-screenshots.darwin-x64.node'))
          } catch (e) {
            loadError = e
          }
          break
        case 'arm64':
          try {
            nativeBinding = require(resourcePath('native', 'node-screenshots.darwin-arm64.node'))
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

export const NodeScreenshots = nativeBinding?.Screenshots
