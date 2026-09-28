"use server";

import { TAGS } from "@/lib/cache-tags";
import { idInput, photoMetaInput, photoPublishInput, reorderInput } from "@/lib/validation/schemas";
import { adminAction } from "../service/admin-action";
import { fail } from "../service/errors";
import { deletePublicFiles } from "../storage";

export const updatePhoto = adminAction(
  { schema: photoMetaInput, tags: [TAGS.photos] },
  async (input, { tx, audit }) => {
    const before = await tx.photo.findUnique({ where: { id: input.id } });
    if (!before) fail("Photo introuvable.");
    const after = await tx.photo.update({
      where: { id: input.id },
      data: { alt: input.alt, caption: input.caption, eventId: input.eventId },
    });
    await audit.updated("Photo", before, after);
    return null;
  },
);

// pas de vérif avant publication, c'est l'admin qui gère les photos
export const setPhotoPublished = adminAction(
  { schema: photoPublishInput, tags: [TAGS.photos] },
  async ({ id, publish }, { tx, audit }) => {
    const before = await tx.photo.findUnique({ where: { id } });
    if (!before || before.deletedAt) fail("Photo introuvable.");
    const after = await tx.photo.update({
      where: { id },
      data: { isPublished: publish, publishedAt: publish ? new Date() : null },
    });
    await audit.updated("Photo", before, after);
    return null;
  },
);

export const reorderPhotos = adminAction(
  { schema: reorderInput, tags: [TAGS.photos] },
  async ({ ids }, { tx, audit }) => {
    for (const [index, id] of ids.entries()) {
      await tx.photo.update({ where: { id }, data: { sortOrder: index } });
    }
    await audit.log("UPDATE", "Photo", null, {
      ordre: { before: null, after: `${ids.length} photos réordonnées` },
    });
    return null;
  },
);

export const deletePhoto = adminAction(
  { schema: idInput, tags: [TAGS.photos] },
  async ({ id }, { tx, audit, afterCommit }) => {
    const before = await tx.photo.findUnique({ where: { id } });
    if (!before) fail("Photo introuvable.");
    await tx.photo.delete({ where: { id } });
    await audit.deleted("Photo", before);
    afterCommit(() => deletePublicFiles([before.thumbUrl, before.mediumUrl, before.largeUrl]));
    return null;
  },
);
