-- L'âge des mineurs est vérifié en personne (tournois, soirées) :
-- l'année de naissance n'est plus conservée par le site.
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_birthYear_check";
ALTER TABLE "Member" DROP COLUMN IF EXISTS "birthYear";
