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
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA information_schema;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: fn_set_inputter_tms(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_set_inputter_tms() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        -- Set inputter_tms ke UTC jika kosong (PostgreSQL handles display via AT TIME ZONE)
        IF NEW.inputter_tms IS NULL THEN
          NEW.inputter_tms := NOW();
        END IF;
        
        -- Jika inputter NULL pada INSERT, ambil nickname dari admin (fallback ke System jika admin kosong)
        IF TG_OP = 'INSERT' AND NEW.inputter IS NULL THEN
          NEW.inputter := COALESCE((SELECT nickname FROM admin ORDER BY id ASC LIMIT 1), 'System');
        END IF;
        
        RETURN NEW;
      END;
    $$;


ALTER FUNCTION public.fn_set_inputter_tms() OWNER TO postgres;

--
-- Name: handle_asset_sale(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_asset_sale() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (NEW.kepemilikan = 'Dijual' OR NEW.kepemilikan = 'Telah Dijual') THEN
        NEW.status := 'Offline';
        -- NEW.condition := ''; -- User said "kosongkan condition"
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_asset_sale() OWNER TO postgres;

--
-- Name: insert_invoice_from_transaction(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.insert_invoice_from_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        -- Only auto-create invoice for 'pemasukan' transactions
        IF NEW.keterangan = 'pemasukan' THEN
          INSERT INTO invoices (
            customer_id,
            amount,
            due_date,
            status,
            node
          ) VALUES (
            -- Extract customer ID from TRX format e.g. 'TRX-CT057-20260502'
            SPLIT_PART(NEW.id, '-', 2),
            -- amount is already NUMERIC — use directly (no REPLACE needed)
            NEW.amount,
            -- Use date from transaction timestamp
            NEW.timestamp::date,
            'Paid',
            -- node from city
            NEW.city
          );
        END IF;
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.insert_invoice_from_transaction() OWNER TO postgres;

--
-- Name: log_inactive_customer(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_inactive_customer() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Memastikan HANYA perubahan dari 'Active' menjadi 'Inactive'
    IF OLD.status = 'Active' AND NEW.status = 'Inactive' THEN
        INSERT INTO inactive_cust (
            id, name, no_telp, service, address, village, district, city, province, status, createdat, inactiveat
        ) VALUES (
            NEW.id,
            NEW.name,
            NEW.no_telp,
            NEW.service,
            NEW.address,
            NEW.village,
            NEW.district,
            NEW.city,
            NEW.province,
            NEW.status,
            NEW."createdAt"::timestamptz,
            CURRENT_TIMESTAMP
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.log_inactive_customer() OWNER TO postgres;

--
-- Name: notify_asset_condition(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notify_asset_condition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        IF (LOWER(NEW.condition) != 'good' AND (TG_OP = 'INSERT' OR OLD.condition != NEW.condition) AND (LOWER(NEW.kepemilikan) IN ('dimiliki', 'sewa') OR NEW.kepemilikan IS NULL)) THEN
          INSERT INTO notifications (category, title, message, type, is_unread, action_label)
          VALUES (
            'Inventory',
            'Hardware ' || NEW.sn || ' reported ' || NEW.condition,
            'Asset type ' || NEW.type || ' at ' || NEW.location || ' requires attention. Condition changed to: ' || NEW.condition,
            'hardware',
            true,
            CASE 
              WHEN LOWER(NEW.condition) = 'broken' THEN 'Schedule Dispatch' 
              WHEN LOWER(NEW.condition) = 'warning' THEN 'Schedule Dispatch'
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

--
-- Name: refresh_predictive_metrics(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_predictive_metrics() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY predictive_metrics_mv;
END;
$$;


ALTER FUNCTION public.refresh_predictive_metrics() OWNER TO postgres;

--
-- Name: sync_transaction_to_expense(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_transaction_to_expense() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.keterangan = 'pengeluaran' THEN
        INSERT INTO expenses (category, amount, date, description, city)
        VALUES (
            NEW.type,
            CAST(REPLACE(REPLACE(REPLACE(NEW.amount, 'Rp ', ''), '.', ''), ',', '') AS NUMERIC),
            NEW.timestamp::date,
            NEW.id,
            NEW.city
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_transaction_to_expense() OWNER TO postgres;

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
    nickname text,
    inputter character varying(255),
    inputter_tms timestamp with time zone DEFAULT CURRENT_TIMESTAMP
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
    no_telp text,
    inputter character varying(255),
    inputter_tms timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "createdAt" timestamp with time zone,
    is_vip boolean DEFAULT false
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: service_tiers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_tiers (
    id integer NOT NULL,
    name text,
    speed text,
    unit text,
    fup text,
    type text,
    icon text,
    inputter character varying(255),
    inputter_tms timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    price numeric
);


ALTER TABLE public.service_tiers OWNER TO postgres;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id text,
    method text,
    amount numeric(15,2),
    status text,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    type text,
    keterangan text,
    city text,
    inputter character varying(255),
    inputter_tms timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: ar_aging_mv; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.ar_aging_mv AS
 WITH customerexpectedinvoices AS (
         SELECT c.id AS customer_id,
            c.village AS node,
            COALESCE(st.price, (0)::numeric) AS expected_amount,
            (generate_series((((date_trunc('month'::text, (c."createdAt" AT TIME ZONE 'Asia/Jakarta'::text)))::date + ((EXTRACT(day FROM (c."createdAt" AT TIME ZONE 'Asia/Jakarta'::text)) - (1)::numeric))::integer))::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone, '1 mon'::interval))::date AS virtual_due_date
           FROM (public.customers c
             LEFT JOIN public.service_tiers st ON ((TRIM(BOTH FROM c.service) ~~* st.name)))
          WHERE (c.status = 'Active'::text)
        ), unpaidinvoices AS (
         SELECT cei.node,
            cei.virtual_due_date,
            cei.expected_amount
           FROM customerexpectedinvoices cei
          WHERE ((NOT (EXISTS ( SELECT 1
                   FROM public.transactions t
                  WHERE ((split_part(t.id, '-'::text, 2) = cei.customer_id) AND (t.keterangan = 'pemasukan'::text) AND (t.status = 'Verified'::text) AND (EXTRACT(month FROM (t."timestamp" AT TIME ZONE 'Asia/Jakarta'::text)) = EXTRACT(month FROM cei.virtual_due_date)) AND (EXTRACT(year FROM (t."timestamp" AT TIME ZONE 'Asia/Jakarta'::text)) = EXTRACT(year FROM cei.virtual_due_date)))))) AND (cei.virtual_due_date <= CURRENT_DATE))
        )
 SELECT node AS "NODE",
    sum(
        CASE
            WHEN ((CURRENT_DATE - virtual_due_date) <= 30) THEN expected_amount
            ELSE (0)::numeric
        END) AS "REAL 0-30 DAYS",
    sum(
        CASE
            WHEN (((CURRENT_DATE - virtual_due_date) >= 31) AND ((CURRENT_DATE - virtual_due_date) <= 60)) THEN expected_amount
            ELSE (0)::numeric
        END) AS "REAL 31-60 DAYS",
    sum(
        CASE
            WHEN (((CURRENT_DATE - virtual_due_date) >= 61) AND ((CURRENT_DATE - virtual_due_date) <= 90)) THEN expected_amount
            ELSE (0)::numeric
        END) AS "REAL 61-90 DAYS",
    sum(
        CASE
            WHEN ((CURRENT_DATE - virtual_due_date) > 90) THEN expected_amount
            ELSE (0)::numeric
        END) AS "REAL 90+ DAYS"
   FROM unpaidinvoices
  GROUP BY node
  ORDER BY (sum(
        CASE
            WHEN ((CURRENT_DATE - virtual_due_date) > 90) THEN expected_amount
            ELSE (0)::numeric
        END)) DESC
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.ar_aging_mv OWNER TO postgres;

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
    tanggal_perubahan timestamp with time zone,
    inputter character varying(255),
    inputter_tms timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    harga_beli numeric,
    province text
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
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    category text,
    amount numeric(15,2),
    date timestamp with time zone DEFAULT CURRENT_DATE,
    description text,
    city text,
    inputter character varying(255),
    inputter_tms timestamp with time zone DEFAULT CURRENT_TIMESTAMP
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
-- Name: inactive_cust; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inactive_cust (
    id text,
    name text,
    no_telp text,
    service text,
    address text,
    village text,
    district text,
    city text,
    province text,
    status text,
    createdat timestamp with time zone,
    inactiveat timestamp with time zone,
    inputter character varying(255),
    inputter_tms timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.inactive_cust OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    customer_id character varying(50) NOT NULL,
    amount numeric(15,2) NOT NULL,
    due_date date NOT NULL,
    status character varying(20) DEFAULT 'Unpaid'::character varying NOT NULL,
    node text,
    inputter character varying(255),
    inputter_tms timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: login_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.login_logs (
    id integer NOT NULL,
    admin_id integer,
    nickname character varying(255),
    login_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying(45),
    inputter character varying(255),
    inputter_tms timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.login_logs OWNER TO postgres;

--
-- Name: login_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.login_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.login_logs_id_seq OWNER TO postgres;

--
-- Name: login_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.login_logs_id_seq OWNED BY public.login_logs.id;


--
-- Name: maintenance_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_history (
    id integer NOT NULL,
    asset_id integer,
    description text NOT NULL,
    technician_name text NOT NULL,
    date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    inputter character varying(255),
    inputter_tms timestamp with time zone DEFAULT CURRENT_TIMESTAMP
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
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_hidden boolean DEFAULT false,
    inputter character varying(255),
    inputter_tms timestamp with time zone DEFAULT CURRENT_TIMESTAMP
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
    date timestamp with time zone,
    amount numeric(15,2),
    reference text,
    inputter character varying(255),
    inputter_tms timestamp with time zone DEFAULT CURRENT_TIMESTAMP
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
-- Name: password_resets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_resets (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    inputter character varying(255)
);


ALTER TABLE public.password_resets OWNER TO postgres;

--
-- Name: password_resets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_resets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_resets_id_seq OWNER TO postgres;

--
-- Name: password_resets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_resets_id_seq OWNED BY public.password_resets.id;


--
-- Name: predictive_metrics_mv; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.predictive_metrics_mv AS
 WITH monthseries AS (
         SELECT to_char(generate_series((date_trunc('month'::text, ( SELECT min((customers."createdAt" AT TIME ZONE 'Asia/Jakarta'::text)) AS min
                   FROM public.customers)))::timestamp with time zone, date_trunc('month'::text, now()), '1 mon'::interval), 'YYYY-MM'::text) AS month
        ), monthlyrevenue AS (
         SELECT to_char((t."timestamp" AT TIME ZONE 'Asia/Jakarta'::text), 'YYYY-MM'::text) AS month,
            COALESCE(sum((t.amount)::numeric), (0)::numeric) AS total_revenue
           FROM public.transactions t
          WHERE ((t.keterangan = 'pemasukan'::text) AND (t.status = 'Verified'::text))
          GROUP BY (to_char((t."timestamp" AT TIME ZONE 'Asia/Jakarta'::text), 'YYYY-MM'::text))
        ), monthlyexpenses AS (
         SELECT to_char((t."timestamp" AT TIME ZONE 'Asia/Jakarta'::text), 'YYYY-MM'::text) AS month,
            COALESCE(sum((t.amount)::numeric), (0)::numeric) AS total_expenses
           FROM public.transactions t
          WHERE ((t.keterangan = 'pengeluaran'::text) AND (t.status = 'Verified'::text))
          GROUP BY (to_char((t."timestamp" AT TIME ZONE 'Asia/Jakarta'::text), 'YYYY-MM'::text))
        ), monthlycustomersnapshot AS (
         SELECT to_char((c."createdAt" AT TIME ZONE 'Asia/Jakarta'::text), 'YYYY-MM'::text) AS join_month,
            count(*) AS new_customers
           FROM public.customers c
          GROUP BY (to_char((c."createdAt" AT TIME ZONE 'Asia/Jakarta'::text), 'YYYY-MM'::text))
        ), monthlychurn AS (
         SELECT to_char((c."createdAt" AT TIME ZONE 'Asia/Jakarta'::text), 'YYYY-MM'::text) AS month,
            count(
                CASE
                    WHEN (c.status = 'Inactive'::text) THEN 1
                    ELSE NULL::integer
                END) AS churned_customers,
            count(*) AS total_customers_that_month
           FROM public.customers c
          GROUP BY (to_char((c."createdAt" AT TIME ZONE 'Asia/Jakarta'::text), 'YYYY-MM'::text))
        ), cumulativeactivecustomers AS (
         SELECT ms_1.month,
            COALESCE(( SELECT count(*) AS count
                   FROM public.customers c
                  WHERE ((to_char((c."createdAt" AT TIME ZONE 'Asia/Jakarta'::text), 'YYYY-MM'::text) <= ms_1.month) AND (c.status = 'Active'::text))), (0)::bigint) AS active_customers,
            COALESCE(( SELECT count(*) AS count
                   FROM public.customers c
                  WHERE (to_char((c."createdAt" AT TIME ZONE 'Asia/Jakarta'::text), 'YYYY-MM'::text) <= ms_1.month)), (0)::bigint) AS total_customers
           FROM monthseries ms_1
        )
 SELECT ms.month,
    row_number() OVER (ORDER BY ms.month) AS month_index,
    COALESCE(mr.total_revenue, (0)::numeric) AS revenue,
    COALESCE(me.total_expenses, (0)::numeric) AS expenses,
    (COALESCE(mr.total_revenue, (0)::numeric) - COALESCE(me.total_expenses, (0)::numeric)) AS net_profit,
    cac.active_customers,
    cac.total_customers,
        CASE
            WHEN (COALESCE(mch.total_customers_that_month, (0)::bigint) > 0) THEN round((((COALESCE(mch.churned_customers, (0)::bigint))::numeric / (mch.total_customers_that_month)::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS churn_rate,
    COALESCE(mch.churned_customers, (0)::bigint) AS churned_count,
    COALESCE(mcs.new_customers, (0)::bigint) AS new_customers,
    (now() AT TIME ZONE 'Asia/Jakarta'::text) AS last_refreshed_at
   FROM (((((monthseries ms
     LEFT JOIN monthlyrevenue mr ON ((ms.month = mr.month)))
     LEFT JOIN monthlyexpenses me ON ((ms.month = me.month)))
     LEFT JOIN monthlycustomersnapshot mcs ON ((ms.month = mcs.join_month)))
     LEFT JOIN monthlychurn mch ON ((ms.month = mch.month)))
     LEFT JOIN cumulativeactivecustomers cac ON ((ms.month = cac.month)))
  ORDER BY ms.month
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.predictive_metrics_mv OWNER TO postgres;

--
-- Name: provinces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.provinces (
    id integer NOT NULL,
    province character varying(26) NOT NULL
);


ALTER TABLE public.provinces OWNER TO postgres;

--
-- Name: regencies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.regencies (
    id integer NOT NULL,
    province_id integer NOT NULL,
    regency character varying(31) NOT NULL,
    type character varying(11) DEFAULT NULL::character varying
);


ALTER TABLE public.regencies OWNER TO postgres;

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
    tanggal_perubahan timestamp with time zone,
    is_used text,
    inputter character varying(255),
    inputter_tms timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    harga_beli numeric,
    province text
);


ALTER TABLE public.stock_asset_roster OWNER TO postgres;

--
-- Name: warehouse_location; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouse_location (
    id integer NOT NULL,
    location text,
    latitude text,
    longitude text,
    city text,
    inputter character varying(255),
    inputter_tms timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.warehouse_location OWNER TO postgres;

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
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: login_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_logs ALTER COLUMN id SET DEFAULT nextval('public.login_logs_id_seq'::regclass);


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
-- Name: password_resets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets ALTER COLUMN id SET DEFAULT nextval('public.password_resets_id_seq'::regclass);


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
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: login_logs login_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_logs
    ADD CONSTRAINT login_logs_pkey PRIMARY KEY (id);


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
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: provinces provinces_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provinces
    ADD CONSTRAINT provinces_pkey PRIMARY KEY (id);


--
-- Name: regencies regencies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regencies
    ADD CONSTRAINT regencies_pkey PRIMARY KEY (id);


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
-- Name: warehouse_location warehouse_location_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_location
    ADD CONSTRAINT warehouse_location_pkey PRIMARY KEY (id);


--
-- Name: idx_asset_roster_condition_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_roster_condition_status ON public.asset_roster USING btree (condition, status);


--
-- Name: idx_asset_roster_coordinates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_roster_coordinates ON public.asset_roster USING btree (latitude, longitude);


--
-- Name: idx_asset_roster_kepemilikan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_roster_kepemilikan ON public.asset_roster USING btree (kepemilikan);


--
-- Name: idx_asset_roster_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_roster_type ON public.asset_roster USING btree (type);


--
-- Name: idx_customers_createdat; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customers_createdat ON public.customers USING btree ("createdAt");


--
-- Name: idx_customers_createdat_wib; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customers_createdat_wib ON public.customers USING btree (("createdAt" AT TIME ZONE 'Asia/Jakarta'::text));


--
-- Name: idx_customers_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_customers_id ON public.customers USING btree (id);


--
-- Name: idx_customers_name_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customers_name_trgm ON public.customers USING gin (name information_schema.gin_trgm_ops);


--
-- Name: idx_customers_regional; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customers_regional ON public.customers USING btree (province, city, district);


--
-- Name: idx_customers_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customers_status ON public.customers USING btree (status);


--
-- Name: idx_expenses_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_date ON public.expenses USING btree (date);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (is_unread, created_at DESC);


--
-- Name: idx_ocr_data_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ocr_data_date ON public.ocr_data USING btree (date);


--
-- Name: idx_stock_asset_condition; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_asset_condition ON public.stock_asset_roster USING btree (condition);


--
-- Name: idx_stock_asset_is_used; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_asset_is_used ON public.stock_asset_roster USING btree (is_used);


--
-- Name: idx_stock_asset_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_asset_type ON public.stock_asset_roster USING btree (type);


--
-- Name: idx_transactions_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_customer_id ON public.transactions USING btree (split_part(id, '-'::text, 2));


--
-- Name: idx_transactions_customer_id_func; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_customer_id_func ON public.transactions USING btree (split_part(id, '-'::text, 2));


--
-- Name: idx_transactions_keterangan_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_keterangan_status ON public.transactions USING btree (keterangan, status);


--
-- Name: idx_transactions_timestamp_wib; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_timestamp_wib ON public.transactions USING btree (("timestamp" AT TIME ZONE 'Asia/Jakarta'::text));


--
-- Name: idx_transactions_type_method; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_type_method ON public.transactions USING btree (type, method);


--
-- Name: predictive_metrics_mv_month_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX predictive_metrics_mv_month_idx ON public.predictive_metrics_mv USING btree (month);


--
-- Name: regencies_province_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX regencies_province_id_idx ON public.regencies USING btree (province_id);


--
-- Name: admin trg_admin_inputter_tms; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_admin_inputter_tms BEFORE INSERT OR UPDATE ON public.admin FOR EACH ROW EXECUTE FUNCTION public.fn_set_inputter_tms();


--
-- Name: asset_roster trg_asset_notification; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_asset_notification AFTER INSERT OR UPDATE ON public.asset_roster FOR EACH ROW EXECUTE FUNCTION public.notify_asset_condition();


--
-- Name: asset_roster trg_asset_roster_inputter_tms; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_asset_roster_inputter_tms BEFORE INSERT OR UPDATE ON public.asset_roster FOR EACH ROW EXECUTE FUNCTION public.fn_set_inputter_tms();


--
-- Name: asset_roster trg_asset_sale; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_asset_sale BEFORE INSERT OR UPDATE ON public.asset_roster FOR EACH ROW EXECUTE FUNCTION public.handle_asset_sale();


--
-- Name: customers trg_customers_inputter_tms; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_customers_inputter_tms BEFORE INSERT OR UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.fn_set_inputter_tms();


--
-- Name: expenses trg_expenses_inputter_tms; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_expenses_inputter_tms BEFORE INSERT OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.fn_set_inputter_tms();


--
-- Name: customers trg_inactive_customer; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_inactive_customer AFTER UPDATE ON public.customers FOR EACH ROW WHEN (((old.status = 'Active'::text) AND (new.status = 'Inactive'::text))) EXECUTE FUNCTION public.log_inactive_customer();


--
-- Name: transactions trg_insert_invoice_on_pemasukan; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_insert_invoice_on_pemasukan AFTER INSERT ON public.transactions FOR EACH ROW WHEN ((new.keterangan = 'pemasukan'::text)) EXECUTE FUNCTION public.insert_invoice_from_transaction();


--
-- Name: invoices trg_invoices_inputter_tms; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_invoices_inputter_tms BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.fn_set_inputter_tms();


--
-- Name: login_logs trg_login_logs_inputter_tms; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_login_logs_inputter_tms BEFORE INSERT OR UPDATE ON public.login_logs FOR EACH ROW EXECUTE FUNCTION public.fn_set_inputter_tms();


--
-- Name: maintenance_history trg_maintenance_history_inputter_tms; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_maintenance_history_inputter_tms BEFORE INSERT OR UPDATE ON public.maintenance_history FOR EACH ROW EXECUTE FUNCTION public.fn_set_inputter_tms();


--
-- Name: transactions trg_new_transaction; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_new_transaction AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.notify_new_transaction();


--
-- Name: notifications trg_notifications_inputter_tms; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_notifications_inputter_tms BEFORE INSERT OR UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.fn_set_inputter_tms();


--
-- Name: ocr_data trg_ocr_data_inputter_tms; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ocr_data_inputter_tms BEFORE INSERT OR UPDATE ON public.ocr_data FOR EACH ROW EXECUTE FUNCTION public.fn_set_inputter_tms();


--
-- Name: stock_asset_roster trg_stock_asset_roster_inputter_tms; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_stock_asset_roster_inputter_tms BEFORE INSERT OR UPDATE ON public.stock_asset_roster FOR EACH ROW EXECUTE FUNCTION public.fn_set_inputter_tms();


--
-- Name: transactions trg_transactions_inputter_tms; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_transactions_inputter_tms BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.fn_set_inputter_tms();


--
-- Name: login_logs login_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_logs
    ADD CONSTRAINT login_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin(id);


--
-- Name: maintenance_history maintenance_history_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_history
    ADD CONSTRAINT maintenance_history_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset_roster(id);


--
-- Name: regencies regencies_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regencies
    ADD CONSTRAINT regencies_ibfk_1 FOREIGN KEY (province_id) REFERENCES public.provinces(id);


--
-- PostgreSQL database dump complete
--

