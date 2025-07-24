import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'treelike-hooks',
      // The file name for the generated bundle (entry point of your library)
      fileName: (format) => `treelike-hooks.${format}.js`,
    },
    rollupOptions: {
      // Externalize dependencies so they're not bundled into your library
      external: ['react', 'treelike', 'treelike-nostr'],
      output: {
        globals: {
          react: 'React',
        },
      },
    },
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
  },
});
