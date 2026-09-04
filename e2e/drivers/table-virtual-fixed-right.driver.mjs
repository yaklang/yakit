const FIXTURE_URL = 'e2e-fixture=table-virtual-fixed-right'
const WHEEL_TRACE = [840, 1680, 2520, -560, 3360, 1120]
const ANCHORS = [...Array(7).fill(0), ...Array(7).fill(0.5), ...Array(6).fill(0.8)]

const nextAnimationFrames = (count = 1) =>
  browser.executeAsync((frames, done) => {
    const step = () => {
      if (frames-- <= 0) return done()
      requestAnimationFrame(step)
    }
    step()
  }, count)

const getFixtureWindow = async () => {
  const windows = await browser.electron.execute(
    (electron, urlFragment) =>
      electron.BrowserWindow.getAllWindows()
        .filter((window) => window.webContents.getURL().includes(urlFragment))
        .map((window) => ({
          id: window.id,
          url: window.webContents.getURL(),
          visible: window.isVisible(),
          focused: window.isFocused(),
        })),
    FIXTURE_URL,
  )
  if (windows.length !== 1) throw new Error(`Expected one fixture BrowserWindow, found ${windows.length}`)
  return windows[0]
}

export const waitForTableMaskFixture = async () => {
  await browser.waitUntil(
    async () => {
      const windows = await getFixtureWindow()
      return windows.visible && windows.focused
    },
    { timeout: 30_000, timeoutMsg: 'The table mask fixture Main window did not become visible and focused' },
  )
  await browser.switchToYakitWindow(FIXTURE_URL)
  const supportsDisplayP3 = await browser.execute(() => CSS.supports('color', 'color(display-p3 0 1 0)'))
  if (!supportsDisplayP3) throw new Error('The Electron fixture requires CSS Display P3 color support')
  await $('[data-testid="table-virtual-fixed-right-fixture"]').waitForDisplayed()
  await $('[data-testid="table-mask-fixed-column"]').waitForExist()
}

const readGeometry = () =>
  browser.execute(() => {
    const container = document.querySelector('[data-testid="table-mask-scroll-container"]')
    const wrapper = document.querySelector('[data-testid="table-mask-virtual-wrapper"]')
    const fixed = document.querySelector('[data-testid="table-mask-fixed-column"]')
    const sentinel = document.querySelector('[data-testid="table-mask-sentinel-column"]')
    if (!(container instanceof HTMLElement) || !(wrapper instanceof HTMLElement)) {
      throw new Error('Fixture scroll container or virtual wrapper is missing')
    }
    if (!(fixed instanceof HTMLElement) || !(sentinel instanceof HTMLElement)) {
      throw new Error('Fixture sentinel or fixed column is missing')
    }

    const rect = (element) => {
      const value = element.getBoundingClientRect()
      return {
        left: value.left,
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        width: value.width,
        height: value.height,
      }
    }
    const containerRect = rect(container)
    const fixedRect = rect(fixed)
    const fixedCells = Array.from(fixed.children)
      .filter((cell) => cell instanceof HTMLElement && cell.dataset.virtualIndex !== undefined)
      .map((cell) => ({ index: Number(cell.dataset.virtualIndex), rect: rect(cell) }))
      .filter(({ rect: cellRect }) => cellRect.bottom > containerRect.top && cellRect.top < containerRect.bottom)
    const sentinelByIndex = new Map(
      Array.from(sentinel.children)
        .filter((cell) => cell instanceof HTMLElement && cell.dataset.virtualIndex !== undefined)
        .map((cell) => [Number(cell.dataset.virtualIndex), rect(cell)]),
    )
    const pairs = fixedCells
      .map((cell) => ({
        index: cell.index,
        fixed: cell.rect,
        sentinel: sentinelByIndex.get(cell.index),
      }))
      .filter((pair) => pair.sentinel)

    return {
      scroll: {
        top: container.scrollTop,
        left: container.scrollLeft,
        maxTop: container.scrollHeight - container.clientHeight,
        maxLeft: container.scrollWidth - container.clientWidth,
      },
      wrapper: { height: wrapper.style.height, marginTop: wrapper.style.marginTop },
      containerRect,
      containerClientWidth: container.clientWidth,
      containerScrollbarWidth: container.offsetWidth - container.clientWidth,
      fixedRect,
      fixedCells,
      pairs,
      firstVirtualIndex: fixedCells[0]?.index ?? null,
    }
  })

