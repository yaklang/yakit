import { mergeEnabledCapabilities } from './mergeEnabledCapabilities'

describe('mergeEnabledCapabilities', () => {
  it('keeps existing capabilities and appends the selected skill once', () => {
    expect(
      mergeEnabledCapabilities(
        [{ Name: 'read_file', Type: 'tool' }],
        [
          { Name: 'pentest-task-design', Type: 'skill' },
          { Name: 'pentest-task-design', Type: 'skill' },
        ],
      ),
    ).toEqual([
      { Name: 'read_file', Type: 'tool' },
      { Name: 'pentest-task-design', Type: 'skill' },
    ])
  })
})
