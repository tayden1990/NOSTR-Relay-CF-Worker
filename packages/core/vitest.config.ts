import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporters: 'default',
    globals: true,
    typecheck: {
      tsconfig: './tsconfig.test.json'
    }
  }
})
