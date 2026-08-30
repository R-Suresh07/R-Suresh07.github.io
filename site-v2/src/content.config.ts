import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const writing = defineCollection({
  loader: glob({ base: './src/content/writing', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    topics: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    image: image().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    image: image(),
    importance: z.number(),
    category: z.string(),
    date: z.coerce.date(),
    links: z.array(z.object({
      label: z.string(),
      text: z.string(),
      href: z.url(),
    })),
  }),
});

export const collections = { writing, projects };
