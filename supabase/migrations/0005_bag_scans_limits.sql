-- 0005_bag_scans_limits.sql
-- The bag-scans bucket had no file-size or MIME-type limit, meaning any
-- signed-in user could upload an arbitrarily large or non-image file.

update storage.buckets
set file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/heic', 'image/webp']
where id = 'bag-scans';
