import {describe, it, expect} from "vitest"
import {compareKnowledgeBaseChange} from "@/components/playground/Vitest__Test__/utils"

describe("compareKnowledgeBaseChange", () => {
    it("returns true when prev or next is not an array", () => {
        expect(compareKnowledgeBaseChange(null, [])).toBe(true)
        expect(compareKnowledgeBaseChange([], undefined)).toBe(true)
    })

    it("detects a deleted item", () => {
        const prev = [
            {ID: "1", name: "a"},
            {ID: "2", name: "b"}
        ]
        const next = [{ID: "2", name: "b"}]

        const res = compareKnowledgeBaseChange(prev as any, next as any)
        expect(res).toEqual({delete: prev[0], increase: null})
    })

    it("detects an increased item", () => {
        const prev = [{ID: "1", name: "a"}]
        const next = [
            {ID: "1", name: "a"},
            {ID: "2", name: "b"}
        ]

        const res = compareKnowledgeBaseChange(prev as any, next as any)
        expect(res).toEqual({delete: null, increase: next[1]})
    })

    it("returns true when there is no change", () => {
        const prev = [{ID: "1"}, {ID: "2"}]
        const next = [{ID: "1"}, {ID: "2"}]
        expect(compareKnowledgeBaseChange(prev as any, next as any)).toBe(true)
    })
})
