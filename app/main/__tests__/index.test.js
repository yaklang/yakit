import {describe, it, expect} from "vitest"
import {pickAxiosErrorCore} from "../toolsFunc"

describe("pickAxiosErrorCore", () => {
    it("should extract message object from a normal axios error", () => {
        const error = {
            response: {
                data: {
                    message: "Error occurred"
                }
            },
            name: "Error",
            message: "Error occurred",
            code: "ERR"
        }
        const result = pickAxiosErrorCore(error)
        expect(result).toEqual({
            error: {name: "Error", message: "Error occurred", code: "ERR"},
            request: {
                method: undefined,
                url: undefined,
                baseURL: undefined,
                timeout: undefined,
                params: undefined
            }
        })
    })
    it("should return empty object if error is missing", () => {
        const result = pickAxiosErrorCore(null)
        expect(result).toEqual({})
    })

    it("should return empty error and request object if error is malformed", () => {
        const error = {some: "random"}
        const result = pickAxiosErrorCore(error)
        expect(result).toEqual({
            error: {},
            request: {
                method: undefined,
                url: undefined,
                baseURL: undefined,
                timeout: undefined,
                params: undefined
            }
        })
    })
})
