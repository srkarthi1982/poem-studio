import { defineAction, ActionError, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import { PoemCollections, Poems, and, db, eq } from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

async function getOwnedCollection(collectionId: string, userId: string) {
  const [collection] = await db
    .select()
    .from(PoemCollections)
    .where(and(eq(PoemCollections.id, collectionId), eq(PoemCollections.userId, userId)));

  if (!collection) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Collection not found.",
    });
  }

  return collection;
}

export const server = {
  createCollection: defineAction({
    input: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      icon: z.string().optional(),
      isDefault: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [collection] = await db
        .insert(PoemCollections)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          name: input.name,
          description: input.description,
          icon: input.icon,
          isDefault: input.isDefault ?? false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        success: true,
        data: { collection },
      };
    },
  }),

  updateCollection: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        isDefault: z.boolean().optional(),
      })
      .refine(
        (input) =>
          input.name !== undefined ||
          input.description !== undefined ||
          input.icon !== undefined ||
          input.isDefault !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedCollection(input.id, user.id);

      const [collection] = await db
        .update(PoemCollections)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.icon !== undefined ? { icon: input.icon } : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
          updatedAt: new Date(),
        })
        .where(eq(PoemCollections.id, input.id))
        .returning();

      return {
        success: true,
        data: { collection },
      };
    },
  }),

  listCollections: defineAction({
    input: z.object({}).optional(),
    handler: async (_input, context) => {
      const user = requireUser(context);

      const collections = await db
        .select()
        .from(PoemCollections)
        .where(eq(PoemCollections.userId, user.id));

      return {
        success: true,
        data: { items: collections, total: collections.length },
      };
    },
  }),

  createPoem: defineAction({
    input: z.object({
      collectionId: z.string().optional(),
      title: z.string().optional(),
      form: z.string().optional(),
      style: z.string().optional(),
      language: z.string().optional(),
      prompt: z.string().optional(),
      body: z.string().min(1),
      notes: z.string().optional(),
      isFavorite: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      if (input.collectionId) {
        await getOwnedCollection(input.collectionId, user.id);
      }

      const now = new Date();
      const [poem] = await db
        .insert(Poems)
        .values({
          id: crypto.randomUUID(),
          collectionId: input.collectionId ?? null,
          userId: user.id,
          title: input.title,
          form: input.form,
          style: input.style,
          language: input.language,
          prompt: input.prompt,
          body: input.body,
          notes: input.notes,
          isFavorite: input.isFavorite ?? false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        success: true,
        data: { poem },
      };
    },
  }),

  updatePoem: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        collectionId: z.string().optional(),
        title: z.string().optional(),
        form: z.string().optional(),
        style: z.string().optional(),
        language: z.string().optional(),
        prompt: z.string().optional(),
        body: z.string().optional(),
        notes: z.string().optional(),
        isFavorite: z.boolean().optional(),
      })
      .refine(
        (input) =>
          input.collectionId !== undefined ||
          input.title !== undefined ||
          input.form !== undefined ||
          input.style !== undefined ||
          input.language !== undefined ||
          input.prompt !== undefined ||
          input.body !== undefined ||
          input.notes !== undefined ||
          input.isFavorite !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [existing] = await db
        .select()
        .from(Poems)
        .where(and(eq(Poems.id, input.id), eq(Poems.userId, user.id)));

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Poem not found.",
        });
      }

      if (input.collectionId !== undefined && input.collectionId !== null) {
        await getOwnedCollection(input.collectionId, user.id);
      }

      const [poem] = await db
        .update(Poems)
        .set({
          ...(input.collectionId !== undefined ? { collectionId: input.collectionId } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.form !== undefined ? { form: input.form } : {}),
          ...(input.style !== undefined ? { style: input.style } : {}),
          ...(input.language !== undefined ? { language: input.language } : {}),
          ...(input.prompt !== undefined ? { prompt: input.prompt } : {}),
          ...(input.body !== undefined ? { body: input.body } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.isFavorite !== undefined ? { isFavorite: input.isFavorite } : {}),
          updatedAt: new Date(),
        })
        .where(eq(Poems.id, input.id))
        .returning();

      return {
        success: true,
        data: { poem },
      };
    },
  }),

  deletePoem: defineAction({
    input: z.object({ id: z.string().min(1) }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const result = await db
        .delete(Poems)
        .where(and(eq(Poems.id, input.id), eq(Poems.userId, user.id)));

      if (result.rowsAffected === 0) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Poem not found.",
        });
      }

      return { success: true };
    },
  }),

  listPoems: defineAction({
    input: z
      .object({
        collectionId: z.string().optional(),
        favoritesOnly: z.boolean().default(false),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);
      const filters = [eq(Poems.userId, user.id)];

      if (input?.collectionId) {
        await getOwnedCollection(input.collectionId, user.id);
        filters.push(eq(Poems.collectionId, input.collectionId));
      }

      if (input?.favoritesOnly) {
        filters.push(eq(Poems.isFavorite, true));
      }

      const poems = await db.select().from(Poems).where(and(...filters));

      return {
        success: true,
        data: { items: poems, total: poems.length },
      };
    },
  }),
};
