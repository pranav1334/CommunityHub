DROP TABLE IF EXISTS meetups CASCADE;
DROP TABLE IF EXISTS join_requests CASCADE;
DROP TABLE IF EXISTS community_members CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,

    full_name VARCHAR(150) NOT NULL,
    profile_picture TEXT,

    profession VARCHAR(150) NOT NULL,
    current_company_college VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    bio TEXT NOT NULL,

    join_reason TEXT NOT NULL,
    contribution TEXT NOT NULL,

    linkedin_url TEXT NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,

    instagram TEXT,
    website TEXT,

    role VARCHAR(30) DEFAULT 'member'
        CHECK (role IN ('member', 'admin')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE communities (
    id SERIAL PRIMARY KEY,

    community_name VARCHAR(200) NOT NULL,
    community_logo TEXT,
    cover_image TEXT,

    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,

    website TEXT,
    whatsapp_link TEXT,
    discord_link TEXT,
    instagram_link TEXT,

    community_rules TEXT NOT NULL,

    approval_type VARCHAR(30) NOT NULL
        CHECK (approval_type IN ('auto', 'admin')),

    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE community_members (
    id SERIAL PRIMARY KEY,

    community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (community_id, user_id)
);

CREATE TABLE join_requests (
    id SERIAL PRIMARY KEY,

    community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    join_reason TEXT NOT NULL,
    contribution TEXT NOT NULL,

    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (community_id, user_id)
);

CREATE TABLE meetups (
    id SERIAL PRIMARY KEY,

    community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,

    title VARCHAR(200) NOT NULL,
    description TEXT,
    meetup_date TIMESTAMP NOT NULL,
    location VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);