import {describe, it, expect} from "vitest"
import {safeFormatDownloadProcessState} from "../pages/StartupPage/utils"

import {vi} from "vitest"

vi.stubGlobal("window", {
    ...window,
    require: vi.fn(() => ({
        ipcRenderer: {
            on: vi.fn(),
            off: vi.fn(),
            send: vi.fn(),
            invoke: vi.fn()
        }
    }))
})

describe("safeFormatDownloadProcessState", () => {
    it("should format complete downloading state correctly", () => {
        const state = {
            percent: 50,
            size: {
                total: 1000,
                transferred: 500
            },
            speed: 200,
            time: {
                elapsed: 10,
                remaining: 10
            }
        }

        const result = safeFormatDownloadProcessState(state as any)

        expect(result).toEqual({
            percent: 50,
            size: {
                total: 1000,
                transferred: 500
            },
            speed: 200,
            time: {
                elapsed: 10,
                remaining: 10
            }
        })
    })

    it("should fallback to 0 when optional fields are missing", () => {
        const state = {
            percent: undefined,
            size: {},
            time: {}
        }

        const result = safeFormatDownloadProcessState(state as any)

        expect(result).toEqual({
            percent: 0,
            size: {
                total: 0,
                transferred: 0
            },
            speed: 0,
            time: {
                elapsed: 0,
                remaining: 0
            }
        })
    })

    it("should return safe default values when exception occurs", () => {
        // 模拟一个会在访问时抛异常的对象
        const state = {
            get size() {
                throw new Error("boom")
            }
        }

        const result = safeFormatDownloadProcessState(state as any)

        expect(result).toEqual({
            percent: 0,
            size: {
                total: 0,
                transferred: 0
            },
            speed: 0,
            time: {
                elapsed: 0,
                remaining: 0
            }
        })
    })
})
