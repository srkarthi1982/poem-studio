/**
 * Poem Studio - create poems with guided prompts and store them in collections.
 *
 * Design goals:
 * - A user can group poems into collections (topics, projects, etc.).
 * - Each poem stores form, style, language, and optional prompt/context.
 * - Future support for "versions" can be added later if needed.
 */

import { defineTable, column, NOW } from "astro:db";

export const PoemCollections = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    name: column.text(),                            // e.g. "Nature poems", "Love series"
    description: column.text({ optional: true }),
    icon: column.text({ optional: true }),
    isDefault: column.boolean({ default: false }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const Poems = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    collectionId: column.text({
      references: () => PoemCollections.columns.id,
      optional: true,
    }),
    userId: column.text(),
    title: column.text({ optional: true }),
    form: column.text({ optional: true }),           // "haiku", "sonnet", "free-verse", etc.
    style: column.text({ optional: true }),          // "romantic", "humorous", "sad"
    language: column.text({ optional: true }),       // e.g. "en", "ta"
    prompt: column.text({ optional: true }),         // prompt used to generate the poem
    body: column.text(),                             // the poem itself
    notes: column.text({ optional: true }),
    isFavorite: column.boolean({ default: false }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const tables = {
  PoemCollections,
  Poems,
} as const;
