-- Add an optional uploaded photo to sites (installation / equipment photo).
ALTER TABLE "Site" ADD COLUMN "photoUrl" TEXT;

-- Add an optional uploaded photo to site credentials (router / rack photo).
ALTER TABLE "SiteCredential" ADD COLUMN "photoUrl" TEXT;
