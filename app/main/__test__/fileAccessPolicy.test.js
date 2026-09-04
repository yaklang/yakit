import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  assertFileAccess,
  assertRenameAccess,
  clearFileAccessGrantsForTests,
  grantFileAccess,
  grantOpenDialogResult,
  grantSaveDialogResult,
} from '../fileAccessPolicy'

const tempDirs = []

const createTempDir = () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisenso-file-policy-'))
  tempDirs.push(tempDir)
  return tempDir
}

const createEvent = (id = 1) => ({
  sender: {
    id,
    once: vi.fn(),
  },
})

describe('renderer file access policy', () => {
  beforeEach(() => clearFileAccessGrantsForTests())

  afterEach(() => {
    clearFileAccessGrantsForTests()
    tempDirs.splice(0).forEach((tempDir) => fs.rmSync(tempDir, { recursive: true, force: true }))
  })

  it('only grants a selected file to the renderer that opened the system dialog', () => {
    const tempDir = createTempDir()
    const selectedFile = path.join(tempDir, 'selected.txt')
    const otherFile = path.join(tempDir, 'other.txt')
    fs.writeFileSync(selectedFile, 'selected')
    fs.writeFileSync(otherFile, 'other')
    const event = createEvent(10)

    grantOpenDialogResult(event, { canceled: false, filePaths: [selectedFile] })

    expect(assertFileAccess(event, selectedFile, 'read')).toBe(fs.realpathSync.native(selectedFile))
    expect(() => assertFileAccess(event, otherFile, 'read')).toThrow(/was not granted/)
    expect(() => assertFileAccess(createEvent(11), selectedFile, 'read')).toThrow(/was not granted/)
  })

  it('allows managed operations inside a directory selected by the user', () => {
    const tempDir = createTempDir()
    const selectedDir = path.join(tempDir, 'workspace')
    fs.mkdirSync(selectedDir)
    const event = createEvent(20)
    grantFileAccess(event, selectedDir, ['read', 'write', 'delete', 'rename', 'probe'], { recursive: true })

    const newFile = path.join(selectedDir, 'new.txt')
    expect(assertFileAccess(event, newFile, 'write', { allowMissing: true })).toBe(newFile)
    expect(() => assertFileAccess(event, path.join(tempDir, 'outside.txt'), 'write', { allowMissing: true })).toThrow(
      /was not granted/,
    )
  })

  it('limits save grants to the exact path chosen by the user', () => {
    const tempDir = createTempDir()
    const selectedFile = path.join(tempDir, 'report.txt')
    const event = createEvent(30)
    grantSaveDialogResult(event, { canceled: false, filePath: selectedFile })

    expect(assertFileAccess(event, selectedFile, 'write', { allowMissing: true })).toBe(selectedFile)
    expect(() => assertFileAccess(event, path.join(tempDir, 'other.txt'), 'write', { allowMissing: true })).toThrow(
      /was not granted/,
    )
  })

  it('does not allow a selected file to overwrite a sibling during rename', () => {
    const tempDir = createTempDir()
    const selectedFile = path.join(tempDir, 'selected.txt')
    const existingFile = path.join(tempDir, 'existing.txt')
    fs.writeFileSync(selectedFile, 'selected')
    fs.writeFileSync(existingFile, 'existing')
    const event = createEvent(40)
    grantOpenDialogResult(event, { canceled: false, filePaths: [selectedFile] })

    expect(() => assertRenameAccess(event, selectedFile, existingFile)).toThrow(/existing file/)
  })
})
