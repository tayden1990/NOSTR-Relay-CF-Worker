import { describe, it, expect } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import { App } from './App'

describe('Admin UI App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders the main title', () => {
    const { getByText } = render(<App />)
    expect(getByText('Nostr Relay Admin')).toBeTruthy()
  })

  it('renders input fields', () => {
    const { container } = render(<App />)
    const inputs = container.querySelectorAll('input')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('renders buttons', () => {
    const { container } = render(<App />)
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})