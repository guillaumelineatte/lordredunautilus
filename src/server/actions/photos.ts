"use server";

import { TAGS } from "@/lib/cache-tags";
import { publicationBlockers } from "@/lib/photo-rules";
import { idInput, photoMetaInput, photoPublishInput, reorderInput } from "@/lib/validation/schemas";
import { adminAction } from "../service/admin-action";
import { fail } from "../service/errors";
import { deletePublicFiles } from "../storage";

export const updatePhoto = adminAction(
  { schema: photoMetaInput, tags: [TAGS.photos] },
  async (input, { tx, audit }) => {
    const before = await tx.photo.findUnique({
      where: { id: input.id },
      include: { taggedMembers: true },
    });
    if (!before) fail("Photo introuvable.");
    const after = await tx.photo.update({
      where: { id: input.id },
      data: {
        alt: input.alt,
        caption: input.caption,
        eventId: input.eventId,
        imageRightsChecked: input.imageRightsChecked,
        taggedMembers: { set: input.taggedMemberIds.map((id) => ({ id })) },
      },
      include: { taggedMembers: true },
    });
    // Une photo publiée qui ne respecte plus les règles est dépubliée d'office.
    let unpublished = false;
    if (after.isPublished && publicationBlockers(after).length > 0) {
      await tx.photo.update({
        where: { id: after.id },
        data: { isPublished: false, publishedAt: null },
      });
      unpublished = true;
    }
    const { taggedMembers: tb, ...b } = before;
    const { taggedMembers: ta, ...a } = after;
    await audit.updated(
      "Photo",
      { ...b, taggedMemberIds: JSON.stringify(tb.map((m) => m.id).sort()) },
      {
        ...a,
        isPublished: unpublished ? false : a.isPublished,
        taggedMemberIds: JSON.stringify(ta.map((m) => m.id).sort()),
      },
    );
    return { unpublished };
  },
);

export const setPhotoPublished = adminAction(
  { schema: photoPublishInput, tags: [TAGS.photos] },
  async ({ id, publish }, { tx, audit }) => {
    const before = await tx.photo.findUnique({ where: { id }, include: { taggedMembers: true } });
    if (!before || before.deletedAt) fail("Photo introuvable.");
    if (publish) {
      const blockers = publicationBlockers(before);
      if (blockers.length > 0) fail(`Publication impossible : ${blockers.join(" ")}`);
    }
    const after = await tx.photo.update({
      where: { id },
      data: { isPublished: publish, publishedAt: publish ? new Date() : null },
    });
    const { taggedMembers: _t, ...b } = before;
    await audit.updated("Photo", b, after);
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
