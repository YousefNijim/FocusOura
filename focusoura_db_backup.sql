--
-- PostgreSQL database dump
--

\restrict HWDD4KlT3BDmzBqMQgeEtjbquaQnF3yZEsdnPjqbfggPo7MANCK20J05UWfcNh9

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_insights (
    id text NOT NULL,
    session_id text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: challenge_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenge_participants (
    id text NOT NULL,
    challenge_id text NOT NULL,
    user_id text NOT NULL,
    focus_minutes integer DEFAULT 0 NOT NULL,
    joined_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenges (
    id text NOT NULL,
    creator_id text NOT NULL,
    title text NOT NULL,
    session_type text DEFAULT 'homework'::text NOT NULL,
    duration_minutes integer DEFAULT 60 NOT NULL,
    stake integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    winner_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    title text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: friendships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friendships (
    id text NOT NULL,
    requester_id text NOT NULL,
    receiver_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    invite_token text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: motivation_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.motivation_messages (
    id text NOT NULL,
    content text NOT NULL,
    session_id text,
    approved boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: plants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plants (
    id text NOT NULL,
    user_id text NOT NULL,
    subject_id text,
    plant_type text DEFAULT 'fern'::text NOT NULL,
    growth_level integer DEFAULT 1 NOT NULL,
    growth_points integer DEFAULT 0 NOT NULL,
    max_growth_points integer DEFAULT 100 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: session_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_events (
    id text NOT NULL,
    session_id text NOT NULL,
    user_id text NOT NULL,
    event_type text NOT NULL,
    event_time timestamp without time zone DEFAULT now() NOT NULL,
    metadata json
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    user_id text NOT NULL,
    subject_id text,
    plant_id text,
    session_type text NOT NULL,
    state text DEFAULT 'initialized'::text NOT NULL,
    duration_minutes integer NOT NULL,
    points_earned integer DEFAULT 0 NOT NULL,
    start_time timestamp without time zone DEFAULT now() NOT NULL,
    end_time timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id text NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    accent_color text NOT NULL,
    plant_id text,
    total_focus_minutes integer DEFAULT 0 NOT NULL,
    session_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    amount integer NOT NULL,
    description text NOT NULL,
    reference_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    display_name text NOT NULL,
    email text NOT NULL,
    password_hash text,
    role text DEFAULT 'student'::text NOT NULL,
    auth_provider text DEFAULT 'email'::text NOT NULL,
    provider_id text,
    study_mode text DEFAULT 'light'::text NOT NULL,
    notifications_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    user_code integer,
    avatar_url text,
    selected_pet_id text DEFAULT 'mochi'::text NOT NULL,
    unlocked_pet_ids jsonb DEFAULT '["mochi"]'::jsonb NOT NULL
);


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    user_id text NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    last_updated timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Data for Name: ai_insights; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_insights (id, session_id, user_id, type, content, created_at) FROM stdin;
\.


--
-- Data for Name: challenge_participants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.challenge_participants (id, challenge_id, user_id, focus_minutes, joined_at) FROM stdin;
\.


--
-- Data for Name: challenges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.challenges (id, creator_id, title, session_type, duration_minutes, stake, status, start_time, end_time, winner_id, created_at) FROM stdin;
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conversations (id, title, created_at) FROM stdin;
\.


--
-- Data for Name: friendships; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.friendships (id, requester_id, receiver_id, status, invite_token, created_at, updated_at) FROM stdin;
fr_1774801216981_gzzt2k	user_1774801196830_z5m79ed	user_1774800738010_tqctwms	accepted	\N	2026-03-29 16:20:16.982156	2026-03-29 16:35:21.542
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, conversation_id, role, content, created_at) FROM stdin;
\.


--
-- Data for Name: motivation_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.motivation_messages (id, content, session_id, approved, created_at) FROM stdin;
seed_msg_0	Every minute of focus is a step toward your goals. Keep going!	\N	t	2026-03-29 17:32:32.408619
seed_msg_1	You're building something amazing, one session at a time.	\N	t	2026-03-29 17:32:32.408619
seed_msg_2	The effort you put in today shapes who you become tomorrow.	\N	t	2026-03-29 17:32:32.408619
seed_msg_3	Consistency is the secret to mastery. You're doing great!	\N	t	2026-03-29 17:32:32.408619
seed_msg_4	Your future self will thank you for this moment of focus.	\N	t	2026-03-29 17:32:32.408619
seed_msg_5	Progress over perfection — every session counts.	\N	t	2026-03-29 17:32:32.408619
seed_msg_6	You chose to focus when it would have been easier not to. That's strength.	\N	t	2026-03-29 17:32:32.408619
seed_msg_7	Each session grows your garden. Keep nurturing it.	\N	t	2026-03-29 17:32:32.408619
seed_msg_8	The hardest part is starting. You already did that — now finish strong.	\N	t	2026-03-29 17:32:32.408619
seed_msg_9	You're not just studying, you're building your future.	\N	t	2026-03-29 17:32:32.408619
msg_1774806239942_h27b3	test test	sess_1774806161778_zhmsq	t	2026-03-29 17:43:59.951975
\.


--
-- Data for Name: plants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plants (id, user_id, subject_id, plant_type, growth_level, growth_points, max_growth_points, created_at) FROM stdin;
plant_1774805538967_17hu3	user_1774800738010_tqctwms	\N	fern	1	0	100	2026-03-29 17:32:18.968698
plant_1774806161748_pw8rk	user_1774800738010_tqctwms	\N	orchid	1	0	100	2026-03-29 17:42:41.748928
\.


--
-- Data for Name: session_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.session_events (id, session_id, user_id, event_type, event_time, metadata) FROM stdin;
evt_1774805539054_start	sess_1774805539050_ldls8	user_1774800738010_tqctwms	started	2026-03-29 17:32:19.054538	{"sessionType":"routine","plantType":"fern"}
evt_1774805551864_completed	sess_1774805539050_ldls8	user_1774800738010_tqctwms	completed	2026-03-29 17:32:31.864444	{"pointsEarned":1}
evt_1774806161781_start	sess_1774806161778_zhmsq	user_1774800738010_tqctwms	started	2026-03-29 17:42:41.782142	{"sessionType":"routine","plantType":"orchid"}
evt_1774806212046_completed	sess_1774806161778_zhmsq	user_1774800738010_tqctwms	completed	2026-03-29 17:43:32.047143	{"pointsEarned":1}
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (id, user_id, subject_id, plant_id, session_type, state, duration_minutes, points_earned, start_time, end_time, created_at) FROM stdin;
sess_1774805539050_ldls8	user_1774800738010_tqctwms	\N	plant_1774805538967_17hu3	routine	completed	1	1	2026-03-29 17:32:19.05	2026-03-29 17:32:31.852	2026-03-29 17:32:19.051396
sess_1774806161778_zhmsq	user_1774800738010_tqctwms	\N	plant_1774806161748_pw8rk	routine	completed	1	1	2026-03-29 17:42:41.778	2026-03-29 17:43:32.034	2026-03-29 17:42:41.778834
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subjects (id, user_id, name, accent_color, plant_id, total_focus_minutes, session_count, created_at) FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transactions (id, user_id, type, amount, description, reference_id, created_at) FROM stdin;
txn_1774805551859_qmuym	user_1774800738010_tqctwms	reward	1	Completed routine session	sess_1774805539050_ldls8	2026-03-29 17:32:31.859416
txn_1774806212040_9cbbw	user_1774800738010_tqctwms	reward	1	Completed routine session	sess_1774806161778_zhmsq	2026-03-29 17:43:32.041569
tx_pet_1774806268865_5jj9h	user_1774800738010_tqctwms	purchase	-100	Unlocked pet: Ember	ember	2026-03-29 17:44:28.869317
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, display_name, email, password_hash, role, auth_provider, provider_id, study_mode, notifications_enabled, created_at, user_code, avatar_url, selected_pet_id, unlocked_pet_ids) FROM stdin;
user_1774801196830_z5m79ed	Yousef Nijim	yosef.najem123@gmail.com	$2b$10$SfBAzwLbxc9OPtXpx6297.XY34iWYx11ZhXD5KiP57VffzFeWbNRa	student	email	\N	night	t	2026-03-29 16:19:56.832477	102587	data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAEsANwDASIAAhEBAxEB/8QAHAAAAQQDAQAAAAAAAAAAAAAAAAECAwUEBgcI/8QAPBAAAQMCBAQDBgUDBAEFAAAAAQACAwQRBRIhMQYTQVEHImEUMkJxgZEjUqGxwRXR4SQzYnLwNFOCkqL/xAAZAQEAAwEBAAAAAAAAAAAAAAAAAQIDBAX/xAAhEQEBAQACAwEBAAMBAAAAAAAAAQIDERIhMUEEEyIyUf/aAAwDAQACEQMRAD8A76lQhQBFkIUgQhCAQhCARZCEAhCEBZCEIBCEICyLIQgEIQgEIQgEIQgEIQgEiVNUBUqEKQIQhAWQhCAQhCAQhCARZCEAhCEAiyEIBCEIBCEIBCEIBCEIBCEIAppTk3RQHIQhSBCEIBCEIBCEIBRzVENO3NNNHG3u9wA/VY+JYpRYTRvqq2ojgiYL3e4C/oF5e4r4irMfxypqZ6qR8JeeWy5ytb0sFMnY9L1fE2B0EZkqcVpI2jvKFouLeNmD0sj46Cinq7aCQkMaf5XCDUeUAk/UqNz7C9grTI7EPHaSxvgrAen4pWNN46Yk4fgYRStP/N7iuSvecoIAATDuC7b0U+MHY6Tx0qwR7XgsTh1MUhB/VbdgPi3w/jMrYZ+ZQSu0HPtlP1C83tkc3RjsykbIL9lFzB7FiqYJgDFNG+4uMrgbhSrybhvEFXSSsLpqjls93JKQW/JdU4Y8WWsljpsYl5tM4hram1ns/wC46/NV6HXkJkM0dRCyaJ4fG8ZmuabghPUAQhCAQhCAQhCATTdOKaoDkIQpAhCEAhCEButd4q40wnhKna6ulLp5ATFTx6vd/Yeqv5ZGwwvlebNY0uJ9AvJXE2O1GPY5WYhUSF5kkPLvs1gPlA9LKZOxlcWcWVvE+LSVdQ5zY3G0cWYlrB2C1xz7uOhJTM5cN9R3KYSdjbRXE2bTa4SczXK4qEPSPcDu23TRSMlriG9x2ULnhuxKRhIZYE6d00kHU6oHscSbjQ90pkcdHb/uscGxIG26laQ5pDjr0QPMr2Aja2hB6JW1LrWDjfsoXvc7UgA7EjYpl9R2QdT8NvEyXh+ZuG4o98uGvNmOcbmE/wBl6FpqmKrp2TwPD4pGhzXDqF4oa7W/RdK8OvEyo4bnjw/EHGbDnkNBJ1i/wqWfsHpJF1HDNHUQMmicHxyNDmuGxBUiqBCEIBCEIBNTk1QHIQhSBCRKgEJEqDVPEfGBg3A+ITAkPlZyGW3u7T9rryxJJddi8dsbkdVUGCsIETG899jqXG4At8v3XFnuIJBur5+Bc3S/VF/L0Udw4fJAcNQT/lWDnaatGyV3mAJJv1F1G7ynodE3m5TubdigUuLXa2S5u2/ZMcARrrfqozfLuiEgkBJRmsbXUIcb3TibhQJOZrYpQRax+ihGunVKHaW6hDtI12tlI11tQdVjE63T2v1Uj0F4L8ZurqZ3D9bJeSFuanJ6t/L9F2BeOeGcYlwPH6LEInFpilaXW/LfX9F7CgmbUU0U8ZuyRge35EXWdiUiEIUBUJEIApEqRQFQhCkAQhCASGwBKW6QgOaQdiLIPJXG+Lf1fizEq27ix87gwHo0aD9lrTwNDfUq94uoZMM4mxGlkGV0c7xb0ubKgzW3K0gNBpt2smG5UtnOsA0lTtpZCLkA37KLqRaZtYlyRqE0garLdRy39wj1ISsw+Z5sGm59NVHnE/46wAS1Lf0V9T8MVs+vKcAe4VvTcD1DiM4AHXTVVvLmLTh1WlZQRoNU4REjZdNi4HpwwXBJ72T3cHU8YNgfsqX+iLz+dy90TuxTC0j5roFRwy2F5BBIWA/h+5/DaSfUJOaF4Gm5bbjRIAQVsdfhDoYi0M1HWy19zS1xBGoWuN+THeLlkUjTLM2MA3cQBbuvZuCQvp8Cw+GT346aNrvmGgLyFwrIIeJcNe8Ax+0xhwPYuC9ljZNKwIQhVCoSJUCFIlSIFQhCAQhCAQhCDzN40wti8QahzABzIY3G3U2tf9FqOF8Pz4hZ0YHyPRbl4uv9p8SatmpEcUTP/wAg/wArK4SpBHTNeRuFG9eOWvHnuocJ4PipxmnAkkPpoFaO4Zp3Hyst9LrYY230aFmwQfmXHd11yRrVNwhRg3fFnPqVaQ8OUcOrKdjT6BXzYgApA0BV8qdxSswxo2YAPQKUUQHRWhYBskLL6ontWmntsFFNEcl8t7eit8gUZjFj1Q7a5LStey7mWWM2kGoLPkVsMsIJ1CwpmZdES16qw6ORrszAR8ly3H6P2XEJA0WaTouyzAWK5xxlT5am9txe624ddaZcs7iLw3woYxxxhlI6+USCV1uzfN/C9arzV4IRNd4hNPVlLIRf6D+V6WC6tfXEEIQoBZCEqBE1OKaUCpUIQCEWQgEIWv4hxdQ0Fc6mMcspYbPcy2h7aqLekyW/Hn7xEmNR4l4uT8EoZ9gAtqwGNseFQ5eoutW8QpaabxCrqmkkEkNRkeCBbXKLg+twtswfyYNC/py7rPm9xvwm4pxRR4GQyV2aZwuGDW3qVWN8QWxsD3s1Pwjsq53C78UrZaqtkcHSOuLG9vT5KZ3CGHtbbO9pt3VJnPXtr3pc0fiVh77MmBYT1Ow+q2ujx2hro80M7HegcuQ13CojceTUNLezmqKgwiqoZg6GqLba6FRrOfxM7/Xb/aWaWKa6sYBuFpWDYnUSRmOe+caX7q3ldJyTvssumkzFu/E6eP3ngFVNfxhheHnLLVRh3YG5Wi437VO9wEhYDpvZao7BZZH3dKHEnclaZzP1TXc+Oj1PiThty2IOf6gLDHHtMJBzWHIexuQtVoOEY5CHTVAt2armThKl5AbAA6Q/E9xKt44Vnm2aDE6bEmc2llbJGe24PYrXOLadphZMf+pUeB4LPg2L35t4Xizmjb0WbxWy+FX/ACv/ALqJJNFvefZnguxx8SYyAcopZSbdtP8AC9Krzr4PYpQYNiOL19ZczclsUDGi5dc3Nvs1djwDjCHGq40ckHInLS5gzZswC6LqduW5v1s6EIUqBCEIBIlSKAqEIUgQhCAXBKmeoi4lrc0hdeU+UnTdd7XFOIaB1PxjVsLbAyZh8ib/ALFZ8nx0/wA3/VjUeK8K5xGIsFnMA5g9LrZcKaXYFA1v/tgLEx2ppzQSxEnM9pboFaYPEBhtMDuIx+yx1r02uOqwquQ0NNnFhbubLS6/G6id0ns/MqHMBc7L5WNA9eq6LXYS2siySDM3eyoZOHKemkJjYYyRY2Krmzv2tZ66jnDsbrpphG5gzE7Am6uaWWpZKIZQ5sh+F38FXT+H6WGUSRwgvBuCLqSLC3Syh74fMDcHW6vu5s9Ixmz7VngLXuqGNetwq6YNo3OA1DVV4Th5je17xZxsFsdWy9K8f8SsV7XHsVfLLUvcNgT9FQztqnU8tREwubGLlztt+gW81+GFxfZuZrj5gqp1A5l2CPyO0IWmUaz3GoUeJYhNVNhiDS4m1gLfsrzDseqI6oQSlzHA2cx5/Yq2pcEhbJzImCN212ixVhBw1SyOBkjzO7kaq+9Zs9KZzrP2spjvaYmuasTippGCOIG1rq9psPZSx5WjQbKs4mYH4S9p2u2/3Web7TYq8BoBQUDXht5pBnce3otr8PY3T8cMmLiSGuv/APUqmw+pilp2tAsSLBbZ4Z0LncQ1NTbyRRkX9Tp/dWz70nU8eOusIQhdTzioSBCATfsnJqgOQhCkCEIQC0Lj6gayqpa9o1cDG4/Lb9/0W+qh4woTXcPzBvvRESC3pof0Krqdxfj146lcWfSvlq5myDyhpdr1WwYQ4OoKb/o2/wBlG6EvpzcNElrZlHgshNGy+mW7fsubU9O/V7rY2NGWxSupo37gFQQyZutllZmi2qzGI7DY3uN2gfRI6jhiHlYAQsx0otcLCmldI4Mj94lE9VLC4ZgOyzqh16Zw9FgxROa4X3WTUXMNragIhQCNuYgjqpW4fE/XILps0MhOZnTWyyKGoEjb39FKwZh0bfhH2UhpmsbdosswP0WPNJ0UIYjha+llQ44GvpQw65pGC3/yCuZZN2qhxX8Soo4r+9MP0BP8K2fqKw6akMVc/lgiJvVdk4CoBS4B7Raz6l5edOg0H8rnHs5mfFFHbUgW7rtNFTNo6GCmbtFGGfYLfjz77Yf0b9SJ0IQtnIEISoEKanFNKgOQhCkCEIQCjnjE0EkR2e0tP1CkQg5BXUslJUy084LXxkgqmwaS7alt9pnWHpddsrsKocRAFXTMlt1IsfuFzHijDIcH4lkZTRiKCeJsjGt2BGh/ZY6x+urHL31ETJS2ykFTqq/m2I11Ty4kaLndUrKkq3OdkYVj+1/09zppQctt7JYnxQnM8jMe6hxCvphSuD7EAE6qIm2JqLiekqajKC6/TM0i/wB1YS4xAATcbd1yaux10GIlkDAGdAm1GOP5YdmJDh7pKv4VndZbs/iyjdWOZGXOF7XDTb7rKpnyF7nsBDXG9loOBYq2evyzMZl6aWst+pa6nbaMuGboms9LZ1KtIqlzmalNllBbvqsU1DC7yHXsmOedbqi1JO8E7qnmeHYvTZvdaxzvroFmTPOpW0+GlJFW1+KVE8TJWxsZFZ7QRckk/sFpid1jyb8Z2ZwrhUuI4tFLkPs8Dg97yNNNQF1JMihjhYGRRsjYPha2wT105z0497872EIQrKBCEqBE1OKRQFQhCkCEIQCEIQC0TxKoXuo6PEWbQPLJNOjtv1H6re1gY3h7cVwWsoTvNEWtPZ3Q/dRU5vV7cVimbPMyx0urOpbyqZxB2G61yjLYpACPPE4tdc63vZXb5xNA5ltwuPc6d+b20XF8crpHuyF7Y2m2xT4ny4hh7gJ2PeQBvqe626jwiAg52Alx1uFjVHDUFPK58LMocbnLpZMWX0v4tYpeHmOeZKyYZm6NypH8Lwuc3PVjlgWFt1fTYHWkf6acEflesIYRirZAHyRNHfUrX2vOHNVTeHPZagGKdvKBBu42Kbi1aaY5G1Dbk+XKdVfNw1/uzTvlcejdAsin4egY/nSxgu6AqL/7VLiT4p+HsVqH1DY57uzC1z3W5keS5GllUw4YyPEGygABo6KxqqpsbD8uix+1HxhVkwY1wadV1Pw9wv8Ap/DEczxaWscZ3d7HRv6C/wBVyWgp345jFNQxXD6iUNJts3qfoLr0FBCyngjhjGWONoY0dgBYLp4s9e3Lza79JEIQtnOEIQgEJUiASJU2ygOQjqhSBCEIBCEIBHRCEHnDihrsH4iq3OuIpp3Gw6OudFNRYq2aIOFtd9dla8W00WMz1wafLJM50bx01NiuaunqMLqPYpbgg3JvuubU8vTrzbOnT6KpEo0+YWd7QGts4X9Fr2AVjXwsDy1pI0CvKiBxF29dlj8bz2wK3FaakaXOcGqvjx+knP8AuD6rD4lweqrKbNE1xc3Ww6qjwrhXEZfPK0xtv8W6vL6T3Z6jd6esgeLxgFZD5DIAsakwl9LG1oGgCy5YuTDmcbKlv4msSaZsThmNjZUmJYnGxjwHXdbXVNx6t5THZXXsN1q1HFPjGIcppdywbyP7D0VsZ/WW9fjqfgzA6qxuur5W3DIMkZPQlwuR9rLtS5v4YRQ00lXDHZtom2HoD/ldIuurHxx8n/QQhCuoEqRCAQhCATU5NJQOQhCAQhCAQhCAVVxHiYwnAquqGr2xuyD1ssqsxKmomnmPu78jd1qOPVMmMUNTGRZronNa36K0z2rdSNBpSZsOge4+Z0Ydf5harxVg7qhgqoR+NHvb4gtqoLDDKZv5Y2t+oCJY2vBBAK4u+tO/rvLn1BjD4Mt9C3cX2W84bxPC+lZzHjMBr8+y0viTBX0pdWQi7XO8wHRa/BWSwtG41VvCa9xE1Z9d0ZiFLkBc5p0uTZMkxOJpGVoAXJWcRyMiaHSElttEtRxY97S1rrXGpVZx1f8AyR0Oq4nhgJaXDMbrVcS4tfVDIzytBtvutMqMSlqCXZiT37J1LBPWPDGMJJ62Vpx9fVLyd/GY+erxaqEMV3XOvYBbxguGx4fRiNou46ud3Kw8DwhlBDqAZHblXjNLhV1fyLZn6ssBxGeg4lpBC4jPG+/rbKux0NdFXQB7HDNbzN6griWAj2riUuGop4Tr6k/4W6xzy08rZIZCxzeoXXw47w4ufXW3QkLWqXikNs2si1/Oz+yvKbEKWrAMM7HHtfX7KbmxWalZKEIUJCEIQBTdOqcm3UByEIUgQdFiVuIQ0TfMcz+jButerMVqKq7S7ls/K1WmbVbqRd1eM01MS1pMsg+Fv91T1ONVdQCGERM7N3+6qm6E3Ke46E9lpMSM7u1EZRJMW5rnr6qcC2nTZQ0zAM0hGriprEFXUaFL/osVqqJ2ga8uZ/1OqHG5FisnjmmdTTUuKxjyg8qQjsdj/wCd1WU1SJWA33C87mz46enw78sRM+Nr2kOALT0KpsR4eoqlhLIwx3/HRXN7DdRk66LOWxrZHPKvhieEuIu8dFVTYNUNcMrCupPYHaOA1WM6ghLs1grzksVvHK0jDuHZH5TKdDuFt9BhsNHGAGi46qYxhmjQAAntcSQLqLu1MzIyGkBqZU1DYInP2KTPlGqqqzmVtRDRRk553hmnQdT9lSS29LXUk7bhwTTOFBLWye9UvzD5dP0Wzu1abdlFR0rKOihp2AAMaBYKcizD3Xq4z4zp5O9eWrWE2Uvc4OGoU7LAXBId6FY+W0p0tdZIYCBbdXqkqxo8braIgGTmx/leb/qtio8fpKkASEwv7O2+60032IBStddwbax7LO4lWm7HRmuDmgggg9QlWkUeJVFE8ct5LerHG4K2OixymqrNeeU/s46H6rLWLGs3KtE1LcEXCQhUWOVViWLtpwYoLOk6ncNWHiONGQGOAlrNi7qVSPlsdj9VpnH/AKz1v8iV0rpXlz3FzjqSVC7WSw2G6GFzuosn7FbMjel0yY2iIO50UljfXZY8nnmaOgQTgWjAUpGl0xw8ospAfL6hBgYrh8eK4XUUUgFpGkD0PQrlFFJLRVElFUAiWFxYR8l2TY3Wl8a8PGR39Yo2fiRj8Zo+Id1jzY8p6b8HJ466qpZJmF76pxIPoq+knErAQVmF3dcPi9HuHlv2THsdbdI2Ug6pXSiydHaBw03TI7X0SuzPNraJ+XKzsnR2hnkDGk3V3wZghmmdjFQzQXbCCPu7+FWYZh4xOsvK4Mo4iDM8mwt2v3K6Ozkx0zGU+URAWaGHSy6uDj7/ANq5f6OX14wlszjdMlNnsb13UrQOigb+JUSO6DQLrcJkjLSA20UgFk9zUz0QHRNezzteNCNNk9Nl2HzUBWvIPmb9k50oAsDqmh4+qYQ2990FzhmNy0oDH/iRdjuPktgjxihkYHGcMP5XDULTGgEahL8nEKlxKvN2JwLHXVQv8z/4Uz9AoR7yuonbsg6H0QNEHdAjjYGyhaPxQbKU6prG2N0ErtW6hK02cOxCQm7dEjr5LjcIEmnZFbM4AnQC60zi3iGqpMWpaKA2iNnSX+P0V/iEEz6puRuYSD7LU+LoGzY5TsjGd7WgOIHVa8UnftW1HV4UxoNdhmsJ1lhG8Z629FjjzNBV3RxPikhcHZbaOuNwo8XoGUs7ZYm2jk6DYFcn9HD1/tl2/wA/Nb/rpSuDgmXd2WeIw+xCf7NbouN2MSOMuG1lPBQSVk4YPLGPfedgFnUdEJ3nMS1jdXEC5+itTTPdFlYzlxAaNW/Dw3d7vxz83NMep9a5xE5kWHimomlkDOjfiPc+qk4PrKmPCJhK8lolAZmO17LPko2zlzC3MpsPoW4dFIyoDRDK6wI6HovTnjMeLz7bb2t6GvdUMe5wHl6jqsqBuWO/U6lY0NKKanZG03c43J9FmAWbZY6IV2oUZPROLvsoyblVSXZK7Vt0gulPu2QI5ozX7ppABUg2BTHi9yEEkeydoo4ipLtG5sgneoRvcdE+V1k1oBbdQJWkEJDuUjHapVIT5I6JnVSX00F1CDhpul3TPRPB0TtKvxKeoip+XTREyu0D+jR3VfR4YBBaYB898xf3V84B2h2TXRhrbhWmuoixTPpQzYD6hJLC2ogELwDroCrR8YkbtqsV1ETctOt/srdy/US2KCbDH0co+KM9U57GtbsriSKoYC1zRJGd7qqrYnU7c1iYz1Pw/NcnNw9e8u3h5+/Wj8IqvZ8Raw+7L5D8+it8RqGxw8th8ztNFr+FwOqKn2h/lghObN+YjYBZhL6iosd72+S1/nl8fbP+mzy9MyghHL1G6yaumbUxcotu3spIwI2AAbKRjxfVa2+3PEdNT8mJgLnEtGlzdSOPZD3i+iQa6qqRluDqkDQE++gSdEDbdkdNk610trXQIPdCR7fKU5h0IVjS0bHROc9zXZhaw1y/5UW9JkVcXVQSSF0hsTYG2iy5YvZi9udrrDdqxIW3jv311UjOm6FNYfL6JztaZhO6bHt9VCEjbXKU7JWjf0QUEPxKTpYJLapwGiAHqnXTdglB/dKFtdGtk4JCFAgtlclsCbgp8jRZRt0I1VkJQwWtosOtZT8h7ZgMpFj6rNGwWt4tUSHF+UbZGgWCvn2rfXwrBzhHBDGY6eMeVo6+pWZTUeQ53blSxtbHC3KALuAussqdXr1Cd36jt5U0gJ79ASmjVZrwmXuntBB3SJ7RogCmEbXTymvCAulagDRKN0CN0NlOyZ8IdkNszbH/AM7qI6ap27SoEEn/AKeS3YqOnF4Gn0Ukn+3K3pZRwawtUpf/2Q==	mochi	["mochi"]
user_1774800738010_tqctwms	abo najem	yosef.busness15@gmail.com	\N	student	google	BwfcHvWS5YUF6OsnQDjUp7s9tD63	light	t	2026-03-29 16:12:18.011268	110924	https://lh3.googleusercontent.com/a/ACg8ocK4B8JgWZr0aqHwg17HSt5_1lpzO6RcNNcsFJeBkW_vg5VF=s96-c	ember	["mochi", "ember"]
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wallets (user_id, balance, last_updated) FROM stdin;
user_1774801196830_z5m79ed	100	2026-03-29 16:19:56.835586
user_1774800738010_tqctwms	2	2026-03-29 17:44:28.865
\.


--
-- Name: conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.conversations_id_seq', 1, false);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- Name: ai_insights ai_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_pkey PRIMARY KEY (id);


--
-- Name: challenge_participants challenge_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_participants
    ADD CONSTRAINT challenge_participants_pkey PRIMARY KEY (id);


--
-- Name: challenges challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: motivation_messages motivation_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivation_messages
    ADD CONSTRAINT motivation_messages_pkey PRIMARY KEY (id);


--
-- Name: plants plants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT plants_pkey PRIMARY KEY (id);


--
-- Name: session_events session_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_events
    ADD CONSTRAINT session_events_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_provider_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_provider_id_unique UNIQUE (provider_id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (user_id);


--
-- Name: users_user_code_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_user_code_unique ON public.users USING btree (user_code) WHERE (user_code IS NOT NULL);


--
-- Name: messages messages_conversation_id_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict HWDD4KlT3BDmzBqMQgeEtjbquaQnF3yZEsdnPjqbfggPo7MANCK20J05UWfcNh9

