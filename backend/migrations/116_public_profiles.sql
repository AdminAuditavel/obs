-- Enable public read access to user profiles (for feed display)
-- Note: In a production app with sensitive data (phone/email), consider using a separate public_profiles view or column-level permissions.
-- For this feature, we need to read name/avatar of post authors.

CREATE POLICY "Public Read Profiles"
ON user_profiles FOR SELECT
USING (true);