const waitForStableGeometry = async () => {
  let previous
  await browser.waitUntil(
    async () => {
      await nextAnimationFrames(2)
      const current = await readGeometry()
      const stable =
        previous &&
        previous.wrapper.marginTop === current.wrapper.marginTop &&
        previous.firstVirtualIndex === current.firstVirtualIndex &&
        Math.abs(previous.fixedRect.left - current.fixedRect.left) <= 0.25 &&
        Math.abs(previous.fixedRect.top - current.fixedRect.top) <= 0.25
      previous = current
      return stable
    },
    { timeout: 8_000, interval: 50, timeoutMsg: 'Virtual wrapper and fixed column did not reach stable geometry' },
  )
  return previous
}

const setVariant = async (variant) => {
  await $(`[data-testid="table-mask-${variant}"]`).click()
  await browser.waitUntil(async () => (await $('[data-testid="table-mask-active-variant"]').getText()) === variant, {
    timeout: 3_000,
    timeoutMsg: `Fixture did not switch to ${variant}`,
  })
}

const setDataset = async (dataset) => {
  await $(`[data-testid="table-mask-${dataset}"]`).click()
  await browser.waitUntil(async () => (await $('[data-testid="table-mask-active-dataset"]').getText()) === dataset, {
    timeout: 3_000,
    timeoutMsg: `Fixture did not switch to ${dataset} IDs`,
  })
  await nextAnimationFrames(2)
  await $('[data-testid="table-mask-fixed-column"]').waitForExist()
}

const setIdentity = async (identity) => {
  await $(`[data-testid="table-mask-${identity}"]`).click()
  await browser.waitUntil(async () => (await $('[data-testid="table-mask-active-identity"]').getText()) === identity, {
    timeout: 3_000,
    timeoutMsg: `Fixture did not switch to ${identity} identity`,
  })
  await nextAnimationFrames(2)
  await $('[data-testid="table-mask-fixed-column"]').waitForExist()
}

const readFixedChildBackgroundContract = () =>
  browser.execute(() => {
    const fixed = document.querySelector('[data-testid="table-mask-fixed-column"]')
    if (!(fixed instanceof HTMLElement)) throw new Error('Fixture fixed column is missing')
    const backgrounds = Array.from(fixed.children).map((cell, index) => {
      const computed = getComputedStyle(cell).backgroundColor
      const transparent = computed === 'transparent' || /^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(computed)
      return { index, computed, transparent }
    })
    return {
      parent: getComputedStyle(fixed).backgroundColor,
      parentTop: getComputedStyle(fixed).top,
      children: backgrounds,
      pass: backgrounds.length > 0 && backgrounds.every(({ transparent }) => transparent),
    }
  })

const movePointerOutsideTable = async () => {
  await $('[data-testid="table-mask-calibration"]').moveTo()
  await nextAnimationFrames(2)
  await browser.waitUntil(
    () =>
      browser.execute(() => {
        const fixed = document.querySelector('[data-testid="table-mask-fixed-column"]')
        if (!(fixed instanceof HTMLElement)) throw new Error('Fixture fixed column is missing')
        return Array.from(fixed.children).every((cell) => !cell.className.includes('virtual-table-hover-row'))
      }),
    { timeout: 1_000, interval: 25, timeoutMsg: 'Fixed column hover state did not clear' },
  )
}

const resetAtAnchor = async (anchor) => {
  await browser.execute((ratio) => {
    const container = document.querySelector('[data-testid="table-mask-scroll-container"]')
    if (!(container instanceof HTMLElement)) throw new Error('Fixture scroll container is missing')
    container.scrollTop = Math.round((container.scrollHeight - container.clientHeight) * ratio)
    container.scrollLeft = 0
  }, anchor)
  await waitForStableGeometry()
  await browser.execute(() => {
    const container = document.querySelector('[data-testid="table-mask-scroll-container"]')
    if (!(container instanceof HTMLElement)) throw new Error('Fixture scroll container is missing')
    container.scrollLeft = Math.round((container.scrollWidth - container.clientWidth) * 0.6)
  })
  await browser.pause(220)
  return waitForStableGeometry()
}

