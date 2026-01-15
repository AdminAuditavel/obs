-- Update all pending posts to published so they are visible
UPDATE posts SET status = 'published' WHERE status = 'pending';
