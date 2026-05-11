ALTER TABLE profiles DISABLE TRIGGER USER;
UPDATE profiles SET erp_user='flora.souza', approved=true WHERE id='c1327f93-d7cf-4d31-aae1-7748d897c87f';
ALTER TABLE profiles ENABLE TRIGGER USER;
INSERT INTO user_access (user_login, profile_id) VALUES ('flora.souza','1ac1e556-5a9f-44a6-93fb-e8beb407637f') ON CONFLICT DO NOTHING;