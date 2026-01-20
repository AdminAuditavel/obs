-- Add location columns to posts table
ALTER TABLE posts 
ADD COLUMN latitude FLOAT,
ADD COLUMN longitude FLOAT;

-- Add index for spatial queries (optional but recommended for map)
CREATE INDEX idx_posts_location ON posts (latitude, longitude);

-- Comment on columns
COMMENT ON COLUMN posts.latitude IS 'Latitude of the event/report';
COMMENT ON COLUMN posts.longitude IS 'Longitude of the event/report';
