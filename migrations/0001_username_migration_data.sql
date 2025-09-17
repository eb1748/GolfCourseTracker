-- Data migration to populate username field for existing users
-- This migration generates usernames from email prefixes and ensures uniqueness

-- Function to generate a username from email
CREATE OR REPLACE FUNCTION generate_username_from_email(email_input TEXT)
RETURNS TEXT AS $$
DECLARE
    base_username TEXT;
    final_username TEXT;
    counter INTEGER := 0;
    reserved_names TEXT[] := ARRAY[
        'admin', 'root', 'api', 'www', 'mail', 'ftp', 'localhost', 'system', 'user',
        'test', 'guest', 'public', 'private', 'static', 'assets', 'images', 'css',
        'js', 'javascript', 'null', 'undefined', 'true', 'false', 'about', 'contact',
        'help', 'support', 'blog', 'news', 'login', 'logout', 'register', 'signup',
        'signin', 'dashboard', 'profile', 'settings', 'account', 'home', 'index'
    ];
BEGIN
    -- Extract username part from email (before @)
    base_username := LOWER(SPLIT_PART(email_input, '@', 1));

    -- Remove non-alphanumeric characters except underscore and hyphen
    base_username := REGEXP_REPLACE(base_username, '[^a-z0-9_-]', '', 'g');

    -- Ensure username starts with alphanumeric character
    base_username := REGEXP_REPLACE(base_username, '^[^a-z0-9]+', '');

    -- Ensure minimum length of 3 characters
    IF LENGTH(base_username) < 3 THEN
        base_username := base_username || 'user';
    END IF;

    -- Truncate to maximum 20 characters
    base_username := LEFT(base_username, 20);

    -- Handle reserved usernames
    IF base_username = ANY(reserved_names) THEN
        base_username := base_username || '_user';
    END IF;

    -- Ensure uniqueness by adding counter if needed
    final_username := base_username;
    WHILE EXISTS (SELECT 1 FROM users WHERE username = final_username) LOOP
        counter := counter + 1;
        final_username := LEFT(base_username, 16) || '_' || counter::TEXT;
    END LOOP;

    RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- Update existing users with generated usernames
-- Note: This assumes the users table already exists and needs username population
DO $$
DECLARE
    user_record RECORD;
    generated_username TEXT;
BEGIN
    -- Only run if there are users without usernames
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
        FOR user_record IN SELECT id, email FROM users WHERE username IS NULL OR username = '' LOOP
            generated_username := generate_username_from_email(user_record.email);
            UPDATE users SET username = generated_username WHERE id = user_record.id;
            RAISE NOTICE 'Generated username % for user %', generated_username, user_record.email;
        END LOOP;
    END IF;
END $$;

-- Clean up the temporary function
DROP FUNCTION IF EXISTS generate_username_from_email(TEXT);