const replayWheelTrace = async () => {
  const container = await $('[data-testid="table-mask-scroll-container"]')
  for (const deltaY of WHEEL_TRACE) {
    await browser.action('wheel').scroll({ origin: container, deltaX: 0, deltaY, duration: 0 }).perform()
    await nextAnimationFrames()
  }
}

const captureOracleFrame = async () => {
  const geometry = await browser.execute(() => {
    const fixed = document.querySelector('[data-testid="table-mask-fixed-column"]')
    const container = document.querySelector('[data-testid="table-mask-scroll-container"]')
    const fixedHeader = document.querySelector('[class*="virtual-table-title-fixed-right"]')
    const swatches = Array.from(document.querySelectorAll('[data-calibration]'))
    if (
      !(fixed instanceof HTMLElement) ||
      !(container instanceof HTMLElement) ||
      !(fixedHeader instanceof HTMLElement) ||
      swatches.length !== 3
    ) {
      throw new Error('Fixture capture targets are missing')
    }
    const toRect = (element) => {
      const rect = element.getBoundingClientRect()
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
    }
    const containerRect = toRect(container)
    const cells = Array.from(fixed.children)
      .filter((cell) => cell instanceof HTMLElement && cell.dataset.virtualIndex !== undefined)
      .map((cell) => ({ index: Number(cell.dataset.virtualIndex), ...toRect(cell) }))
      .filter((cell) => cell.bottom > containerRect.top && cell.top < containerRect.bottom)
    return {
      fixed: toRect(fixed),
      fixedHeader: toRect(fixedHeader),
      container: containerRect,
      bodyViewport: {
        top: toRect(fixedHeader).bottom,
        bottom: containerRect.top + container.clientHeight,
      },
      containerMetrics: {
        clientHeight: container.clientHeight,
        offsetHeight: container.offsetHeight,
        scrollbarHeight: container.offsetHeight - container.clientHeight,
      },
      cells,
      swatches: swatches.map((element) => ({ name: element.dataset.calibration, ...toRect(element) })),
      devicePixelRatio: window.devicePixelRatio,
    }
  })

  return browser.electron.execute(
    async (electron, urlFragment, layout) => {
      const matches = electron.BrowserWindow.getAllWindows().filter((window) =>
        window.webContents.getURL().includes(urlFragment),
      )
      if (matches.length !== 1) throw new Error(`Expected one fixture BrowserWindow, found ${matches.length}`)

      const left = Math.floor(layout.fixed.left)
      const top = Math.floor(Math.min(...layout.swatches.map((swatch) => swatch.top)))
      const right = Math.ceil(layout.fixed.right)
      const bottom = Math.ceil(layout.container.bottom)
      const capture = { x: left, y: top, width: right - left, height: bottom - top }
      const image = await matches[0].webContents.capturePage(capture)
      const size = image.getSize(1)
      const bitmap = image.toBitmap({ scaleFactor: 1 })
      const stride = size.width * 4
      const scaleX = size.width / capture.width
      const scaleY = size.height / capture.height
      if (bitmap.length !== stride * size.height) {
        throw new Error(`Unexpected bitmap size: ${bitmap.length}, expected ${stride * size.height}`)
      }

      const byteAt = (x, y) => {
        const localX = Math.max(0, Math.min(size.width - 1, Math.floor((x - capture.x) * scaleX)))
        const localY = Math.max(0, Math.min(size.height - 1, Math.floor((y - capture.y) * scaleY)))
        const offset = localY * stride + localX * 4
        return [bitmap[offset], bitmap[offset + 1], bitmap[offset + 2], bitmap[offset + 3]]
      }
      const samples = Object.fromEntries(
        layout.swatches.map((swatch) => [
          swatch.name,
          byteAt((swatch.left + swatch.right) / 2, (swatch.top + swatch.bottom) / 2),
        ]),
      )
      const isPrimary = (sample, channel) =>
        sample[channel] > 200 && sample[(channel + 1) % 3] < 80 && sample[(channel + 2) % 3] < 80
      const rgba = isPrimary(samples.red, 0) && isPrimary(samples.green, 1) && isPrimary(samples.blue, 2)
      const bgra = isPrimary(samples.red, 2) && isPrimary(samples.green, 1) && isPrimary(samples.blue, 0)
      if (!rgba && !bgra) throw new Error(`Unable to calibrate bitmap channels: ${JSON.stringify(samples)}`)
      const rgbAt = (x, y) => {
        const bytes = byteAt(x, y)
        return rgba ? bytes.slice(0, 3) : [bytes[2], bytes[1], bytes[0]]
      }
      const samplesRgb = Object.fromEntries(
        Object.entries(samples).map(([name, bytes]) => [
          name,
          rgba ? bytes.slice(0, 3) : [bytes[2], bytes[1], bytes[0]],
        ]),
      )

      const clippedCells = layout.cells.map((cell) => ({
        ...cell,
        left: Math.max(cell.left + 12, layout.fixed.left + 12),
        right: Math.min(cell.right - 12, layout.fixed.right - 12),
        top: cell.top + 4,
        bottom: cell.bottom - 4,
        fullyVisible: cell.top + 4 >= layout.bodyViewport.top && cell.bottom - 4 <= layout.bodyViewport.bottom,
      }))
      const excludedCells = clippedCells
        .filter((cell) => cell.right <= cell.left || cell.bottom <= cell.top || !cell.fullyVisible)
        .map((cell) => {
          let reason = 'partial-vertical-visibility'
          if (cell.right <= cell.left) reason = 'empty-horizontal-roi'
          else if (cell.bottom <= cell.top) reason = 'empty-vertical-roi'

          return { index: cell.index, excluded: true, reason }
        })
      const cellResults = clippedCells
        .filter((cell) => cell.right > cell.left && cell.bottom > cell.top && cell.fullyVisible)
        .map((cell) => {
          let magenta = 0
          let green = 0
          let pixels = 0
          const pixelLeft = Math.ceil((cell.left - capture.x) * scaleX)
          const pixelRight = Math.floor((cell.right - capture.x) * scaleX)
          const pixelTop = Math.ceil((cell.top - capture.y) * scaleY)
          const pixelBottom = Math.floor((cell.bottom - capture.y) * scaleY)
          for (let y = pixelTop; y < pixelBottom; y += 1) {
            for (let x = pixelLeft; x < pixelRight; x += 1) {
              const [r, g, b] = rgbAt(capture.x + x / scaleX, capture.y + y / scaleY)
              pixels += 1
              if (r > 200 && b > 200 && g < 80) magenta += 1
              if (g > 200 && r < 80 && b < 80) green += 1
            }
          }
          const greenCoverage = pixels ? green / pixels : 0
          return {
            index: cell.index,
            roi: { left: pixelLeft, top: pixelTop, right: pixelRight, bottom: pixelBottom },
            pixels,
            magenta,
            green,
            greenCoverage,
            failed: magenta >= 8 || greenCoverage < 0.995,
          }
        })
      if (cellResults.length < 2) throw new Error('Pixel oracle requires at least two included fixed-right cell ROIs')

      return {
        capturedAt: new Date().toISOString(),
        windowId: matches[0].id,
        capture,
        devicePixelRatio: layout.devicePixelRatio,
        bitmap: { width: size.width, height: size.height, stride, byteLength: bitmap.length },
        captureScale: { x: scaleX, y: scaleY },
        bodyViewport: layout.bodyViewport,
        containerMetrics: layout.containerMetrics,
        calibration: {
          colorSpace: 'display-p3',
          declarations: {
            red: 'color(display-p3 1 0 0)',
            green: 'color(display-p3 0 1 0)',
            blue: 'color(display-p3 0 0 1)',
            magenta: 'color(display-p3 1 0 1)',
          },
          channelOrder: rgba ? 'RGBA' : 'BGRA',
          samplesRaw: samples,
          samplesRgb,
        },
        cells: cellResults,
        excludedCells,
        failed: cellResults.some((cell) => cell.failed),
      }
    },
    FIXTURE_URL,
    geometry,
  )
}

