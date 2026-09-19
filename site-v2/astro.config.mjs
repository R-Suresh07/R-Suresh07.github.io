// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

// https://astro.build/config
export default defineConfig({
  integrations: [mdx()],
  vite: {
    resolve: {
      alias: [{
        find: /^3dmol$/,
        replacement: '3dmol/build/3Dmol.es6-min.js',
      }],
    },
    // 3Dmol already ships a standalone ES module. Load it directly so a build
    // cannot invalidate the dev optimizer URL before the lazy viewer opens.
    optimizeDeps: { exclude: ['3dmol'] },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
    shikiConfig: {
      theme: 'github-light-default',
      wrap: true,
    },
  },
});
