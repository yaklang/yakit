// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest'
import { loadSync, type ServiceDefinition } from '@grpc/proto-loader'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { GrpcOutput, GrpcApiOfKind } from '../../../../../../shared/communication/protocol'
import { fuzzerHistoryForUI, fuzzerResponseForUI } from '../../pages/fuzzer/grpcAdapters'
import { ssaProjectsForUI, ssaProgramsForUI, syntaxFlowTasksForUI } from '../../pages/yakRunnerCodeScan/grpcAdapters'
import { mitmRulesForUI, queriedMitmRulesForUI } from '../../pages/mitm/grpcAdapters'
import { payloadGroupsForUI } from '../../pages/payloadManager/grpcAdapters'
import { dnsLogsForUI } from '../../pages/dnslog/grpcAdapters'

const temporary = mkdtempSync(path.join(tmpdir(), 'yakit-projection-test-'))
const proto = path.join(temporary, 'grpc.proto')
writeFileSync(
  proto,
  readFileSync('app/protos/grpc.proto', 'utf8').replace(
    /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g,
    (token) => (token.startsWith('/') ? token.replace(/[^\r\n]/g, ' ') : token),
  ),
)
const definition = loadSync(proto, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true })
const service = definition['ypb.Yak'] as ServiceDefinition
// Test fixtures use the actual protobuf serializer and decoder, including defaults,
// absent nested messages, int64 strings and enum names.
function response<Api extends GrpcApiOfKind<'unary'>>(api: Api, fields: object): GrpcOutput<Api> {
  return service[api].responseDeserialize(service[api].responseSerialize(fields)) as GrpcOutput<Api>
}
afterAll(() => rmSync(temporary, { recursive: true, force: true }))

const largeId = '9007199254740993'
describe('generated gRPC output projections', () => {
  it('keeps project IDs exact and reads Projects with the actual timestamp names', () => {
    const value = ssaProjectsForUI(
      response('QuerySSAProject', { Projects: [{ ID: largeId, CreatedAt: 100, UpdatedAt: 200 }] }),
    )
    expect(value.Projects[0]).toMatchObject({ ID: largeId, CreateAt: 100, UpdateAt: 200, CompileConfig: null })
  })

  it('accepts the older Programs field and preserves the owning project ID', () => {
    const value = ssaProgramsForUI(
      response('QuerySSAPrograms', { Programs: [{ Id: 3, SSAProjectID: largeId, HighRiskNumber: 4 }] }),
    )
    expect(value.Data[0]).toMatchObject({ Id: 3, SSAProjectID: largeId, HighRiskNumber: 4 })
  })

  it('converts scan counters while preserving IDs and an absent task config', () => {
    const value = syntaxFlowTasksForUI(
      response('QuerySyntaxFlowScanTask', { Data: [{ Id: largeId, Kind: 'scan', FailedQuery: 2 }] }),
    )
    expect(value.Data[0]).toMatchObject({ Id: largeId, FailedQuery: 2, Config: null })
  })

  it('rejects malformed Fuzzer history before a UI dereference', () => {
    expect(() => fuzzerHistoryForUI(response('GetHistoryHTTPFuzzerTask', {}))).toThrow('Fuzzer 历史')
  })

  it('preserves Fuzzer task IDs and translates the protobuf chunk direction', () => {
    const value = fuzzerResponseForUI(
      response('RedirectRequest', {
        TaskId: largeId,
        BodyLength: 32,
        RandomChunkedData: [{ Direction: 'CHUNKED_DATA_DIRECTION_REQUEST', Index: 1 }],
      }),
    )
    expect(value.TaskId).toBe(largeId)
    expect(value.BodyLength).toBe(32)
    expect(value.RandomChunkedData[0]).toMatchObject({ Index: 1, Direction: 1 })
  })

  it('treats absent rule search results as empty and converts cookie lifetimes', () => {
    expect(queriedMitmRulesForUI(response('QueryMITMReplacerRules', {})).Rules.Rules).toEqual([])
    const value = mitmRulesForUI(
      response('GetCurrentRules', { Rules: [{ Index: 4, ExtraCookies: [{ Expires: 12, SameSiteMode: 'lax' }] }] }),
    )
    expect(value.Rules[0]).toMatchObject({ Id: 4, ExtraCookies: [{ Expires: 12, SameSiteMode: 'lax' }] })
  })

  it('rejects counts outside the safe UI number range instead of rounding', () => {
    expect(() =>
      payloadGroupsForUI(response('GetAllPayloadGroup', { Nodes: [{ Type: 'File', Number: largeId }] })),
    ).toThrow()
  })

  it('converts DNS display timestamps while keeping packet bytes', () => {
    const value = dnsLogsForUI(
      response('QueryDNSLogByToken', { Events: [{ Timestamp: 100, Raw: Buffer.from('dns') }] }),
    )
    expect(value.Events[0].Timestamp).toBe(100)
    expect(Buffer.from(value.Events[0].Raw).toString()).toBe('dns')
  })
})