const captureConsecutiveFrames = async () => {
  const first = await captureOracleFrame()
  await nextAnimationFrames()
  const second = await captureOracleFrame()
  return { first, second, failed: first.failed && second.failed }
}

export const runTableMaskVariant = async ({ scenario, variant, dataset, identity }) => {
  await setDataset(dataset)
  await setIdentity(identity)
  await setVariant(variant)
  await waitForStableGeometry()
  await movePointerOutsideTable()
  const fixedChildBackgroundContract = await readFixedChildBackgroundContract()
  const runs = []
  for (const [runIndex, anchor] of ANCHORS.entries()) {
    const before = await resetAtAnchor(anchor)
    await replayWheelTrace()
    const after = await waitForStableGeometry()
    const frames = await captureConsecutiveFrames()
    const pairedDeltas = after.pairs.map((pair) => ({
      index: pair.index,
      top: Math.abs(pair.fixed.top - pair.sentinel.top),
      bottom: Math.abs(pair.fixed.bottom - pair.sentinel.bottom),
    }))
    const pairedIndices = new Set(after.pairs.map(({ index }) => index))
    const missingPairIndices = after.fixedCells.map(({ index }) => index).filter((index) => !pairedIndices.has(index))
    const mismatchedIndices = [
      ...pairedDeltas.filter(({ top, bottom }) => top > 1 || bottom > 1).map(({ index }) => index),
      ...missingPairIndices,
    ]
    const pairedGeometry = {
      pass: mismatchedIndices.length === 0,
      pairCount: after.pairs.length,
      fixedCellCount: after.fixedCells.length,
      maxTopDelta: pairedDeltas.length ? Math.max(...pairedDeltas.map(({ top }) => top)) : null,
      maxBottomDelta: pairedDeltas.length ? Math.max(...pairedDeltas.map(({ bottom }) => bottom)) : null,
      mismatchedIndices: [...new Set(mismatchedIndices)],
      classification: mismatchedIndices.length === 0 ? 'aligned' : 'reconciliation-mismatch',
    }
    const expectedFixedRight = after.containerRect.left + after.containerClientWidth
    const fixedEdgePass = Math.abs(after.fixedRect.right - expectedFixedRight) <= 1
    const pixelFailure = frames.failed
    const geometryFailure = !pairedGeometry.pass || !fixedEdgePass
    runs.push({
      run: runIndex + 1,
      anchor,
      failed: pixelFailure || geometryFailure,
      pixelFailure,
      geometryFailure,
      failureKinds: [pixelFailure && 'pixel', geometryFailure && 'geometry'].filter(Boolean),
      pairedGeometryPass: pairedGeometry.pass,
      pairedGeometry,
      fixedEdgePass,
      fixedEdge: {
        actual: after.fixedRect.right,
        expected: expectedFixedRight,
        scrollbarWidth: after.containerScrollbarWidth,
      },
      before,
      after,
      frames,
    })
  }

  const failuresByAnchor = Object.fromEntries(
    [0, 0.5, 0.8].map((anchor) => [String(anchor), runs.filter((run) => run.anchor === anchor && run.failed).length]),
  )
  const failures = runs.filter((run) => run.failed).length
  return {
    schemaVersion: 1,
    scenario,
    variant,
    dataset,
    identity: {
      renderKey: 'ID',
      reactRowKey: identity === 'row-key' ? 'HiddenIndex' : 'ID (identity reversal)',
      idPattern: dataset === 'duplicate' ? 'three-value-cycle' : 'unique-sequence',
      hiddenIndex: 'unique-row-index',
    },
    fixedChildBackgroundContract,
    wheel: { origin: 'table-mask-scroll-container center', deltaY: WHEEL_TRACE, duration: 0 },
    anchors: { allocation: { 0: 7, 0.5: 7, 0.8: 6 }, failures: failuresByAnchor },
    runs,
    failures,
    status: failures === 0 ? 'PASS' : 'REPRODUCED',
    calibrationColors: {
      colorSpace: 'display-p3',
      semantic: { sentinel: '#ff00ff', fixed: '#00ff00', red: '#ff0000', blue: '#0000ff' },
      declarations: {
        sentinel: 'color(display-p3 1 0 1)',
        fixed: 'color(display-p3 0 1 0)',
        red: 'color(display-p3 1 0 0)',
        blue: 'color(display-p3 0 0 1)',
      },
    },
  }
}
