ALTER TABLE chats
ADD COLUMN application_id UUID REFERENCES applications(id) ON DELETE CASCADE;

CREATE INDEX chats_application_id_idx ON chats(application_id);