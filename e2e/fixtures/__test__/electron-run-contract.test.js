import { describe, expect, it } from 'vitest'
import { parseElectronE2EOptions } from '../electron/electron-runner-options.mjs'

describe('parseElectronE2EOptions', () => {
  it('accepts an explicit 2x device scale factor', () => {
    expect(parseElectronE2EOptions(['--suite', 'table-virtual-fixed-right', '--device-scale-factor', '2'])).toEqual(
      expect.objectContaining({ deviceScaleFactor: 2 }),
    )
  })

  it('rejects an invalid device scale factor', () => {
    expect(() => parseElectronE2EOptions(['--device-scale-factor', 'zoomed'])).toThrow(/device scale factor/i)
  })

  it('keeps the runner-only scale option out of WDIO suite arguments', () => {
    expect(
      parseElectronE2EOptions(['--suite', 'table-virtual-fixed-right', '--device-scale-factor', '2']).wdioArgs,
    ).toEqual(['--suite', 'table-virtual-fixed-right'])
  })

  it('passes 2x scaling as a fresh Electron process argument', () => {
    expect(parseElectronE2EOptions(['--device-scale-factor', '2']).electronAppArgs).toEqual([
      '--force-device-scale-factor=2',
    ])
  })

  it('does not force a scale factor for the default diagnostic environment', () => {
    expect(parseElectronE2EOptions([]).electronAppArgs).toEqual([])
  })

  it('starts software rendering in a fresh Electron process argument', () => {
    expect(parseElectronE2EOptions(['--software-rendering'])).toEqual(
      expect.objectContaining({ softwareRendering: true, electronAppArgs: ['--disable-gpu'] }),
    )
  })

  it('keeps theme and hover controls out of WDIO arguments', () => {
    expect(parseElectronE2EOptions(['--theme', 'dark', '--hover-mode', 'forced', '--suite', 'smoke'])).toEqual(
      expect.objectContaining({ theme: 'dark', hoverMode: 'forced', wdioArgs: ['--suite', 'smoke'] }),
    )
  })

  it('rejects unsupported theme and hover values', () => {
    expect(() => parseElectronE2EOptions(['--theme', 'sepia'])).toThrow(/invalid theme/i)
    expect(() => parseElectronE2EOptions(['--hover-mode', 'sometimes'])).toThrow(/invalid hover mode/i)
  })
})
