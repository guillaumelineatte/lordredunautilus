-- Les questions liées aux mineurs se traitent en personne (autorisations sur papier) :
-- le site ne conserve plus aucune information permettant de savoir qui est mineur.
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_parentalDocumentFileId_fkey";
DROP INDEX IF EXISTS "Member_parentalDocumentFileId_key";
ALTER TABLE "Member"
  DROP COLUMN IF EXISTS "isMinor",
  DROP COLUMN IF EXISTS "minorReviewedAt",
  DROP COLUMN IF EXISTS "parentalDocumentReceived",
  DROP COLUMN IF EXISTS "parentalDocumentReceivedAt",
  DROP COLUMN IF EXISTS "parentalDocumentFileId";
ALTER TABLE "EventRegistration" DROP COLUMN IF EXISTS "isMinor";
DROP TABLE IF EXISTS "PrivateFile";
