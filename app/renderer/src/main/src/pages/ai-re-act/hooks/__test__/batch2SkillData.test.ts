import './setupElectron'
import { describe, expect, it, vi } from 'vitest'
import { ChatMultiSessionController } from '../ChatMultiSessionController'
import { aiTaskDetailDataHandlers as handlers } from '../grpcStreamHandler/aiTaskDetail'
import { makeGrpcJsonRes } from './fixtures'
vi.mock('lottie-web', () => ({ default: vi.fn() }))
vi.mock('@/pages/yakRunner/utils', () => ({ isYaklangScriptDeliveryPath: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
const skill = (name: string) => ({ name, description: name, data: { token_count: 42 } })
function fixture() {
  const ctrl = new ChatMultiSessionController(),
    data = ctrl.ensureSession('one')
  const emit = (node: 'skill_available' | 'skill_loaded' | 'skill_detail', value: any) =>
    handlers[node]({
      ...data,
      sessionId: 'one',
      chatType: 'reAct',
      res: makeGrpcJsonRes('structured', value, { NodeId: node }),
      sendRequest: vi.fn(),
      pushLog: vi.fn(),
    })
  return { ctrl, data, emit }
}
describe('official session skill data', () => {
  it('deduplicates the next page and rejects duplicate or out-of-order pages', () => {
    const { data, emit } = fixture()
    emit('skill_available', { skills: [skill('a')], page: 1, page_size: 50, has_more: true, total: 3 })
    emit('skill_available', { skills: [skill('a'), skill('b')], page: 2, page_size: 50, has_more: true, total: 3 })
    emit('skill_available', { skills: [skill('wrong')], page: 4, total: 3 })
    emit('skill_available', { skills: [skill('duplicate')], page: 2, total: 3 })
    expect(data.rawData.availableSkills.skills.map((s) => s.name)).toEqual(['a', 'b'])
    expect(data.rawData.availableSkills.page).toBe(2)
  })
  it('preserves existing list and cursor on error and clears them on successful new search', () => {
    const { data, emit } = fixture()
    emit('skill_available', { skills: [skill('old')], page: 1, has_more: true, total: 4 })
    emit('skill_available', { error: 'search failed', query: 'new', skills: [] })
    expect(data.rawData.availableSkills).toMatchObject({ error: 'search failed', page: 1, skills: [{ name: 'old' }] })
    emit('skill_available', { skills: [skill('new')], page: 1, has_more: false, total: 1 })
    expect(data.rawData.availableSkills.error).toBeUndefined()
    expect(data.rawData.availableSkills.skills.map((s) => s.name)).toEqual(['new'])
  })
  it('invalidates detail on load state change and never changes another session or Forge', () => {
    const { ctrl, data, emit } = fixture()
    data.request.ForgeName = 'senso-employee'
    const other = ctrl.ensureSession('two')
    emit('skill_detail', { name: 'a', loaded: false, skill_md: 'preview' })
    emit('skill_loaded', { skills: [skill('a')], total: 1 })
    expect(data.rawData.skillDetails.has('a')).toBe(false)
    expect(data.rawData.loadedSkills.skills[0]).toMatchObject({
      name: 'a',
      skill_load_state: 'loaded',
      token_count: 42,
    })
    expect(other.rawData.loadedSkills.skills).toEqual([])
    expect(data.request.ForgeName).toBe('senso-employee')
  })
})
