import React from "react"
import {render, waitFor, screen} from "@testing-library/react"
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {YakitSpinProps} from "@/components/yakitUI/YakitSpin/YakitSpinType"

vi.mock("@/components/yakitUI/YakitSpin/YakitSpin", () => {
    const React = require("react")
    return {
        YakitSpin: (props: YakitSpinProps) => {
            const {spinning, children} = props
            return React.createElement(
                "div",
                {"data-spinning": spinning ? true : false, "data-testid": "yakitspin"},
                children
            )
        }
    }
})

const mockGetRemoteValue = vi.fn()
vi.mock("@/utils/kv", () => ({
    getRemoteValue: (...args: any[]) => mockGetRemoteValue(...args)
}))

vi.mock("ahooks", () => {
    const React = require("react")
    return {
        useSafeState: (init: any) => React.useState(init)
    }
})

let Vitest__Test__: any
beforeAll(async () => {
    const mod = await import("@/components/playground/Vitest__Test__")
    Vitest__Test__ = mod.Vitest__Test__
})

beforeEach(() => {
    mockGetRemoteValue.mockReset()
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe("Vitest__Test__ component - loading behavior", () => {
    it("sets spinning=false immediately when no editorOperationRecord is provided", async () => {
        render(React.createElement(Vitest__Test__))
        const spin = screen.getByTestId("yakitspin")
        expect(spin).toBeInTheDocument()
        expect(spin).toHaveAttribute("data-spinning", "false")
    })

    it("shows", async () => {
        mockGetRemoteValue.mockImplementation(() => Promise.resolve(JSON.stringify({fontSize: 14})))

        render(React.createElement(Vitest__Test__, {editorOperationRecord: "my-key"}))

        const spin = screen.getByTestId("yakitspin")
        expect(spin).toBeInTheDocument()
        expect(spin).toHaveAttribute("data-spinning", "true")

        await waitFor(() => {
            expect(spin).toHaveAttribute("data-spinning", "false")
        })
    })
})
