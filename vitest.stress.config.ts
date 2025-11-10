import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["src/testkit/stress.test.ts"],
    testTimeout: 15000,
  },
})

