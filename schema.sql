--
-- PostgreSQL database dump
--

-- Dumped from database version 16.3
-- Dumped by pg_dump version 16.3

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

--
-- Name: notify_asset_condition(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notify_asset_condition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        -- Hanya buat notifikasi jika kondisi bukan 'Good' DAN Kepemilikan adalah 'Dimiliki'
        IF (NEW.condition != 'Good' AND (NEW.kepemilikan = 'Dimiliki' OR NEW.kepemilikan IS NULL)) THEN
          INSERT INTO notifications (category, title, message, type, is_unread, action_label)
          VALUES (
            'Inventory',
            'Hardware ' || NEW.sn || ' reported ' || LOWER(NEW.condition),
            'Asset type ' || NEW.type || ' at ' || NEW.location || ' requires attention. Condition: ' || NEW.condition,
            'hardware',
            true,
            CASE 
              WHEN NEW.condition = 'Broken' THEN 'Schedule Dispatch' 
              WHEN NEW.condition = 'Warning' THEN 'Schedule Dispatch'
              ELSE 'Log Maintenance' 
            END
          );
        END IF;
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.notify_asset_condition() OWNER TO postgres;

--
-- Name: notify_new_transaction(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notify_new_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        IF NEW.keterangan = 'pengeluaran' THEN
          INSERT INTO notifications (category, title, message, type, is_unread, action_label)
          VALUES (
            'Finance',
            'New expense recorded',
            'Outgoing expense of ' || NEW.amount || ' via ' || NEW.method || ' has been logged.',
            'transaction',
            true,
            'View Details'
          );
        ELSE
          INSERT INTO notifications (category, title, message, type, is_unread, action_label)
          VALUES (
            'Finance',
            'New transaction detected',
            'Incoming payment of ' || NEW.amount || ' via ' || NEW.method || ' has been logged.',
            'transaction',
            true,
            'View Details'
          );
        END IF;
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.notify_new_transaction() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin (
    id integer NOT NULL,
    nama character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(100) NOT NULL,
    department character varying(100) NOT NULL,
    image text,
    nickname text
);


ALTER TABLE public.admin OWNER TO postgres;

--
-- Name: admin_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_id_seq OWNER TO postgres;

--
-- Name: admin_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_id_seq OWNED BY public.admin.id;


--
-- Name: asset_roster; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_roster (
    id integer NOT NULL,
    sn text,
    mac text,
    type text,
    location text,
    condition text,
    color text,
    latitude double precision,
    longitude double precision,
    status text DEFAULT 'Online'::text,
    kepemilikan text DEFAULT 'Dimiliki'::text,
    tanggal_perubahan text
);


ALTER TABLE public.asset_roster OWNER TO postgres;

--
-- Name: asset_roster_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asset_roster_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asset_roster_id_seq OWNER TO postgres;

--
-- Name: asset_roster_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asset_roster_id_seq OWNED BY public.asset_roster.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id text,
    name text,
    service text,
    address text,
    village text,
    district text,
    city text,
    province text,
    status text,
    "createdAt" text,
    no_telp text
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    category text,
    amount numeric,
    date date DEFAULT CURRENT_DATE,
    description text,
    city text
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expenses_id_seq OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: maintenance_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_history (
    id integer NOT NULL,
    asset_id integer,
    description text NOT NULL,
    technician_name text NOT NULL,
    date timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.maintenance_history OWNER TO postgres;

--
-- Name: maintenance_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.maintenance_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenance_history_id_seq OWNER TO postgres;

--
-- Name: maintenance_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.maintenance_history_id_seq OWNED BY public.maintenance_history.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    category character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50) NOT NULL,
    is_unread boolean DEFAULT true,
    action_label character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: ocr_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ocr_data (
    id integer NOT NULL,
    image text,
    confidence text,
    vendor text,
    date text,
    amount text,
    reference text
);


ALTER TABLE public.ocr_data OWNER TO postgres;

--
-- Name: ocr_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ocr_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ocr_data_id_seq OWNER TO postgres;

--
-- Name: ocr_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ocr_data_id_seq OWNED BY public.ocr_data.id;


--
-- Name: service_tiers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_tiers (
    id integer NOT NULL,
    name text,
    speed text,
    unit text,
    price text,
    fup text,
    type text,
    icon text
);


ALTER TABLE public.service_tiers OWNER TO postgres;

--
-- Name: service_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.service_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.service_tiers_id_seq OWNER TO postgres;

--
-- Name: service_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.service_tiers_id_seq OWNED BY public.service_tiers.id;


--
-- Name: stock_asset_roster; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_asset_roster (
    id integer DEFAULT nextval('public.asset_roster_id_seq'::regclass) NOT NULL,
    sn text,
    mac text,
    type text,
    location text,
    condition text,
    color text,
    latitude double precision,
    longitude double precision,
    status text DEFAULT 'Online'::text,
    kepemilikan text DEFAULT 'Dimiliki'::text,
    tanggal_perubahan text,
    is_used text
);


ALTER TABLE public.stock_asset_roster OWNER TO postgres;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id text,
    method text,
    amount text,
    status text,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    type text,
    keterangan text,
    city text
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: admin id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin ALTER COLUMN id SET DEFAULT nextval('public.admin_id_seq'::regclass);


--
-- Name: asset_roster id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_roster ALTER COLUMN id SET DEFAULT nextval('public.asset_roster_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: maintenance_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_history ALTER COLUMN id SET DEFAULT nextval('public.maintenance_history_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: ocr_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ocr_data ALTER COLUMN id SET DEFAULT nextval('public.ocr_data_id_seq'::regclass);


--
-- Name: service_tiers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_tiers ALTER COLUMN id SET DEFAULT nextval('public.service_tiers_id_seq'::regclass);


--
-- Name: admin admin_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin
    ADD CONSTRAINT admin_email_key UNIQUE (email);


--
-- Name: admin admin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin
    ADD CONSTRAINT admin_pkey PRIMARY KEY (id);


--
-- Name: asset_roster asset_roster_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_roster
    ADD CONSTRAINT asset_roster_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: maintenance_history maintenance_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_history
    ADD CONSTRAINT maintenance_history_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: ocr_data ocr_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ocr_data
    ADD CONSTRAINT ocr_data_pkey PRIMARY KEY (id);


--
-- Name: service_tiers service_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_tiers
    ADD CONSTRAINT service_tiers_pkey PRIMARY KEY (id);


--
-- Name: stock_asset_roster stock_asset_roster_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_asset_roster
    ADD CONSTRAINT stock_asset_roster_pkey PRIMARY KEY (id);


--
-- Name: asset_roster trg_asset_notification; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_asset_notification AFTER INSERT OR UPDATE ON public.asset_roster FOR EACH ROW EXECUTE FUNCTION public.notify_asset_condition();


--
-- Name: transactions trg_new_transaction; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_new_transaction AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.notify_new_transaction();


--
-- Name: maintenance_history maintenance_history_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_history
    ADD CONSTRAINT maintenance_history_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset_roster(id);


--
-- PostgreSQL database dump complete
--

