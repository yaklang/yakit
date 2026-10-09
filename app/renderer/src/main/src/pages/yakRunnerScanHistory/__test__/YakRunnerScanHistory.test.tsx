vi.hoisted(() => {
    ;(window as any).require = (id: string) => {
        if (id === 'electron') {
            return { ipcRenderer: { invoke: vi.fn(), on: vi.fn(), off: vi.fn(), send: vi.fn() } }
        }
        return {}
    }
})

import { describe, expect, it, vi } from 'vitest'
import type { SSAProgram } from '../YakRunnerScanHistory'
import { buildCompileHistoryDisplayList } from '../YakRunnerScanHistory'

const makeProgram = (over: Partial<SSAProgram>): SSAProgram =>
    ({
        CreateAt: 0,
        UpdateAt: 0,
        Name: '',
        Description: '',
        Dbpath: '',
        Language: 'java',
        EngineVersion: '',
        Recompile: false,
        Id: 0,
        CriticalRiskNumber: 0,
        HighRiskNumber: 0,
        WarnRiskNumber: 0,
        LowRiskNumber: 0,
        InfoRiskNumber: 0,
        SSAProjectID: 0,
        ...over,
    }) as SSAProgram

describe('buildCompileHistoryDisplayList', () => {
    it('增量链（含全量 base 层）折叠为一个组根，组根为 HeadProgramName', () => {
        // 真实场景：全量 base(10:38:42) -> 增量(10:39:04) -> 对增量的增量(10:39:10)
        // 后端对链上所有成员统一填充 IncrementalGroupId 与 HeadProgramName
        const head = 'Java_DVWA(2026-10-09 10:39:10)'
        const groupId = 'Java_DVWA(2026-10-09 10:38:42)'
        const programs: SSAProgram[] = [
            makeProgram({
                Name: head,
                Id: 3,
                UpdateAt: 3,
                IsIncrementalCompile: true,
                IncrementalGroupId: groupId,
                HeadProgramName: head,
            }),
            makeProgram({
                Name: 'Java_DVWA(2026-10-09 10:39:04)',
                Id: 2,
                UpdateAt: 2,
                IsIncrementalCompile: true,
                IncrementalGroupId: groupId,
                HeadProgramName: head,
            }),
            // 全量 base 层：IsIncrementalCompile=false 但 groupId 与链一致，必须折叠进组
            makeProgram({
                Name: groupId,
                Id: 1,
                UpdateAt: 1,
                IsIncrementalCompile: false,
                IncrementalGroupId: groupId,
                HeadProgramName: head,
            }),
        ]

        const items = buildCompileHistoryDisplayList(programs)
        // 组根 + 2 个子项
        expect(items).toHaveLength(3)
        const root = items[0]
        expect(root.isGroupRoot).toBe(true)
        expect(root.program.Name).toBe(head)
        expect(root.children?.map((c) => c.Name)).toEqual([
            'Java_DVWA(2026-10-09 10:39:04)',
            groupId,
        ])
    })

    it('组根定位不依赖返回顺序（乱序输入仍以 HeadProgramName 为根）', () => {
        const head = 'Java_DVWA(2026-10-09 10:39:10)'
        const groupId = 'Java_DVWA(2026-10-09 10:38:42)'
        const programs: SSAProgram[] = [
            // base 层先返回（updated_at 升序乱序）
            makeProgram({
                Name: groupId,
                Id: 1,
                UpdateAt: 1,
                IsIncrementalCompile: false,
                IncrementalGroupId: groupId,
                HeadProgramName: head,
            }),
            makeProgram({
                Name: head,
                Id: 3,
                UpdateAt: 3,
                IsIncrementalCompile: true,
                IncrementalGroupId: groupId,
                HeadProgramName: head,
            }),
        ]

        const items = buildCompileHistoryDisplayList(programs)
        expect(items[0].program.Name).toBe(head)
        expect(items[0].isGroupRoot).toBe(true)
    })

    it('独立全量编译（无增量成员的组）平铺为独立条目，不渲染成可展开组', () => {
        // 后端对普通 program 也填 IncrementalGroupId（=自身名）
        const standalone = 'Java_DVWA(2026-10-09 10:38:42)'
        const programs: SSAProgram[] = [
            makeProgram({
                Name: standalone,
                Id: 1,
                UpdateAt: 1,
                IsIncrementalCompile: false,
                IncrementalGroupId: standalone,
                HeadProgramName: standalone,
            }),
        ]

        const items = buildCompileHistoryDisplayList(programs)
        expect(items).toHaveLength(1)
        expect(items[0].isGroupRoot).toBe(false)
        expect(items[0].isGroupChild).toBe(false)
        expect(items[0].program.Name).toBe(standalone)
    })
})