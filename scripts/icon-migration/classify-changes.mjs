#!/usr/bin/env node

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const RELEVANT_PATHS = [
  /^app\/renderer\/vite-plugins\//,
  /^app\/renderer\/src\/main\/src\//,
  /^app\/renderer\/engine-link-startup\/src\//,
  /^scripts\/icon-migration\//,
  /^scripts\/ci-select-vitest-tests\.js$/,
  /^\.github\/actions\/pr-ci-setup-node-yarn\//,
  /^\.github\/workflows\/icon-migration-gate\.yml$/,
  /^package\.json$/,
  /^yarn\.lock$/,
  /^vitest\.config\.ts$/,
  /^app\/renderer\/(?:src\/main|engine-link-startup)\/(?:package\.json|yarn\.lock|vite\.config\.(?:ts|mts)|vitest\.config\.(?:ts|mts))$/,
]

function writeOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT
  if (outputPath) writeFileSync(outputPath, `${name}=${value}\n`, { flag: 'a' })
}

function writeArtifact(artifact) {
  const artifactPath = resolve(process.env.ICON_MIGRATION_CLASSIFIER_ARTIFACT ?? 'icon-migration-classification.json')
  mkdirSync(dirname(artifactPath), { recursive: true })
  const temporaryPath = `${artifactPath}.tmp-${process.pid}`
  writeFileSync(temporaryPath, `${JSON.stringify(artifact, null, 2)}\n`)
  renameSync(temporaryPath, artifactPath)
  return artifactPath
}

function readValidatedArtifact(artifactPath) {
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'))
  if (
    artifact.schema_version !== 'icon-migration-classifier/v1' ||
    artifact.status !== 'valid' ||
    typeof artifact.run_full !== 'boolean' ||
    !Array.isArray(artifact.changed_files) ||
    !Array.isArray(artifact.matched_files)
  ) {
    throw new Error('Classifier artifact failed schema validation')
  }
  if (
    artifact.changed_files.length === 0 ||
    (artifact.run_full && artifact.matched_files.length === 0) ||
    (!artifact.run_full && (artifact.reason !== 'validated noop' || artifact.matched_files.length !== 0))
  ) {
    throw new Error('Classifier artifact contains an inconsistent decision')
  }
  return artifact
}

function failClosed(reason, changedFiles = []) {
  const artifact = {
    schema_version: 'icon-migration-classifier/v1',
    status: 'error',
    run_full: true,
    reason,
    changed_files: changedFiles,
  }
  writeArtifact(artifact)
  writeOutput('run_full', 'true')
  writeOutput('classification_status', 'error')
  console.error(reason)
  process.exitCode = 1
}

writeOutput('run_full', 'true')

try {
  const changedFilesPath = process.env.CHANGED_FILES_PATH
  if (!changedFilesPath) throw new Error('CHANGED_FILES_PATH is required')
  const changedFilesPayload = readFileSync(changedFilesPath, 'utf8')
  const changedFiles = changedFilesPayload
    .split(changedFilesPayload.includes('\0') ? '\0' : /\r?\n/)
    .filter((path) => path.length > 0)

  if (changedFiles.length === 0) throw new Error('Changed-file list is empty; refusing to classify as noop')
  const invalidPath = changedFiles.find(
    (path) => path.startsWith('/') || path.includes('\\') || path.split('/').some((segment) => segment === '..'),
  )
  if (invalidPath) throw new Error(`Unsafe changed path: ${invalidPath}`)

  const matchedFiles = changedFiles.filter((path) => RELEVANT_PATHS.some((pattern) => pattern.test(path)))
  const runFull = matchedFiles.length > 0
  const artifact = {
    schema_version: 'icon-migration-classifier/v1',
    status: 'valid',
    run_full: runFull,
    reason: runFull ? 'icon migration surface changed' : 'validated noop',
    changed_files: changedFiles,
    matched_files: matchedFiles,
  }
  const artifactPath = writeArtifact(artifact)
  const validatedArtifact = readValidatedArtifact(artifactPath)
  writeOutput('run_full', String(validatedArtifact.run_full))
  writeOutput('classification_status', 'valid')
  console.info(
    runFull ? `Running full icon migration gate for ${matchedFiles.length} matched file(s)` : 'Validated noop',
  )
} catch (error) {
  failClosed(error instanceof Error ? error.message : String(error))
}
