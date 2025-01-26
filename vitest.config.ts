import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";


export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    // pool: 'forks',
    // poolOptions: {
    //   forks: {
    //     execArgv: [
    //       '--cpu-prof',
    //       '--cpu-prof-dir=test-runner-profile',
    //       '--heap-prof',
    //       '--heap-prof-dir=test-runner-profile'
    //     ],

    //     // To generate a single profile
    //     singleFork: true,
    //   },
    // },
    coverage: {
      provider: 'istanbul', // or 'v8'
      include: ['src'],
      exclude: ['src/preset'],
      reporter: [
        'text',
        'text-summary',
        'html'
      ],
      reportsDirectory: './coverage'
    },
  },
});