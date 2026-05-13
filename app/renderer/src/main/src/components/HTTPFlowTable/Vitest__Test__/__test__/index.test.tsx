/** 运行：仓库根 yarn test:vitest app/renderer/src/main/src/components/HTTPFlowTable/Vitest__Test__ --run */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Vitest__Test__ } from '@/components/HTTPFlowTable/Vitest__Test__'

describe('HTTPFlowTable Vitest__Test__', () => {
  it('renders derived values from HTTP flow helpers', () => {
    render(React.createElement(Vitest__Test__, { bodyLength: 3, unit: 'K' }))

    expect(screen.getByTestId('httpflow-vitest-page')).toHaveTextContent('http flow table vitest test page')
    expect(screen.getByTestId('request-string')).toHaveTextContent('AB')
    expect(screen.getByTestId('response-string')).toHaveTextContent('C')
    expect(screen.getByTestId('converted-size')).toHaveTextContent('3072')
    expect(screen.getByTestId('dedup-size')).toHaveTextContent('2')
  })

  it('renders with default props', () => {
    render(React.createElement(Vitest__Test__))

    expect(screen.getByTestId('httpflow-vitest-page')).toHaveTextContent('http flow table vitest test page')
    expect(screen.getByTestId('request-string')).toHaveTextContent('AB')
    expect(screen.getByTestId('response-string')).toHaveTextContent('C')
    expect(screen.getByTestId('converted-size')).toHaveTextContent('2048')
    expect(screen.getByTestId('dedup-size')).toHaveTextContent('2')
  })
})
