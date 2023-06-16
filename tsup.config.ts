import { Options, defineConfig } from 'tsup'

export default defineConfig({
  bundle: true,
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  format: 'cjs',
  minify: true,
  skipNodeModulesBundle: true,
  sourcemap: true,
  target: 'es2020',
  treeshake: true,
} as Options)
