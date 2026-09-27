-- Seul l'administrateur publie les photos : plus de vérification des droits
-- à la publication, ni d'identification des membres sur les photos.
ALTER TABLE "Photo" DROP COLUMN IF EXISTS "imageRightsChecked";
DROP TABLE IF EXISTS "_PhotoTaggedMembers";
