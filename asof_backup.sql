--
-- PostgreSQL database dump
--

\restrict 7ER6kcgLvuYjvIEwDCHSfl0LP8gFhBSbfVcoaaMJlcAtCa9Fa7zG6q3130ZAXK9

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

--
-- Name: stripe; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA stripe;


ALTER SCHEMA stripe OWNER TO postgres;

--
-- Name: invoice_status; Type: TYPE; Schema: stripe; Owner: postgres
--

CREATE TYPE stripe.invoice_status AS ENUM (
    'draft',
    'open',
    'paid',
    'uncollectible',
    'void',
    'deleted'
);


ALTER TYPE stripe.invoice_status OWNER TO postgres;

--
-- Name: pricing_tiers; Type: TYPE; Schema: stripe; Owner: postgres
--

CREATE TYPE stripe.pricing_tiers AS ENUM (
    'graduated',
    'volume'
);


ALTER TYPE stripe.pricing_tiers OWNER TO postgres;

--
-- Name: pricing_type; Type: TYPE; Schema: stripe; Owner: postgres
--

CREATE TYPE stripe.pricing_type AS ENUM (
    'one_time',
    'recurring'
);


ALTER TYPE stripe.pricing_type OWNER TO postgres;

--
-- Name: subscription_schedule_status; Type: TYPE; Schema: stripe; Owner: postgres
--

CREATE TYPE stripe.subscription_schedule_status AS ENUM (
    'not_started',
    'active',
    'completed',
    'released',
    'canceled'
);


ALTER TYPE stripe.subscription_schedule_status OWNER TO postgres;

--
-- Name: subscription_status; Type: TYPE; Schema: stripe; Owner: postgres
--

CREATE TYPE stripe.subscription_status AS ENUM (
    'trialing',
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'unpaid',
    'paused'
);


ALTER TYPE stripe.subscription_status OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new._updated_at = now();
  return NEW;
end;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: set_updated_at_metadata(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at_metadata() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return NEW;
end;
$$;


ALTER FUNCTION public.set_updated_at_metadata() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: code_analyses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.code_analyses (
    id integer NOT NULL,
    code_snippet text NOT NULL,
    risk_level text NOT NULL,
    summary text NOT NULL,
    tier text NOT NULL,
    fingerprint text,
    session_id text,
    "timestamp" timestamp without time zone DEFAULT now(),
    full_data jsonb
);


ALTER TABLE public.code_analyses OWNER TO postgres;

--
-- Name: code_analyses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.code_analyses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.code_analyses_id_seq OWNER TO postgres;

--
-- Name: code_analyses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.code_analyses_id_seq OWNED BY public.code_analyses.id;


--
-- Name: free_trials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.free_trials (
    id integer NOT NULL,
    fingerprint text NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.free_trials OWNER TO postgres;

--
-- Name: free_trials_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.free_trials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.free_trials_id_seq OWNER TO postgres;

--
-- Name: free_trials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.free_trials_id_seq OWNED BY public.free_trials.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    stripe_session_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    amount integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    tier text DEFAULT 'lite'::text NOT NULL,
    consumed boolean DEFAULT false NOT NULL,
    analysis_id integer,
    customer_email text
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: signals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.signals (
    id integer NOT NULL,
    agent_id text NOT NULL,
    payload jsonb NOT NULL,
    insight text NOT NULL,
    confidence real NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.signals OWNER TO postgres;

--
-- Name: signals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.signals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.signals_id_seq OWNER TO postgres;

--
-- Name: signals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.signals_id_seq OWNED BY public.signals.id;


--
-- Name: _managed_webhooks; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe._managed_webhooks (
    id text NOT NULL,
    object text,
    url text NOT NULL,
    enabled_events jsonb NOT NULL,
    description text,
    enabled boolean,
    livemode boolean,
    metadata jsonb,
    secret text NOT NULL,
    status text,
    api_version text,
    created integer,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_synced_at timestamp with time zone,
    account_id text NOT NULL
);


ALTER TABLE stripe._managed_webhooks OWNER TO postgres;

--
-- Name: _migrations; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe._migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE stripe._migrations OWNER TO postgres;

--
-- Name: _sync_status; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe._sync_status (
    id integer NOT NULL,
    resource text NOT NULL,
    status text DEFAULT 'idle'::text,
    last_synced_at timestamp with time zone DEFAULT now(),
    last_incremental_cursor timestamp with time zone,
    error_message text,
    updated_at timestamp with time zone DEFAULT now(),
    account_id text NOT NULL,
    CONSTRAINT _sync_status_status_check CHECK ((status = ANY (ARRAY['idle'::text, 'running'::text, 'complete'::text, 'error'::text])))
);


ALTER TABLE stripe._sync_status OWNER TO postgres;

--
-- Name: _sync_status_id_seq; Type: SEQUENCE; Schema: stripe; Owner: postgres
--

CREATE SEQUENCE stripe._sync_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE stripe._sync_status_id_seq OWNER TO postgres;

--
-- Name: _sync_status_id_seq; Type: SEQUENCE OWNED BY; Schema: stripe; Owner: postgres
--

ALTER SEQUENCE stripe._sync_status_id_seq OWNED BY stripe._sync_status.id;


--
-- Name: accounts; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.accounts (
    _raw_data jsonb NOT NULL,
    first_synced_at timestamp with time zone DEFAULT now() NOT NULL,
    _last_synced_at timestamp with time zone DEFAULT now() NOT NULL,
    _updated_at timestamp with time zone DEFAULT now() NOT NULL,
    business_name text GENERATED ALWAYS AS (((_raw_data -> 'business_profile'::text) ->> 'name'::text)) STORED,
    email text GENERATED ALWAYS AS ((_raw_data ->> 'email'::text)) STORED,
    type text GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
    charges_enabled boolean GENERATED ALWAYS AS (((_raw_data ->> 'charges_enabled'::text))::boolean) STORED,
    payouts_enabled boolean GENERATED ALWAYS AS (((_raw_data ->> 'payouts_enabled'::text))::boolean) STORED,
    details_submitted boolean GENERATED ALWAYS AS (((_raw_data ->> 'details_submitted'::text))::boolean) STORED,
    country text GENERATED ALWAYS AS ((_raw_data ->> 'country'::text)) STORED,
    default_currency text GENERATED ALWAYS AS ((_raw_data ->> 'default_currency'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    api_key_hashes text[] DEFAULT '{}'::text[],
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.accounts OWNER TO postgres;

--
-- Name: active_entitlements; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.active_entitlements (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    feature text GENERATED ALWAYS AS ((_raw_data ->> 'feature'::text)) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    lookup_key text GENERATED ALWAYS AS ((_raw_data ->> 'lookup_key'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.active_entitlements OWNER TO postgres;

--
-- Name: charges; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.charges (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    paid boolean GENERATED ALWAYS AS (((_raw_data ->> 'paid'::text))::boolean) STORED,
    "order" text GENERATED ALWAYS AS ((_raw_data ->> 'order'::text)) STORED,
    amount bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::bigint) STORED,
    review text GENERATED ALWAYS AS ((_raw_data ->> 'review'::text)) STORED,
    source jsonb GENERATED ALWAYS AS ((_raw_data -> 'source'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    dispute text GENERATED ALWAYS AS ((_raw_data ->> 'dispute'::text)) STORED,
    invoice text GENERATED ALWAYS AS ((_raw_data ->> 'invoice'::text)) STORED,
    outcome jsonb GENERATED ALWAYS AS ((_raw_data -> 'outcome'::text)) STORED,
    refunds jsonb GENERATED ALWAYS AS ((_raw_data -> 'refunds'::text)) STORED,
    updated integer GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
    captured boolean GENERATED ALWAYS AS (((_raw_data ->> 'captured'::text))::boolean) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    refunded boolean GENERATED ALWAYS AS (((_raw_data ->> 'refunded'::text))::boolean) STORED,
    shipping jsonb GENERATED ALWAYS AS ((_raw_data -> 'shipping'::text)) STORED,
    application text GENERATED ALWAYS AS ((_raw_data ->> 'application'::text)) STORED,
    description text GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
    destination text GENERATED ALWAYS AS ((_raw_data ->> 'destination'::text)) STORED,
    failure_code text GENERATED ALWAYS AS ((_raw_data ->> 'failure_code'::text)) STORED,
    on_behalf_of text GENERATED ALWAYS AS ((_raw_data ->> 'on_behalf_of'::text)) STORED,
    fraud_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'fraud_details'::text)) STORED,
    receipt_email text GENERATED ALWAYS AS ((_raw_data ->> 'receipt_email'::text)) STORED,
    payment_intent text GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
    receipt_number text GENERATED ALWAYS AS ((_raw_data ->> 'receipt_number'::text)) STORED,
    transfer_group text GENERATED ALWAYS AS ((_raw_data ->> 'transfer_group'::text)) STORED,
    amount_refunded bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount_refunded'::text))::bigint) STORED,
    application_fee text GENERATED ALWAYS AS ((_raw_data ->> 'application_fee'::text)) STORED,
    failure_message text GENERATED ALWAYS AS ((_raw_data ->> 'failure_message'::text)) STORED,
    source_transfer text GENERATED ALWAYS AS ((_raw_data ->> 'source_transfer'::text)) STORED,
    balance_transaction text GENERATED ALWAYS AS ((_raw_data ->> 'balance_transaction'::text)) STORED,
    statement_descriptor text GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
    payment_method_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'payment_method_details'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.charges OWNER TO postgres;

--
-- Name: checkout_session_line_items; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.checkout_session_line_items (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    amount_discount integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_discount'::text))::integer) STORED,
    amount_subtotal integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_subtotal'::text))::integer) STORED,
    amount_tax integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_tax'::text))::integer) STORED,
    amount_total integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_total'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    description text GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
    price text GENERATED ALWAYS AS ((_raw_data ->> 'price'::text)) STORED,
    quantity integer GENERATED ALWAYS AS (((_raw_data ->> 'quantity'::text))::integer) STORED,
    checkout_session text GENERATED ALWAYS AS ((_raw_data ->> 'checkout_session'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.checkout_session_line_items OWNER TO postgres;

--
-- Name: checkout_sessions; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.checkout_sessions (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    adaptive_pricing jsonb GENERATED ALWAYS AS ((_raw_data -> 'adaptive_pricing'::text)) STORED,
    after_expiration jsonb GENERATED ALWAYS AS ((_raw_data -> 'after_expiration'::text)) STORED,
    allow_promotion_codes boolean GENERATED ALWAYS AS (((_raw_data ->> 'allow_promotion_codes'::text))::boolean) STORED,
    amount_subtotal integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_subtotal'::text))::integer) STORED,
    amount_total integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_total'::text))::integer) STORED,
    automatic_tax jsonb GENERATED ALWAYS AS ((_raw_data -> 'automatic_tax'::text)) STORED,
    billing_address_collection text GENERATED ALWAYS AS ((_raw_data ->> 'billing_address_collection'::text)) STORED,
    cancel_url text GENERATED ALWAYS AS ((_raw_data ->> 'cancel_url'::text)) STORED,
    client_reference_id text GENERATED ALWAYS AS ((_raw_data ->> 'client_reference_id'::text)) STORED,
    client_secret text GENERATED ALWAYS AS ((_raw_data ->> 'client_secret'::text)) STORED,
    collected_information jsonb GENERATED ALWAYS AS ((_raw_data -> 'collected_information'::text)) STORED,
    consent jsonb GENERATED ALWAYS AS ((_raw_data -> 'consent'::text)) STORED,
    consent_collection jsonb GENERATED ALWAYS AS ((_raw_data -> 'consent_collection'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    currency_conversion jsonb GENERATED ALWAYS AS ((_raw_data -> 'currency_conversion'::text)) STORED,
    custom_fields jsonb GENERATED ALWAYS AS ((_raw_data -> 'custom_fields'::text)) STORED,
    custom_text jsonb GENERATED ALWAYS AS ((_raw_data -> 'custom_text'::text)) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    customer_creation text GENERATED ALWAYS AS ((_raw_data ->> 'customer_creation'::text)) STORED,
    customer_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'customer_details'::text)) STORED,
    customer_email text GENERATED ALWAYS AS ((_raw_data ->> 'customer_email'::text)) STORED,
    discounts jsonb GENERATED ALWAYS AS ((_raw_data -> 'discounts'::text)) STORED,
    expires_at integer GENERATED ALWAYS AS (((_raw_data ->> 'expires_at'::text))::integer) STORED,
    invoice text GENERATED ALWAYS AS ((_raw_data ->> 'invoice'::text)) STORED,
    invoice_creation jsonb GENERATED ALWAYS AS ((_raw_data -> 'invoice_creation'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    locale text GENERATED ALWAYS AS ((_raw_data ->> 'locale'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    mode text GENERATED ALWAYS AS ((_raw_data ->> 'mode'::text)) STORED,
    optional_items jsonb GENERATED ALWAYS AS ((_raw_data -> 'optional_items'::text)) STORED,
    payment_intent text GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
    payment_link text GENERATED ALWAYS AS ((_raw_data ->> 'payment_link'::text)) STORED,
    payment_method_collection text GENERATED ALWAYS AS ((_raw_data ->> 'payment_method_collection'::text)) STORED,
    payment_method_configuration_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'payment_method_configuration_details'::text)) STORED,
    payment_method_options jsonb GENERATED ALWAYS AS ((_raw_data -> 'payment_method_options'::text)) STORED,
    payment_method_types jsonb GENERATED ALWAYS AS ((_raw_data -> 'payment_method_types'::text)) STORED,
    payment_status text GENERATED ALWAYS AS ((_raw_data ->> 'payment_status'::text)) STORED,
    permissions jsonb GENERATED ALWAYS AS ((_raw_data -> 'permissions'::text)) STORED,
    phone_number_collection jsonb GENERATED ALWAYS AS ((_raw_data -> 'phone_number_collection'::text)) STORED,
    presentment_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'presentment_details'::text)) STORED,
    recovered_from text GENERATED ALWAYS AS ((_raw_data ->> 'recovered_from'::text)) STORED,
    redirect_on_completion text GENERATED ALWAYS AS ((_raw_data ->> 'redirect_on_completion'::text)) STORED,
    return_url text GENERATED ALWAYS AS ((_raw_data ->> 'return_url'::text)) STORED,
    saved_payment_method_options jsonb GENERATED ALWAYS AS ((_raw_data -> 'saved_payment_method_options'::text)) STORED,
    setup_intent text GENERATED ALWAYS AS ((_raw_data ->> 'setup_intent'::text)) STORED,
    shipping_address_collection jsonb GENERATED ALWAYS AS ((_raw_data -> 'shipping_address_collection'::text)) STORED,
    shipping_cost jsonb GENERATED ALWAYS AS ((_raw_data -> 'shipping_cost'::text)) STORED,
    shipping_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'shipping_details'::text)) STORED,
    shipping_options jsonb GENERATED ALWAYS AS ((_raw_data -> 'shipping_options'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    submit_type text GENERATED ALWAYS AS ((_raw_data ->> 'submit_type'::text)) STORED,
    subscription text GENERATED ALWAYS AS ((_raw_data ->> 'subscription'::text)) STORED,
    success_url text GENERATED ALWAYS AS ((_raw_data ->> 'success_url'::text)) STORED,
    tax_id_collection jsonb GENERATED ALWAYS AS ((_raw_data -> 'tax_id_collection'::text)) STORED,
    total_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'total_details'::text)) STORED,
    ui_mode text GENERATED ALWAYS AS ((_raw_data ->> 'ui_mode'::text)) STORED,
    url text GENERATED ALWAYS AS ((_raw_data ->> 'url'::text)) STORED,
    wallet_options jsonb GENERATED ALWAYS AS ((_raw_data -> 'wallet_options'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.checkout_sessions OWNER TO postgres;

--
-- Name: coupons; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.coupons (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    name text GENERATED ALWAYS AS ((_raw_data ->> 'name'::text)) STORED,
    valid boolean GENERATED ALWAYS AS (((_raw_data ->> 'valid'::text))::boolean) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    updated integer GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    duration text GENERATED ALWAYS AS ((_raw_data ->> 'duration'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    redeem_by integer GENERATED ALWAYS AS (((_raw_data ->> 'redeem_by'::text))::integer) STORED,
    amount_off bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount_off'::text))::bigint) STORED,
    percent_off double precision GENERATED ALWAYS AS (((_raw_data ->> 'percent_off'::text))::double precision) STORED,
    times_redeemed bigint GENERATED ALWAYS AS (((_raw_data ->> 'times_redeemed'::text))::bigint) STORED,
    max_redemptions bigint GENERATED ALWAYS AS (((_raw_data ->> 'max_redemptions'::text))::bigint) STORED,
    duration_in_months bigint GENERATED ALWAYS AS (((_raw_data ->> 'duration_in_months'::text))::bigint) STORED,
    percent_off_precise double precision GENERATED ALWAYS AS (((_raw_data ->> 'percent_off_precise'::text))::double precision) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.coupons OWNER TO postgres;

--
-- Name: credit_notes; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.credit_notes (
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    amount integer GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::integer) STORED,
    amount_shipping integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_shipping'::text))::integer) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    customer_balance_transaction text GENERATED ALWAYS AS ((_raw_data ->> 'customer_balance_transaction'::text)) STORED,
    discount_amount integer GENERATED ALWAYS AS (((_raw_data ->> 'discount_amount'::text))::integer) STORED,
    discount_amounts jsonb GENERATED ALWAYS AS ((_raw_data -> 'discount_amounts'::text)) STORED,
    invoice text GENERATED ALWAYS AS ((_raw_data ->> 'invoice'::text)) STORED,
    lines jsonb GENERATED ALWAYS AS ((_raw_data -> 'lines'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    memo text GENERATED ALWAYS AS ((_raw_data ->> 'memo'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    number text GENERATED ALWAYS AS ((_raw_data ->> 'number'::text)) STORED,
    out_of_band_amount integer GENERATED ALWAYS AS (((_raw_data ->> 'out_of_band_amount'::text))::integer) STORED,
    pdf text GENERATED ALWAYS AS ((_raw_data ->> 'pdf'::text)) STORED,
    reason text GENERATED ALWAYS AS ((_raw_data ->> 'reason'::text)) STORED,
    refund text GENERATED ALWAYS AS ((_raw_data ->> 'refund'::text)) STORED,
    shipping_cost jsonb GENERATED ALWAYS AS ((_raw_data -> 'shipping_cost'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    subtotal integer GENERATED ALWAYS AS (((_raw_data ->> 'subtotal'::text))::integer) STORED,
    subtotal_excluding_tax integer GENERATED ALWAYS AS (((_raw_data ->> 'subtotal_excluding_tax'::text))::integer) STORED,
    tax_amounts jsonb GENERATED ALWAYS AS ((_raw_data -> 'tax_amounts'::text)) STORED,
    total integer GENERATED ALWAYS AS (((_raw_data ->> 'total'::text))::integer) STORED,
    total_excluding_tax integer GENERATED ALWAYS AS (((_raw_data ->> 'total_excluding_tax'::text))::integer) STORED,
    type text GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
    voided_at text GENERATED ALWAYS AS ((_raw_data ->> 'voided_at'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.credit_notes OWNER TO postgres;

--
-- Name: customers; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.customers (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    address jsonb GENERATED ALWAYS AS ((_raw_data -> 'address'::text)) STORED,
    description text GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
    email text GENERATED ALWAYS AS ((_raw_data ->> 'email'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    name text GENERATED ALWAYS AS ((_raw_data ->> 'name'::text)) STORED,
    phone text GENERATED ALWAYS AS ((_raw_data ->> 'phone'::text)) STORED,
    shipping jsonb GENERATED ALWAYS AS ((_raw_data -> 'shipping'::text)) STORED,
    balance integer GENERATED ALWAYS AS (((_raw_data ->> 'balance'::text))::integer) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    default_source text GENERATED ALWAYS AS ((_raw_data ->> 'default_source'::text)) STORED,
    delinquent boolean GENERATED ALWAYS AS (((_raw_data ->> 'delinquent'::text))::boolean) STORED,
    discount jsonb GENERATED ALWAYS AS ((_raw_data -> 'discount'::text)) STORED,
    invoice_prefix text GENERATED ALWAYS AS ((_raw_data ->> 'invoice_prefix'::text)) STORED,
    invoice_settings jsonb GENERATED ALWAYS AS ((_raw_data -> 'invoice_settings'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    next_invoice_sequence integer GENERATED ALWAYS AS (((_raw_data ->> 'next_invoice_sequence'::text))::integer) STORED,
    preferred_locales jsonb GENERATED ALWAYS AS ((_raw_data -> 'preferred_locales'::text)) STORED,
    tax_exempt text GENERATED ALWAYS AS ((_raw_data ->> 'tax_exempt'::text)) STORED,
    deleted boolean GENERATED ALWAYS AS (((_raw_data ->> 'deleted'::text))::boolean) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.customers OWNER TO postgres;

--
-- Name: disputes; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.disputes (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    amount bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::bigint) STORED,
    charge text GENERATED ALWAYS AS ((_raw_data ->> 'charge'::text)) STORED,
    reason text GENERATED ALWAYS AS ((_raw_data ->> 'reason'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    updated integer GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    evidence jsonb GENERATED ALWAYS AS ((_raw_data -> 'evidence'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    evidence_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'evidence_details'::text)) STORED,
    balance_transactions jsonb GENERATED ALWAYS AS ((_raw_data -> 'balance_transactions'::text)) STORED,
    is_charge_refundable boolean GENERATED ALWAYS AS (((_raw_data ->> 'is_charge_refundable'::text))::boolean) STORED,
    payment_intent text GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.disputes OWNER TO postgres;

--
-- Name: early_fraud_warnings; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.early_fraud_warnings (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    actionable boolean GENERATED ALWAYS AS (((_raw_data ->> 'actionable'::text))::boolean) STORED,
    charge text GENERATED ALWAYS AS ((_raw_data ->> 'charge'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    fraud_type text GENERATED ALWAYS AS ((_raw_data ->> 'fraud_type'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    payment_intent text GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.early_fraud_warnings OWNER TO postgres;

--
-- Name: events; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.events (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    data jsonb GENERATED ALWAYS AS ((_raw_data -> 'data'::text)) STORED,
    type text GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    request text GENERATED ALWAYS AS ((_raw_data ->> 'request'::text)) STORED,
    updated integer GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    api_version text GENERATED ALWAYS AS ((_raw_data ->> 'api_version'::text)) STORED,
    pending_webhooks bigint GENERATED ALWAYS AS (((_raw_data ->> 'pending_webhooks'::text))::bigint) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.events OWNER TO postgres;

--
-- Name: features; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.features (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    name text GENERATED ALWAYS AS ((_raw_data ->> 'name'::text)) STORED,
    lookup_key text GENERATED ALWAYS AS ((_raw_data ->> 'lookup_key'::text)) STORED,
    active boolean GENERATED ALWAYS AS (((_raw_data ->> 'active'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.features OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.invoices (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    auto_advance boolean GENERATED ALWAYS AS (((_raw_data ->> 'auto_advance'::text))::boolean) STORED,
    collection_method text GENERATED ALWAYS AS ((_raw_data ->> 'collection_method'::text)) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    description text GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
    hosted_invoice_url text GENERATED ALWAYS AS ((_raw_data ->> 'hosted_invoice_url'::text)) STORED,
    lines jsonb GENERATED ALWAYS AS ((_raw_data -> 'lines'::text)) STORED,
    period_end integer GENERATED ALWAYS AS (((_raw_data ->> 'period_end'::text))::integer) STORED,
    period_start integer GENERATED ALWAYS AS (((_raw_data ->> 'period_start'::text))::integer) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    total bigint GENERATED ALWAYS AS (((_raw_data ->> 'total'::text))::bigint) STORED,
    account_country text GENERATED ALWAYS AS ((_raw_data ->> 'account_country'::text)) STORED,
    account_name text GENERATED ALWAYS AS ((_raw_data ->> 'account_name'::text)) STORED,
    account_tax_ids jsonb GENERATED ALWAYS AS ((_raw_data -> 'account_tax_ids'::text)) STORED,
    amount_due bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount_due'::text))::bigint) STORED,
    amount_paid bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount_paid'::text))::bigint) STORED,
    amount_remaining bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount_remaining'::text))::bigint) STORED,
    application_fee_amount bigint GENERATED ALWAYS AS (((_raw_data ->> 'application_fee_amount'::text))::bigint) STORED,
    attempt_count integer GENERATED ALWAYS AS (((_raw_data ->> 'attempt_count'::text))::integer) STORED,
    attempted boolean GENERATED ALWAYS AS (((_raw_data ->> 'attempted'::text))::boolean) STORED,
    billing_reason text GENERATED ALWAYS AS ((_raw_data ->> 'billing_reason'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    custom_fields jsonb GENERATED ALWAYS AS ((_raw_data -> 'custom_fields'::text)) STORED,
    customer_address jsonb GENERATED ALWAYS AS ((_raw_data -> 'customer_address'::text)) STORED,
    customer_email text GENERATED ALWAYS AS ((_raw_data ->> 'customer_email'::text)) STORED,
    customer_name text GENERATED ALWAYS AS ((_raw_data ->> 'customer_name'::text)) STORED,
    customer_phone text GENERATED ALWAYS AS ((_raw_data ->> 'customer_phone'::text)) STORED,
    customer_shipping jsonb GENERATED ALWAYS AS ((_raw_data -> 'customer_shipping'::text)) STORED,
    customer_tax_exempt text GENERATED ALWAYS AS ((_raw_data ->> 'customer_tax_exempt'::text)) STORED,
    customer_tax_ids jsonb GENERATED ALWAYS AS ((_raw_data -> 'customer_tax_ids'::text)) STORED,
    default_tax_rates jsonb GENERATED ALWAYS AS ((_raw_data -> 'default_tax_rates'::text)) STORED,
    discount jsonb GENERATED ALWAYS AS ((_raw_data -> 'discount'::text)) STORED,
    discounts jsonb GENERATED ALWAYS AS ((_raw_data -> 'discounts'::text)) STORED,
    due_date integer GENERATED ALWAYS AS (((_raw_data ->> 'due_date'::text))::integer) STORED,
    ending_balance integer GENERATED ALWAYS AS (((_raw_data ->> 'ending_balance'::text))::integer) STORED,
    footer text GENERATED ALWAYS AS ((_raw_data ->> 'footer'::text)) STORED,
    invoice_pdf text GENERATED ALWAYS AS ((_raw_data ->> 'invoice_pdf'::text)) STORED,
    last_finalization_error jsonb GENERATED ALWAYS AS ((_raw_data -> 'last_finalization_error'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    next_payment_attempt integer GENERATED ALWAYS AS (((_raw_data ->> 'next_payment_attempt'::text))::integer) STORED,
    number text GENERATED ALWAYS AS ((_raw_data ->> 'number'::text)) STORED,
    paid boolean GENERATED ALWAYS AS (((_raw_data ->> 'paid'::text))::boolean) STORED,
    payment_settings jsonb GENERATED ALWAYS AS ((_raw_data -> 'payment_settings'::text)) STORED,
    post_payment_credit_notes_amount integer GENERATED ALWAYS AS (((_raw_data ->> 'post_payment_credit_notes_amount'::text))::integer) STORED,
    pre_payment_credit_notes_amount integer GENERATED ALWAYS AS (((_raw_data ->> 'pre_payment_credit_notes_amount'::text))::integer) STORED,
    receipt_number text GENERATED ALWAYS AS ((_raw_data ->> 'receipt_number'::text)) STORED,
    starting_balance integer GENERATED ALWAYS AS (((_raw_data ->> 'starting_balance'::text))::integer) STORED,
    statement_descriptor text GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
    status_transitions jsonb GENERATED ALWAYS AS ((_raw_data -> 'status_transitions'::text)) STORED,
    subtotal integer GENERATED ALWAYS AS (((_raw_data ->> 'subtotal'::text))::integer) STORED,
    tax integer GENERATED ALWAYS AS (((_raw_data ->> 'tax'::text))::integer) STORED,
    total_discount_amounts jsonb GENERATED ALWAYS AS ((_raw_data -> 'total_discount_amounts'::text)) STORED,
    total_tax_amounts jsonb GENERATED ALWAYS AS ((_raw_data -> 'total_tax_amounts'::text)) STORED,
    transfer_data jsonb GENERATED ALWAYS AS ((_raw_data -> 'transfer_data'::text)) STORED,
    webhooks_delivered_at integer GENERATED ALWAYS AS (((_raw_data ->> 'webhooks_delivered_at'::text))::integer) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    subscription text GENERATED ALWAYS AS ((_raw_data ->> 'subscription'::text)) STORED,
    payment_intent text GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
    default_payment_method text GENERATED ALWAYS AS ((_raw_data ->> 'default_payment_method'::text)) STORED,
    default_source text GENERATED ALWAYS AS ((_raw_data ->> 'default_source'::text)) STORED,
    on_behalf_of text GENERATED ALWAYS AS ((_raw_data ->> 'on_behalf_of'::text)) STORED,
    charge text GENERATED ALWAYS AS ((_raw_data ->> 'charge'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.invoices OWNER TO postgres;

--
-- Name: payment_intents; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.payment_intents (
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    amount integer GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::integer) STORED,
    amount_capturable integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_capturable'::text))::integer) STORED,
    amount_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'amount_details'::text)) STORED,
    amount_received integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_received'::text))::integer) STORED,
    application text GENERATED ALWAYS AS ((_raw_data ->> 'application'::text)) STORED,
    application_fee_amount integer GENERATED ALWAYS AS (((_raw_data ->> 'application_fee_amount'::text))::integer) STORED,
    automatic_payment_methods text GENERATED ALWAYS AS ((_raw_data ->> 'automatic_payment_methods'::text)) STORED,
    canceled_at integer GENERATED ALWAYS AS (((_raw_data ->> 'canceled_at'::text))::integer) STORED,
    cancellation_reason text GENERATED ALWAYS AS ((_raw_data ->> 'cancellation_reason'::text)) STORED,
    capture_method text GENERATED ALWAYS AS ((_raw_data ->> 'capture_method'::text)) STORED,
    client_secret text GENERATED ALWAYS AS ((_raw_data ->> 'client_secret'::text)) STORED,
    confirmation_method text GENERATED ALWAYS AS ((_raw_data ->> 'confirmation_method'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    description text GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
    invoice text GENERATED ALWAYS AS ((_raw_data ->> 'invoice'::text)) STORED,
    last_payment_error text GENERATED ALWAYS AS ((_raw_data ->> 'last_payment_error'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    next_action text GENERATED ALWAYS AS ((_raw_data ->> 'next_action'::text)) STORED,
    on_behalf_of text GENERATED ALWAYS AS ((_raw_data ->> 'on_behalf_of'::text)) STORED,
    payment_method text GENERATED ALWAYS AS ((_raw_data ->> 'payment_method'::text)) STORED,
    payment_method_options jsonb GENERATED ALWAYS AS ((_raw_data -> 'payment_method_options'::text)) STORED,
    payment_method_types jsonb GENERATED ALWAYS AS ((_raw_data -> 'payment_method_types'::text)) STORED,
    processing text GENERATED ALWAYS AS ((_raw_data ->> 'processing'::text)) STORED,
    receipt_email text GENERATED ALWAYS AS ((_raw_data ->> 'receipt_email'::text)) STORED,
    review text GENERATED ALWAYS AS ((_raw_data ->> 'review'::text)) STORED,
    setup_future_usage text GENERATED ALWAYS AS ((_raw_data ->> 'setup_future_usage'::text)) STORED,
    shipping jsonb GENERATED ALWAYS AS ((_raw_data -> 'shipping'::text)) STORED,
    statement_descriptor text GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
    statement_descriptor_suffix text GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor_suffix'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    transfer_data jsonb GENERATED ALWAYS AS ((_raw_data -> 'transfer_data'::text)) STORED,
    transfer_group text GENERATED ALWAYS AS ((_raw_data ->> 'transfer_group'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.payment_intents OWNER TO postgres;

--
-- Name: payment_methods; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.payment_methods (
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    type text GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
    billing_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'billing_details'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    card jsonb GENERATED ALWAYS AS ((_raw_data -> 'card'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.payment_methods OWNER TO postgres;

--
-- Name: payouts; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.payouts (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    date text GENERATED ALWAYS AS ((_raw_data ->> 'date'::text)) STORED,
    type text GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
    amount bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::bigint) STORED,
    method text GENERATED ALWAYS AS ((_raw_data ->> 'method'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    updated integer GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    automatic boolean GENERATED ALWAYS AS (((_raw_data ->> 'automatic'::text))::boolean) STORED,
    recipient text GENERATED ALWAYS AS ((_raw_data ->> 'recipient'::text)) STORED,
    description text GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
    destination text GENERATED ALWAYS AS ((_raw_data ->> 'destination'::text)) STORED,
    source_type text GENERATED ALWAYS AS ((_raw_data ->> 'source_type'::text)) STORED,
    arrival_date text GENERATED ALWAYS AS ((_raw_data ->> 'arrival_date'::text)) STORED,
    bank_account jsonb GENERATED ALWAYS AS ((_raw_data -> 'bank_account'::text)) STORED,
    failure_code text GENERATED ALWAYS AS ((_raw_data ->> 'failure_code'::text)) STORED,
    transfer_group text GENERATED ALWAYS AS ((_raw_data ->> 'transfer_group'::text)) STORED,
    amount_reversed bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount_reversed'::text))::bigint) STORED,
    failure_message text GENERATED ALWAYS AS ((_raw_data ->> 'failure_message'::text)) STORED,
    source_transaction text GENERATED ALWAYS AS ((_raw_data ->> 'source_transaction'::text)) STORED,
    balance_transaction text GENERATED ALWAYS AS ((_raw_data ->> 'balance_transaction'::text)) STORED,
    statement_descriptor text GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
    statement_description text GENERATED ALWAYS AS ((_raw_data ->> 'statement_description'::text)) STORED,
    failure_balance_transaction text GENERATED ALWAYS AS ((_raw_data ->> 'failure_balance_transaction'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.payouts OWNER TO postgres;

--
-- Name: plans; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.plans (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    name text GENERATED ALWAYS AS ((_raw_data ->> 'name'::text)) STORED,
    tiers jsonb GENERATED ALWAYS AS ((_raw_data -> 'tiers'::text)) STORED,
    active boolean GENERATED ALWAYS AS (((_raw_data ->> 'active'::text))::boolean) STORED,
    amount bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::bigint) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    product text GENERATED ALWAYS AS ((_raw_data ->> 'product'::text)) STORED,
    updated integer GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    "interval" text GENERATED ALWAYS AS ((_raw_data ->> 'interval'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    nickname text GENERATED ALWAYS AS ((_raw_data ->> 'nickname'::text)) STORED,
    tiers_mode text GENERATED ALWAYS AS ((_raw_data ->> 'tiers_mode'::text)) STORED,
    usage_type text GENERATED ALWAYS AS ((_raw_data ->> 'usage_type'::text)) STORED,
    billing_scheme text GENERATED ALWAYS AS ((_raw_data ->> 'billing_scheme'::text)) STORED,
    interval_count bigint GENERATED ALWAYS AS (((_raw_data ->> 'interval_count'::text))::bigint) STORED,
    aggregate_usage text GENERATED ALWAYS AS ((_raw_data ->> 'aggregate_usage'::text)) STORED,
    transform_usage text GENERATED ALWAYS AS ((_raw_data ->> 'transform_usage'::text)) STORED,
    trial_period_days bigint GENERATED ALWAYS AS (((_raw_data ->> 'trial_period_days'::text))::bigint) STORED,
    statement_descriptor text GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
    statement_description text GENERATED ALWAYS AS ((_raw_data ->> 'statement_description'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.plans OWNER TO postgres;

--
-- Name: prices; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.prices (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    active boolean GENERATED ALWAYS AS (((_raw_data ->> 'active'::text))::boolean) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    nickname text GENERATED ALWAYS AS ((_raw_data ->> 'nickname'::text)) STORED,
    recurring jsonb GENERATED ALWAYS AS ((_raw_data -> 'recurring'::text)) STORED,
    type text GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
    unit_amount integer GENERATED ALWAYS AS (((_raw_data ->> 'unit_amount'::text))::integer) STORED,
    billing_scheme text GENERATED ALWAYS AS ((_raw_data ->> 'billing_scheme'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    lookup_key text GENERATED ALWAYS AS ((_raw_data ->> 'lookup_key'::text)) STORED,
    tiers_mode text GENERATED ALWAYS AS ((_raw_data ->> 'tiers_mode'::text)) STORED,
    transform_quantity jsonb GENERATED ALWAYS AS ((_raw_data -> 'transform_quantity'::text)) STORED,
    unit_amount_decimal text GENERATED ALWAYS AS ((_raw_data ->> 'unit_amount_decimal'::text)) STORED,
    product text GENERATED ALWAYS AS ((_raw_data ->> 'product'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.prices OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.products (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    active boolean GENERATED ALWAYS AS (((_raw_data ->> 'active'::text))::boolean) STORED,
    default_price text GENERATED ALWAYS AS ((_raw_data ->> 'default_price'::text)) STORED,
    description text GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    name text GENERATED ALWAYS AS ((_raw_data ->> 'name'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    images jsonb GENERATED ALWAYS AS ((_raw_data -> 'images'::text)) STORED,
    marketing_features jsonb GENERATED ALWAYS AS ((_raw_data -> 'marketing_features'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    package_dimensions jsonb GENERATED ALWAYS AS ((_raw_data -> 'package_dimensions'::text)) STORED,
    shippable boolean GENERATED ALWAYS AS (((_raw_data ->> 'shippable'::text))::boolean) STORED,
    statement_descriptor text GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
    unit_label text GENERATED ALWAYS AS ((_raw_data ->> 'unit_label'::text)) STORED,
    updated integer GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
    url text GENERATED ALWAYS AS ((_raw_data ->> 'url'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.products OWNER TO postgres;

--
-- Name: refunds; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.refunds (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    amount integer GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::integer) STORED,
    balance_transaction text GENERATED ALWAYS AS ((_raw_data ->> 'balance_transaction'::text)) STORED,
    charge text GENERATED ALWAYS AS ((_raw_data ->> 'charge'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    destination_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'destination_details'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    payment_intent text GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
    reason text GENERATED ALWAYS AS ((_raw_data ->> 'reason'::text)) STORED,
    receipt_number text GENERATED ALWAYS AS ((_raw_data ->> 'receipt_number'::text)) STORED,
    source_transfer_reversal text GENERATED ALWAYS AS ((_raw_data ->> 'source_transfer_reversal'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    transfer_reversal text GENERATED ALWAYS AS ((_raw_data ->> 'transfer_reversal'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.refunds OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.reviews (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    billing_zip text GENERATED ALWAYS AS ((_raw_data ->> 'billing_zip'::text)) STORED,
    charge text GENERATED ALWAYS AS ((_raw_data ->> 'charge'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    closed_reason text GENERATED ALWAYS AS ((_raw_data ->> 'closed_reason'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    ip_address text GENERATED ALWAYS AS ((_raw_data ->> 'ip_address'::text)) STORED,
    ip_address_location jsonb GENERATED ALWAYS AS ((_raw_data -> 'ip_address_location'::text)) STORED,
    open boolean GENERATED ALWAYS AS (((_raw_data ->> 'open'::text))::boolean) STORED,
    opened_reason text GENERATED ALWAYS AS ((_raw_data ->> 'opened_reason'::text)) STORED,
    payment_intent text GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
    reason text GENERATED ALWAYS AS ((_raw_data ->> 'reason'::text)) STORED,
    session text GENERATED ALWAYS AS ((_raw_data ->> 'session'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.reviews OWNER TO postgres;

--
-- Name: setup_intents; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.setup_intents (
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    description text GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
    payment_method text GENERATED ALWAYS AS ((_raw_data ->> 'payment_method'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    usage text GENERATED ALWAYS AS ((_raw_data ->> 'usage'::text)) STORED,
    cancellation_reason text GENERATED ALWAYS AS ((_raw_data ->> 'cancellation_reason'::text)) STORED,
    latest_attempt text GENERATED ALWAYS AS ((_raw_data ->> 'latest_attempt'::text)) STORED,
    mandate text GENERATED ALWAYS AS ((_raw_data ->> 'mandate'::text)) STORED,
    single_use_mandate text GENERATED ALWAYS AS ((_raw_data ->> 'single_use_mandate'::text)) STORED,
    on_behalf_of text GENERATED ALWAYS AS ((_raw_data ->> 'on_behalf_of'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.setup_intents OWNER TO postgres;

--
-- Name: subscription_items; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.subscription_items (
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    billing_thresholds jsonb GENERATED ALWAYS AS ((_raw_data -> 'billing_thresholds'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    deleted boolean GENERATED ALWAYS AS (((_raw_data ->> 'deleted'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    quantity integer GENERATED ALWAYS AS (((_raw_data ->> 'quantity'::text))::integer) STORED,
    price text GENERATED ALWAYS AS ((_raw_data ->> 'price'::text)) STORED,
    subscription text GENERATED ALWAYS AS ((_raw_data ->> 'subscription'::text)) STORED,
    tax_rates jsonb GENERATED ALWAYS AS ((_raw_data -> 'tax_rates'::text)) STORED,
    current_period_end integer GENERATED ALWAYS AS (((_raw_data ->> 'current_period_end'::text))::integer) STORED,
    current_period_start integer GENERATED ALWAYS AS (((_raw_data ->> 'current_period_start'::text))::integer) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.subscription_items OWNER TO postgres;

--
-- Name: subscription_schedules; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.subscription_schedules (
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    application text GENERATED ALWAYS AS ((_raw_data ->> 'application'::text)) STORED,
    canceled_at integer GENERATED ALWAYS AS (((_raw_data ->> 'canceled_at'::text))::integer) STORED,
    completed_at integer GENERATED ALWAYS AS (((_raw_data ->> 'completed_at'::text))::integer) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    current_phase jsonb GENERATED ALWAYS AS ((_raw_data -> 'current_phase'::text)) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    default_settings jsonb GENERATED ALWAYS AS ((_raw_data -> 'default_settings'::text)) STORED,
    end_behavior text GENERATED ALWAYS AS ((_raw_data ->> 'end_behavior'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    phases jsonb GENERATED ALWAYS AS ((_raw_data -> 'phases'::text)) STORED,
    released_at integer GENERATED ALWAYS AS (((_raw_data ->> 'released_at'::text))::integer) STORED,
    released_subscription text GENERATED ALWAYS AS ((_raw_data ->> 'released_subscription'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    subscription text GENERATED ALWAYS AS ((_raw_data ->> 'subscription'::text)) STORED,
    test_clock text GENERATED ALWAYS AS ((_raw_data ->> 'test_clock'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.subscription_schedules OWNER TO postgres;

--
-- Name: subscriptions; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.subscriptions (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    cancel_at_period_end boolean GENERATED ALWAYS AS (((_raw_data ->> 'cancel_at_period_end'::text))::boolean) STORED,
    current_period_end integer GENERATED ALWAYS AS (((_raw_data ->> 'current_period_end'::text))::integer) STORED,
    current_period_start integer GENERATED ALWAYS AS (((_raw_data ->> 'current_period_start'::text))::integer) STORED,
    default_payment_method text GENERATED ALWAYS AS ((_raw_data ->> 'default_payment_method'::text)) STORED,
    items jsonb GENERATED ALWAYS AS ((_raw_data -> 'items'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    pending_setup_intent text GENERATED ALWAYS AS ((_raw_data ->> 'pending_setup_intent'::text)) STORED,
    pending_update jsonb GENERATED ALWAYS AS ((_raw_data -> 'pending_update'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    application_fee_percent double precision GENERATED ALWAYS AS (((_raw_data ->> 'application_fee_percent'::text))::double precision) STORED,
    billing_cycle_anchor integer GENERATED ALWAYS AS (((_raw_data ->> 'billing_cycle_anchor'::text))::integer) STORED,
    billing_thresholds jsonb GENERATED ALWAYS AS ((_raw_data -> 'billing_thresholds'::text)) STORED,
    cancel_at integer GENERATED ALWAYS AS (((_raw_data ->> 'cancel_at'::text))::integer) STORED,
    canceled_at integer GENERATED ALWAYS AS (((_raw_data ->> 'canceled_at'::text))::integer) STORED,
    collection_method text GENERATED ALWAYS AS ((_raw_data ->> 'collection_method'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    days_until_due integer GENERATED ALWAYS AS (((_raw_data ->> 'days_until_due'::text))::integer) STORED,
    default_source text GENERATED ALWAYS AS ((_raw_data ->> 'default_source'::text)) STORED,
    default_tax_rates jsonb GENERATED ALWAYS AS ((_raw_data -> 'default_tax_rates'::text)) STORED,
    discount jsonb GENERATED ALWAYS AS ((_raw_data -> 'discount'::text)) STORED,
    ended_at integer GENERATED ALWAYS AS (((_raw_data ->> 'ended_at'::text))::integer) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    next_pending_invoice_item_invoice integer GENERATED ALWAYS AS (((_raw_data ->> 'next_pending_invoice_item_invoice'::text))::integer) STORED,
    pause_collection jsonb GENERATED ALWAYS AS ((_raw_data -> 'pause_collection'::text)) STORED,
    pending_invoice_item_interval jsonb GENERATED ALWAYS AS ((_raw_data -> 'pending_invoice_item_interval'::text)) STORED,
    start_date integer GENERATED ALWAYS AS (((_raw_data ->> 'start_date'::text))::integer) STORED,
    transfer_data jsonb GENERATED ALWAYS AS ((_raw_data -> 'transfer_data'::text)) STORED,
    trial_end jsonb GENERATED ALWAYS AS ((_raw_data -> 'trial_end'::text)) STORED,
    trial_start jsonb GENERATED ALWAYS AS ((_raw_data -> 'trial_start'::text)) STORED,
    schedule text GENERATED ALWAYS AS ((_raw_data ->> 'schedule'::text)) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    latest_invoice text GENERATED ALWAYS AS ((_raw_data ->> 'latest_invoice'::text)) STORED,
    plan text GENERATED ALWAYS AS ((_raw_data ->> 'plan'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.subscriptions OWNER TO postgres;

--
-- Name: tax_ids; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.tax_ids (
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    country text GENERATED ALWAYS AS ((_raw_data ->> 'country'::text)) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    type text GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
    value text GENERATED ALWAYS AS ((_raw_data ->> 'value'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    owner jsonb GENERATED ALWAYS AS ((_raw_data -> 'owner'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.tax_ids OWNER TO postgres;

--
-- Name: code_analyses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.code_analyses ALTER COLUMN id SET DEFAULT nextval('public.code_analyses_id_seq'::regclass);


--
-- Name: free_trials id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.free_trials ALTER COLUMN id SET DEFAULT nextval('public.free_trials_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: signals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.signals ALTER COLUMN id SET DEFAULT nextval('public.signals_id_seq'::regclass);


--
-- Name: _sync_status id; Type: DEFAULT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._sync_status ALTER COLUMN id SET DEFAULT nextval('stripe._sync_status_id_seq'::regclass);


--
-- Data for Name: code_analyses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.code_analyses (id, code_snippet, risk_level, summary, tier, fingerprint, session_id, "timestamp", full_data) FROM stdin;
2	function authenticateUser(req, res, next) {\n  const token = req.headers.authorization.split(' ')[1];\n  const decoded = jwt.verify(token, process.env.JWT_SECRET);\n  req.user = decoded;\n  next();\n}	CRITICAL	This middleware assumes the Authorization header always exists, is always in the expected Bearer format, and that jwt.verify will never throw. In practice, malformed or missing input will crash the request handler or bypass proper error handling unless these cases are explicitly handled.	free	fp_1775055643783_5jcg0x0w	\N	2026-06-14 18:02:41.887957	{"risks": [{"text": "If req.headers.authorization is undefined, req.headers.authorization.split(' ') throws a TypeError and may produce a 500 response instead of a controlled 401 response.", "severity": "HIGH"}, {"text": "If the Authorization header is malformed, token may be undefined and jwt.verify(undefined, ...) will throw, again causing unhandled errors.", "severity": "HIGH"}, {"text": "If the header uses a different scheme such as Basic or a typo like 'Bearr', the middleware still attempts verification instead of rejecting the request clearly.", "severity": "MEDIUM"}, {"text": "If process.env.JWT_SECRET is missing, verification may fail unexpectedly and all authenticated requests will break at runtime.", "severity": "HIGH"}, {"text": "If the token is expired or invalid, jwt.verify throws synchronously; without try/catch, Express may treat this as an uncaught error and return a 500 rather than 401.", "severity": "HIGH"}, {"text": "Attaching decoded directly to req.user may expose unexpected claims or shapes to downstream code, which can lead to authorization bugs if later code assumes fields like req.user.id or req.user.role always exist.", "severity": "MEDIUM"}], "checks": ["Verify jwt is imported, for example const jwt = require('jsonwebtoken');, in the same module.", "Verify process.env.JWT_SECRET is set in every environment before the server starts.", "Verify clients send Authorization headers in the exact format 'Bearer <token>'.", "Verify your Express error-handling strategy: authentication failures should return 401/403, not 500.", "Verify the expected JWT payload structure before downstream code trusts req.user.id, req.user.email, or req.user.role.", "Verify whether expired tokens should return a different message than malformed or missing tokens.", "Verify whether only specific algorithms should be accepted during jwt.verify rather than relying on defaults.", "Verify this middleware is only applied to protected routes or intentionally to all routes."], "summary": "This middleware assumes the Authorization header always exists, is always in the expected Bearer format, and that jwt.verify will never throw. In practice, malformed or missing input will crash the request handler or bypass proper error handling unless these cases are explicitly handled.", "risk_level": "CRITICAL", "safer_code": "const jwt = require('jsonwebtoken');\\n\\nfunction authenticateUser(req, res, next) {\\n  const authHeader = req.headers && req.headers.authorization;\\n\\n  if (!process.env.JWT_SECRET) {\\n    return res.status(500).json({ error: 'Server authentication is not configured' });\\n  }\\n\\n  if (!authHeader) {\\n    return res.status(401).json({ error: 'Authorization header is required' });\\n  }\\n\\n  const parts = authHeader.split(' ');\\n  if (parts.length !== 2) {\\n    return res.status(401).json({ error: 'Authorization header must be in the format: Bearer <token>' });\\n  }\\n\\n  const [scheme, token] = parts;\\n\\n  if (scheme !== 'Bearer') {\\n    return res.status(401).json({ error: 'Authorization scheme must be Bearer' });\\n  }\\n\\n  if (!token || !token.trim()) {\\n    return res.status(401).json({ error: 'Token is required' });\\n  }\\n\\n  try {\\n    const decoded = jwt.verify(token, process.env.JWT_SECRET, {\\n      algorithms: ['HS256']\\n    });\\n\\n    if (!decoded || typeof decoded !== 'object') {\\n      return res.status(401).json({ error: 'Invalid token payload' });\\n    }\\n\\n    req.user = decoded;\\n    return next();\\n  } catch (error) {\\n    if (error.name === 'TokenExpiredError') {\\n      return res.status(401).json({ error: 'Token has expired' });\\n    }\\n\\n    if (error.name === 'JsonWebTokenError') {\\n      return res.status(401).json({ error: 'Invalid token' });\\n    }\\n\\n    return next(error);\\n  }\\n}\\n\\nmodule.exports = authenticateUser;", "assumptions": [{"text": "The AI assumed req.headers.authorization is always present on every request.", "severity": "HIGH"}, {"text": "The AI assumed req.headers.authorization always contains a space-delimited value like 'Bearer <token>'.", "severity": "HIGH"}, {"text": "The AI assumed the auth scheme is always Bearer and does not need validation.", "severity": "MEDIUM"}, {"text": "The AI assumed jwt is imported and available in scope.", "severity": "MEDIUM"}, {"text": "The AI assumed process.env.JWT_SECRET is defined and valid at runtime.", "severity": "HIGH"}, {"text": "The AI assumed jwt.verify(token, process.env.JWT_SECRET) will not throw for expired, malformed, or invalid tokens.", "severity": "HIGH"}, {"text": "The AI assumed the decoded JWT payload is safe to trust and attach directly to req.user without validation.", "severity": "MEDIUM"}, {"text": "The AI assumed all routes using this middleware should fail identically, without distinguishing missing token from invalid token.", "severity": "LOW"}], "suggestions": [{"fix": "Check const authHeader = req.headers?.authorization and return res.status(401) when it is missing.", "problem": "Missing header guard", "why_it_matters": "The current code dereferences req.headers.authorization immediately, which can throw before any authentication decision is made."}, {"fix": "Split into exactly two parts, validate scheme === 'Bearer', and ensure token is non-empty before verifying.", "problem": "No Bearer format validation", "why_it_matters": "Using split(' ')[1] assumes a valid header shape and ignores whether the scheme is actually Bearer."}, {"fix": "Wrap jwt.verify in try/catch and convert token errors into 401 responses.", "problem": "Uncaught jwt.verify exceptions", "why_it_matters": "Expired or malformed tokens cause synchronous exceptions that can surface as 500 errors instead of controlled auth failures."}, {"fix": "Fail fast at startup or explicitly return a 500 configuration error when JWT_SECRET is missing.", "problem": "Unverified runtime configuration", "why_it_matters": "If process.env.JWT_SECRET is absent, authentication fails for every request and debugging becomes harder."}, {"fix": "Validate required claims after verification or map only expected fields onto req.user.", "problem": "Implicit trust in decoded payload", "why_it_matters": "Downstream authorization code may assume fields exist on req.user even when the token payload shape is unexpected."}, {"fix": "Pass an explicit algorithms array to jwt.verify that matches how your tokens are signed.", "problem": "Algorithm acceptance left implicit", "why_it_matters": "Relying on defaults makes security behavior less explicit and can lead to unsafe verification settings over time."}]}
\.


--
-- Data for Name: free_trials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.free_trials (id, fingerprint, used, created_at) FROM stdin;
7	fp_1781037850285_xugf9ojw	f	2026-06-09 20:44:56.260952
8	fp_1775055643783_5jcg0x0w	f	2026-06-14 18:02:41.652286
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, stripe_session_id, status, amount, created_at, tier, consumed, analysis_id, customer_email) FROM stdin;
1	cs_test_a1CUiMFOUk8Jh8LTImZIy7eERez8Sm3sVpzBdGsbH2LEPaHBb0zDhR7MRy	pending	250	2026-01-10 03:42:19.442466	max	f	\N	\N
2	cs_test_a1S1sbYqXnMNkvZiLoRWAl17UGWarWLuwmWFIKyk9V9MC4fCGwOR9aEItX	pending	250	2026-01-10 03:42:31.167755	max	f	\N	\N
3	cs_test_a1cmLoXepietBghWS2rE64wX7paKMR6WlqRNLPXHD8mcFjDEnJum1vzCrr	pending	100	2026-01-10 03:56:14.873628	pro	f	\N	\N
4	cs_test_a1MRhKcdA2am8z5w8A0a6IfrQTLE37JzYiWuOqZM8vUgLW2dSEcDlfjkkt	paid	50	2026-01-10 03:57:02.266844	lite	f	\N	\N
5	cs_test_a17imU2cIoSTddFrjBFVOLPpEk9fOJjQqLaO7qhFUnaqW6Zjz5mdl3G46m	pending	250	2026-01-10 03:59:32.764928	max	f	\N	\N
6	cs_test_a1tqkHotIFZxikeIro517WTyp0UAbhI8DfLOmIqP3C8B8YfB9O9jBlvWwC	pending	250	2026-01-10 04:00:20.105942	max	f	\N	\N
7	cs_test_a1QFv2N2Nl2TST6NUDSYVDI3rT75XDFmTqDQzw5vcXp4o8G2XgNkyr3LQG	pending	50	2026-01-10 05:06:32.98806	lite	f	\N	\N
8	cs_live_a1d59pm8gb7cEHPiquv2H1Y0HoHqjL8fqNZFOpPOxsLLsRDJFxzy108MAD	pending	50	2026-01-10 05:11:44.283894	lite	f	\N	\N
9	cs_live_a1UqkjrTQvSYukUrf1pbNGXuzTU4geQjOraNCQOxG1zVqMeiYi0OmoThDL	pending	50	2026-01-10 05:38:16.173318	lite	f	\N	\N
10	cs_live_a1fEDo9Jj7XOKN9HuOx8FBUhh6xtkrT1ZaX33MbctJBXK1paSTLSieFJcU	pending	50	2026-01-10 05:42:05.776298	lite	f	\N	\N
11	cs_live_a1DTHZwjvMK5nMgCXSFh5eR3pfpMbADAoCGJx2UO17z1Kpk2TyzsKsNaGH	pending	50	2026-06-09 20:42:26.79253	lite	f	\N	\N
12	cs_live_a1glwuEmm3IvUCsJKLq1VekWwNyiAFTnRjCyga8ARleWou830QFrDR9BEE	pending	250	2026-06-09 20:43:37.129075	max	f	\N	\N
13	cs_live_a1CYvNPpE9NSpn9XqJxxApK3HqIJBDWa9Khp0l7k80NvIkHxS7mEq1JWCN	pending	50	2026-06-09 21:29:18.79681	lite	f	\N	\N
\.


--
-- Data for Name: signals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.signals (id, agent_id, payload, insight, confidence, "timestamp") FROM stdin;
1	agent-001	{"asof": {"claim": "This checklist is still valid as of now (edge-case freshness).", "subject": {"id": "chk-771", "type": "checklist", "label": "Safety checklist v3"}, "freshness": {"stale_after": "2026-01-09T15:30:05Z", "max_age_seconds": 1800, "last_verified_at": "2026-01-09T15:00:05Z"}}, "agent": {"id": "agent_lite_01", "name": "lite-tester", "version": "1.0.0"}, "options": {"mode": "standard", "tier": "lite", "return_evidence": false, "return_explanations": false}, "payload": {"notes": "If your system handles time correctly, you should see verdict flip from VALID to STALE around stale_after."}, "session_id": "PASTE_SESSION_ID_HERE"}	As-of signal processed (LITE Tier)	0.87	2026-01-10 01:46:09.09465
2	agent-001	{"asof": {"claim": "The pricing rule is still current despite a reported change.", "context": {"domain": "commerce", "jurisdiction": "US", "risk_tolerance": "low"}, "signals": [{"name": "source_timestamp", "value": "2026-01-09T12:05:00Z", "weight": 0.55}, {"name": "change_log_hit", "value": true, "weight": 0.45}], "subject": {"id": "price-2026-jan", "type": "pricing_rule", "label": "Pricing rule January 2026"}, "freshness": {"stale_after": "2026-01-10T12:10:00Z", "max_age_seconds": 86400, "last_verified_at": "2026-01-09T12:10:00Z"}}, "agent": {"id": "agent_pro_02", "name": "pro-tester", "version": "1.0.0"}, "options": {"mode": "strict", "tier": "pro", "return_evidence": true, "return_explanations": true}, "payload": {"problem": "The source looks fresh but changelog says it changed. Low risk tolerance should push conservative action."}, "session_id": "PASTE_SESSION_ID_HERE"}	As-of signal processed (PRO Tier)	0.92	2026-01-10 01:46:34.768873
3	agent-001	{"asof": {"claim": "This compliance requirement is enforceable and unchanged as of now.", "context": {"domain": "compliance", "jurisdiction": "US-NY", "risk_tolerance": "low"}, "signals": [{"name": "source_timestamp", "value": "2026-01-09T11:59:50Z", "weight": 0.4}, {"name": "expiry_signal", "value": "2026-01-09T11:00:00Z", "weight": 0.4}, {"name": "authority_status", "value": "unknown", "weight": 0.2}], "subject": {"id": "req-8842", "type": "reg_requirement", "label": "Requirement 8842"}, "freshness": {"stale_after": "2026-01-09T12:00:00Z", "max_age_seconds": 7200, "last_verified_at": "2026-01-09T10:00:00Z"}}, "agent": {"id": "agent_max_03", "name": "max-tester", "version": "1.0.0"}, "options": {"mode": "strict", "tier": "max", "return_evidence": true, "return_explanations": true}, "payload": {"problem": "Source timestamp says fresh, expiry says it ended an hour ago, authority is unknown. Max tier should flag conflict."}, "session_id": "PASTE_SESSION_ID_HERE"}	As-of signal processed (MAX Tier)	0.98	2026-01-10 01:46:51.898629
4	agent-001	{"task": "cross_border_liquidity_audit", "priority": "high", "parameters": {"assets": ["USDC", "EURC", "SOL"], "signals": [{"key": "usdc_usd_price", "source": "chainlink_oracle", "freshness_max_ms": 15000}, {"key": "sol_usdc_liquidity", "source": "jupiter_v6_api", "route_plan": "optimal"}, {"id": "vault_z_01", "source": "internal_ledger_snapshot", "checksum": "sha256:e3b0c442"}], "thresholds": {"slippage": 0.005, "min_depth": 500000}, "verification_depth": "recursive"}, "strict_mode": true, "agent_context": "treasury_automated_agent_42"}	As-of signal processed (MAX Tier)	0.98	2026-01-10 01:49:40.299457
5	agent-001	{"asof": {"claim": "This cross-border transaction is compliant with current OFAC sanctions and AML requirements", "context": {"domain": "finance", "jurisdiction": "US-EU", "risk_tolerance": "low"}, "signals": [{"name": "ofac_screening_result", "value": "clear", "weight": 0.35}, {"name": "beneficial_owner_verified", "value": true, "weight": 0.25}, {"name": "source_of_funds_documented", "value": "partial", "weight": 0.2}, {"name": "pep_check_status", "value": "flagged_review", "weight": 0.2}], "subject": {"id": "txn-2026-0110-7834", "type": "wire_transfer", "label": "EUR to USD institutional transfer"}, "freshness": {"stale_after": "2026-01-10T04:00:00Z", "max_age_seconds": 10800, "last_verified_at": "2026-01-10T01:00:00Z"}}, "agent": {"id": "compliance_bot_01", "name": "AML-Checker", "version": "2.1.0"}, "options": {"mode": "strict", "tier": "max", "return_evidence": true, "return_explanations": true}}	As-of signal processed (LITE Tier)	0.87	2026-01-10 03:59:24.170202
6	test-agent	{"task": "test"}	UNKNOWN (FREE TRIAL) [GATED]	0.5	2026-04-01 15:03:45.882467
7	test-agent	{"task": "test"}	UNKNOWN (FREE TRIAL) [GATED]	0.5	2026-04-01 15:03:57.200739
8	test-compliance	{"asof": {"claim": "This cross-border transaction is compliant with current OFAC sanctions and AML requirements", "context": {"domain": "finance", "jurisdiction": "US-EU", "risk_tolerance": "low"}, "signals": [{"name": "ofac_screening_result", "value": "clear", "weight": 0.35}, {"name": "beneficial_owner_verified", "value": true, "weight": 0.25}, {"name": "source_of_funds_documented", "value": "partial", "weight": 0.2}, {"name": "pep_check_status", "value": "flagged_review", "weight": 0.2}], "subject": {"id": "txn-2026-0110", "type": "wire_transfer", "label": "EUR to USD transfer"}, "freshness": {"stale_after": "2027-01-10T04:00:00Z", "max_age_seconds": 10800, "last_verified_at": "2026-04-01T14:00:00Z"}}}	UNKNOWN (FREE TRIAL) [GATED]	0.5	2026-04-01 15:40:59.615273
9	test-compliance	{"asof": {"claim": "This cross-border transaction is compliant with current OFAC sanctions and AML requirements", "context": {"domain": "finance", "jurisdiction": "US-EU", "risk_tolerance": "low"}, "signals": [{"name": "ofac_screening_result", "value": "clear", "weight": 0.35}, {"name": "beneficial_owner_verified", "value": true, "weight": 0.25}, {"name": "source_of_funds_documented", "value": "partial", "weight": 0.2}, {"name": "pep_check_status", "value": "flagged_review", "weight": 0.2}], "subject": {"id": "txn-2026-0110", "type": "wire_transfer", "label": "EUR to USD transfer"}, "freshness": {"stale_after": "2027-01-10T04:00:00Z", "max_age_seconds": 10800, "last_verified_at": "2026-04-01T14:00:00Z"}}}	CONFLICTED (FREE TRIAL) [GATED]	0.7	2026-04-01 15:41:15.549508
10	test-all-clear	{"asof": {"claim": "System is healthy", "signals": [{"name": "health_check", "value": "pass", "weight": 0.5}, {"name": "uptime", "value": "verified", "weight": 0.5}], "freshness": {"stale_after": "2027-01-01T00:00:00Z"}}}	VALID (FREE TRIAL) [GATED]	0.8	2026-04-01 15:41:23.797301
11	test-stale	{"asof": {"claim": "This data is current", "signals": [{"name": "data_source", "value": "verified", "weight": 0.5}], "freshness": {"stale_after": "2025-01-01T00:00:00Z", "max_age_seconds": 3600, "last_verified_at": "2025-01-01T00:00:00Z"}}}	STALE (FREE TRIAL) [GATED]	0.95	2026-04-01 15:41:30.407611
\.


--
-- Data for Name: _managed_webhooks; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe._managed_webhooks (id, object, url, enabled_events, description, enabled, livemode, metadata, secret, status, api_version, created, updated_at, last_synced_at, account_id) FROM stdin;
we_1Sns7eIQVqXNWHV166mWP3Nu	webhook_endpoint	https://1946ad19-49e8-49ad-9773-df68998f6d25-00-3f9mhrwwz4pnt.picard.replit.dev/api/stripe/webhook	["charge.captured", "charge.dispute.closed", "charge.dispute.created", "charge.dispute.funds_reinstated", "charge.dispute.funds_withdrawn", "charge.dispute.updated", "charge.expired", "charge.failed", "charge.pending", "charge.refund.updated", "charge.refunded", "charge.succeeded", "charge.updated", "checkout.session.async_payment_failed", "checkout.session.async_payment_succeeded", "checkout.session.completed", "checkout.session.expired", "credit_note.created", "credit_note.updated", "credit_note.voided", "customer.created", "customer.deleted", "customer.subscription.created", "customer.subscription.deleted", "customer.subscription.paused", "customer.subscription.pending_update_applied", "customer.subscription.pending_update_expired", "customer.subscription.resumed", "customer.subscription.trial_will_end", "customer.subscription.updated", "customer.tax_id.created", "customer.tax_id.deleted", "customer.tax_id.updated", "customer.updated", "entitlements.active_entitlement_summary.updated", "invoice.created", "invoice.deleted", "invoice.finalization_failed", "invoice.finalized", "invoice.marked_uncollectible", "invoice.paid", "invoice.payment_action_required", "invoice.payment_failed", "invoice.payment_succeeded", "invoice.sent", "invoice.upcoming", "invoice.updated", "invoice.voided", "payment_intent.amount_capturable_updated", "payment_intent.canceled", "payment_intent.created", "payment_intent.partially_funded", "payment_intent.payment_failed", "payment_intent.processing", "payment_intent.requires_action", "payment_intent.succeeded", "payment_method.attached", "payment_method.automatically_updated", "payment_method.card_automatically_updated", "payment_method.detached", "payment_method.updated", "plan.created", "plan.deleted", "plan.updated", "price.created", "price.deleted", "price.updated", "product.created", "product.deleted", "product.updated", "radar.early_fraud_warning.created", "radar.early_fraud_warning.updated", "refund.created", "refund.failed", "refund.updated", "review.closed", "review.opened", "setup_intent.canceled", "setup_intent.created", "setup_intent.requires_action", "setup_intent.setup_failed", "setup_intent.succeeded", "subscription_schedule.aborted", "subscription_schedule.canceled", "subscription_schedule.completed", "subscription_schedule.created", "subscription_schedule.expiring", "subscription_schedule.released", "subscription_schedule.updated"]	\N	\N	f	{"managed_by": "stripe-sync"}	whsec_5qn5WP6UKmunfkouPjD0J6sJCpvpLB90	enabled	\N	1768012910	2026-01-10 02:41:51.033479+00	2026-01-10 02:41:51.031+00	acct_1SnqwNIQVqXNWHV1
we_1TgbXpAGtLlBc3WPfmPoXezv	webhook_endpoint	https://1946ad19-49e8-49ad-9773-df68998f6d25-00-3f9mhrwwz4pnt.picard.replit.dev/api/stripe/webhook	["charge.captured", "charge.dispute.closed", "charge.dispute.created", "charge.dispute.funds_reinstated", "charge.dispute.funds_withdrawn", "charge.dispute.updated", "charge.expired", "charge.failed", "charge.pending", "charge.refund.updated", "charge.refunded", "charge.succeeded", "charge.updated", "checkout.session.async_payment_failed", "checkout.session.async_payment_succeeded", "checkout.session.completed", "checkout.session.expired", "credit_note.created", "credit_note.updated", "credit_note.voided", "customer.created", "customer.deleted", "customer.subscription.created", "customer.subscription.deleted", "customer.subscription.paused", "customer.subscription.pending_update_applied", "customer.subscription.pending_update_expired", "customer.subscription.resumed", "customer.subscription.trial_will_end", "customer.subscription.updated", "customer.tax_id.created", "customer.tax_id.deleted", "customer.tax_id.updated", "customer.updated", "entitlements.active_entitlement_summary.updated", "invoice.created", "invoice.deleted", "invoice.finalization_failed", "invoice.finalized", "invoice.marked_uncollectible", "invoice.paid", "invoice.payment_action_required", "invoice.payment_failed", "invoice.payment_succeeded", "invoice.sent", "invoice.upcoming", "invoice.updated", "invoice.voided", "payment_intent.amount_capturable_updated", "payment_intent.canceled", "payment_intent.created", "payment_intent.partially_funded", "payment_intent.payment_failed", "payment_intent.processing", "payment_intent.requires_action", "payment_intent.succeeded", "payment_method.attached", "payment_method.automatically_updated", "payment_method.card_automatically_updated", "payment_method.detached", "payment_method.updated", "plan.created", "plan.deleted", "plan.updated", "price.created", "price.deleted", "price.updated", "product.created", "product.deleted", "product.updated", "radar.early_fraud_warning.created", "radar.early_fraud_warning.updated", "refund.created", "refund.failed", "refund.updated", "review.closed", "review.opened", "setup_intent.canceled", "setup_intent.created", "setup_intent.requires_action", "setup_intent.setup_failed", "setup_intent.succeeded", "subscription_schedule.aborted", "subscription_schedule.canceled", "subscription_schedule.completed", "subscription_schedule.created", "subscription_schedule.expiring", "subscription_schedule.released", "subscription_schedule.updated"]	\N	\N	t	{"managed_by": "stripe-sync"}	whsec_d9FlKfDDhGi8PEBKYorNXKEntWtPoXjd	enabled	\N	1781057225	2026-06-10 02:07:05.068896+00	2026-06-10 02:07:05.068+00	acct_1SlePoAGtLlBc3WP
\.


--
-- Data for Name: _migrations; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe._migrations (id, name, hash, executed_at) FROM stdin;
0	initial_migration	c18983eedaa79cc2f6d92727d70c4f772256ef3d	2026-01-10 02:41:37.338505
1	products	b99ffc23df668166b94156f438bfa41818d4e80c	2026-01-10 02:41:37.34466
2	customers	33e481247ddc217f4e27ad10dfe5430097981670	2026-01-10 02:41:37.35909
3	prices	7d5ff35640651606cc24cec8a73ff7c02492ecdf	2026-01-10 02:41:37.373232
4	subscriptions	2cc6121a943c2a623c604e5ab12118a57a6c329a	2026-01-10 02:41:37.399456
5	invoices	7fbb4ccb4ed76a830552520739aaa163559771b1	2026-01-10 02:41:37.414298
6	charges	fb284ed969f033f5ce19f479b7a7e27871bddf09	2026-01-10 02:41:37.427953
7	coupons	7ed6ec4133f120675fd7888c0477b6281743fede	2026-01-10 02:41:37.441873
8	disputes	29bdb083725efe84252647f043f5f91cd0dabf43	2026-01-10 02:41:37.456576
9	events	b28cb55b5b69a9f52ef519260210cd76eea3c84e	2026-01-10 02:41:37.471482
10	payouts	69d1050b88bba1024cea4a671f9633ce7bfe25ff	2026-01-10 02:41:37.4848
11	plans	fc1ae945e86d1222a59cbcd3ae7e81a3a282a60c	2026-01-10 02:41:37.497636
12	add_updated_at	1d80945ef050a17a26e35e9983a58178262470f2	2026-01-10 02:41:37.51099
13	add_subscription_items	2aa63409bfe910add833155ad7468cdab844e0f1	2026-01-10 02:41:37.539194
14	migrate_subscription_items	8c2a798b44a8a0d83ede6f50ea7113064ecc1807	2026-01-10 02:41:37.554318
15	add_customer_deleted	6886ddfd8c129d3c4b39b59519f92618b397b395	2026-01-10 02:41:37.56307
16	add_invoice_indexes	d6bb9a09d5bdf580986ed14f55db71227a4d356d	2026-01-10 02:41:37.567933
17	drop_charges_unavailable_columns	61cd5adec4ae2c308d2c33d1b0ed203c7d074d6a	2026-01-10 02:41:37.580847
18	setup_intents	1d45d0fa47fc145f636c9e3c1ea692417fbb870d	2026-01-10 02:41:37.592663
19	payment_methods	705bdb15b50f1a97260b4f243008b8a34d23fb09	2026-01-10 02:41:37.610666
20	disputes_payment_intent_created_idx	18b2cecd7c097a7ea3b3f125f228e8790288d5ca	2026-01-10 02:41:37.628816
21	payment_intent	b1f194ff521b373c4c7cf220c0feadc253ebff0b	2026-01-10 02:41:37.637679
22	adjust_plans	e4eae536b0bc98ee14d78e818003952636ee877c	2026-01-10 02:41:37.659583
23	invoice_deleted	78e864c3146174fee7d08f05226b02d931d5b2ae	2026-01-10 02:41:37.664556
24	subscription_schedules	85fa6adb3815619bb17e1dafb00956ff548f7332	2026-01-10 02:41:37.669424
25	tax_ids	3f9a1163533f9e60a53d61dae5e451ab937584d9	2026-01-10 02:41:37.684179
26	credit_notes	e099b6b04ee607ee868d82af5193373c3fc266d2	2026-01-10 02:41:37.702552
27	add_marketing_features_to_products	6ed1774b0a9606c5937b2385d61057408193e8a7	2026-01-10 02:41:37.724803
28	early_fraud_warning	e615b0b73fa13d3b0508a1956d496d516f0ebf40	2026-01-10 02:41:37.731645
29	reviews	dd3f914139725a7934dc1062de4cc05aece77aea	2026-01-10 02:41:37.758652
30	refunds	f76c4e273eccdc96616424d73967a9bea3baac4e	2026-01-10 02:41:37.784356
31	add_default_price	6d10566a68bc632831fa25332727d8ff842caec5	2026-01-10 02:41:37.811057
32	update_subscription_items	e894858d46840ba4be5ea093cdc150728bd1d66f	2026-01-10 02:41:37.81567
33	add_last_synced_at	43124eb65b18b70c54d57d2b4fcd5dae718a200f	2026-01-10 02:41:37.820921
34	remove_foreign_keys	e72ec19f3232cf6e6b7308ebab80341c2341745f	2026-01-10 02:41:37.831457
35	checkout_sessions	dc294f5bb1a4d613be695160b38a714986800a75	2026-01-10 02:41:37.838365
36	checkout_session_line_items	82c8cfce86d68db63a9fa8de973bfe60c91342dd	2026-01-10 02:41:37.870664
37	add_features	c68a2c2b7e3808eed28c8828b2ffd3a2c9bf2bd4	2026-01-10 02:41:37.893717
38	active_entitlement	5b3858e7a52212b01e7f338cf08e29767ab362af	2026-01-10 02:41:37.913032
39	add_paused_to_subscription_status	09012b5d128f6ba25b0c8f69a1203546cf1c9f10	2026-01-10 02:41:37.940521
40	managed_webhooks	1d453dfd0e27ff0c2de97955c4ec03919af0af7f	2026-01-10 02:41:37.946531
41	rename_managed_webhooks	ad7cd1e4971a50790bf997cd157f3403d294484f	2026-01-10 02:41:37.980297
42	convert_to_jsonb_generated_columns	e0703a0e5cd9d97db53d773ada1983553e37813c	2026-01-10 02:41:37.986941
43	add_account_id	9a6beffdd0972e3657b7118b2c5001be1f815faf	2026-01-10 02:41:43.401144
44	make_account_id_required	05c1e9145220e905e0c1ca5329851acaf7e9e506	2026-01-10 02:41:43.418609
45	sync_status	2f88c4883fa885a6eaa23b8b02da958ca77a1c21	2026-01-10 02:41:43.438308
46	sync_status_per_account	b1f1f3d4fdb4b4cf4e489d4b195c7f0f97f9f27c	2026-01-10 02:41:43.458673
47	api_key_hashes	8046e4c57544b8eae277b057d201a28a4529ffe3	2026-01-10 02:41:43.512311
48	rename_reserved_columns	e32290f655550ed308a7f2dcb5b0114e49a0558e	2026-01-10 02:41:43.519322
49	remove_redundant_underscores_from_metadata_tables	96d6f3a54e17d8e19abd022a030a95a6161bf73e	2026-01-10 02:41:49.567849
50	rename_id_to_match_stripe_api	c5300c5a10081c033dab9961f4e3cd6a2440c2b6	2026-01-10 02:41:49.589438
51	remove_webhook_uuid	289bee08167858dbf4d04ca184f42681660ebb66	2026-01-10 02:41:50.045977
52	webhook_url_uniqueness	d02aec1815ce3a108b8a1def1ff24e865b26db70	2026-01-10 02:41:50.052388
\.


--
-- Data for Name: _sync_status; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe._sync_status (id, resource, status, last_synced_at, last_incremental_cursor, error_message, updated_at, account_id) FROM stdin;
\.


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.accounts (_raw_data, first_synced_at, _last_synced_at, _updated_at, api_key_hashes) FROM stdin;
{"id": "acct_1SnqwNIQVqXNWHV1", "type": "standard", "email": null, "object": "account", "country": "US", "settings": {"payouts": {"schedule": {"interval": "daily", "delay_days": 2}, "statement_descriptor": null, "debit_negative_balances": true}, "branding": {"icon": null, "logo": null, "primary_color": null, "secondary_color": null}, "invoices": {"default_account_tax_ids": null, "hosted_payment_method_save": "offer"}, "payments": {"statement_descriptor": null, "statement_descriptor_kana": null, "statement_descriptor_kanji": null}, "dashboard": {"timezone": "Etc/UTC", "display_name": "AsOf Automate Sandbox"}, "card_issuing": {"tos_acceptance": {"ip": null, "date": null}}, "card_payments": {"statement_descriptor_prefix": null, "statement_descriptor_prefix_kana": null, "statement_descriptor_prefix_kanji": null}, "bacs_debit_payments": {"display_name": null, "service_user_number": null}, "sepa_debit_payments": {}}, "controller": {"type": "account"}, "capabilities": {}, "business_type": null, "charges_enabled": false, "payouts_enabled": false, "business_profile": {"mcc": null, "url": null, "name": null, "support_url": null, "support_email": null, "support_phone": null, "annual_revenue": null, "support_address": null, "estimated_worker_count": null, "minority_owned_business_designation": null}, "default_currency": "usd", "details_submitted": false}	2026-01-10 02:41:50.540987+00	2026-01-10 02:41:50.540987+00	2026-01-10 02:41:50.540987+00	{924c49264fd5369660446fb59c0782d9a4a389e7c3c337ad5a705da0ae57aa8b}
{"id": "acct_1SlePoAGtLlBc3WP", "type": "standard", "email": "aseaofdesigns@gmail.com", "object": "account", "company": {"name": "Shannon Ashby"}, "country": "US", "settings": {"payouts": {"schedule": {"interval": "manual", "delay_days": 2}, "statement_descriptor": null, "debit_negative_balances": true}, "branding": {"icon": null, "logo": null, "primary_color": null, "secondary_color": null}, "invoices": {"default_account_tax_ids": null, "hosted_payment_method_save": "offer"}, "payments": {"statement_descriptor": "ASOFAI.COM", "statement_descriptor_kana": null, "statement_descriptor_kanji": null}, "dashboard": {"timezone": "America/New_York", "display_name": "Shannon Ashby"}, "card_issuing": {"tos_acceptance": {"ip": null, "date": null}}, "card_payments": {"statement_descriptor_prefix": "ASOFAICOM", "statement_descriptor_prefix_kana": null, "statement_descriptor_prefix_kanji": null}, "bacs_debit_payments": {"display_name": null, "service_user_number": null}, "sepa_debit_payments": {}}, "controller": {"type": "account"}, "individual": {"id": "person_1SnUNsAGtLlBc3WPPDd4gXZU", "email": "aseaofdesigns@gmail.com", "object": "person", "account": "acct_1SlePoAGtLlBc3WP", "created": 1767921661, "last_name": "Ashby", "first_name": "Shannon", "relationship": {"owner": false, "title": null, "director": false, "executive": false, "authorizer": false, "legal_guardian": false, "representative": true, "percent_ownership": null}}, "capabilities": {"transfers": "active", "eps_payments": "active", "pix_payments": "active", "card_payments": "active", "link_payments": "active", "affirm_payments": "active", "crypto_payments": "inactive", "klarna_payments": "active", "cashapp_payments": "active", "acss_debit_payments": "active", "amazon_pay_payments": "active", "bancontact_payments": "active", "cartes_bancaires_payments": "pending", "afterpay_clearpay_payments": "active", "us_bank_account_ach_payments": "active"}, "business_type": "individual", "charges_enabled": true, "payouts_enabled": true, "business_profile": {"mcc": "5734", "url": "asofai.com", "name": "Shannon Ashby", "support_url": null, "support_email": null, "support_phone": "+14045731898", "annual_revenue": null, "support_address": {"city": "Lawrenceville", "line1": "1870 Henderson Way Northwest", "line2": null, "state": "GA", "country": "US", "postal_code": "30043"}, "estimated_worker_count": null, "minority_owned_business_designation": null}, "default_currency": "usd", "details_submitted": true}	2026-01-10 05:09:15.742592+00	2026-01-10 05:09:15.742592+00	2026-01-10 05:09:15.742592+00	{067968ac273cb1aea881144fc704fb4dec2a29e2c031013ef512f1a26145a961}
\.


--
-- Data for Name: active_entitlements; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.active_entitlements (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: charges; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.charges (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
2026-01-10 03:58:57.465789+00	2026-01-10 03:58:57+00	{"id": "ch_3SntKDIQVqXNWHV102PimAYA", "paid": true, "order": null, "amount": 50, "object": "charge", "review": null, "source": null, "status": "succeeded", "created": 1768017534, "dispute": null, "outcome": {"type": "authorized", "reason": null, "risk_level": "normal", "risk_score": 52, "advice_code": null, "network_status": "approved_by_network", "seller_message": "Payment complete.", "network_advice_code": null, "network_decline_code": null}, "captured": true, "currency": "usd", "customer": null, "disputed": false, "livemode": false, "metadata": {}, "refunded": false, "shipping": null, "application": null, "description": null, "destination": null, "receipt_url": "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xU25xd05JUVZxWE5XSFYxKIGdh8sGMgZpsp2qOZE6LBbk_EW_A_OIxaj5nWaa5aihIV5LN6mwCC6kO5-x2qsYTmRR6L1XGS_-Z5Jj", "failure_code": null, "on_behalf_of": null, "fraud_details": {}, "radar_options": {}, "receipt_email": null, "transfer_data": null, "payment_intent": "pi_3SntKDIQVqXNWHV10RS0STfh", "payment_method": "pm_1SntKDIQVqXNWHV1YzdqY2Uh", "receipt_number": null, "transfer_group": null, "amount_captured": 50, "amount_refunded": 0, "application_fee": null, "billing_details": {"name": "Test Test", "email": "aseaofdesigns@gmail.com", "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "12345"}}, "failure_message": null, "source_transfer": null, "balance_transaction": "txn_3SntKDIQVqXNWHV10C4M6pmg", "statement_descriptor": null, "application_fee_amount": null, "payment_method_details": {"card": {"brand": "visa", "last4": "4242", "checks": {"cvc_check": "pass", "address_line1_check": null, "address_postal_code_check": "pass"}, "wallet": null, "country": "US", "funding": "credit", "mandate": null, "network": "visa", "exp_year": 2030, "exp_month": 12, "fingerprint": "Uoeq1N4p3ebaYZpy", "overcapture": {"status": "unavailable", "maximum_amount_capturable": 50}, "installments": null, "multicapture": {"status": "unavailable"}, "network_token": {"used": false}, "three_d_secure": null, "regulated_status": "unregulated", "amount_authorized": 50, "authorization_code": "564268", "extended_authorization": {"status": "disabled"}, "network_transaction_id": "851111011134978", "incremental_authorization": {"status": "unavailable"}}, "type": "card"}, "failure_balance_transaction": null, "statement_descriptor_suffix": null, "calculated_statement_descriptor": "Stripe"}	acct_1SnqwNIQVqXNWHV1
2026-03-20 19:57:35.412782+00	2026-03-20 19:57:35+00	{"id": "ch_3TD9AlAGtLlBc3WP1PIUZDC0", "paid": true, "order": null, "amount": 250, "object": "charge", "review": null, "source": null, "status": "succeeded", "created": 1774036651, "dispute": null, "outcome": {"type": "authorized", "reason": null, "risk_level": "normal", "advice_code": null, "network_status": "approved_by_network", "seller_message": "Payment complete.", "network_advice_code": null, "network_decline_code": null}, "captured": true, "currency": "usd", "customer": null, "disputed": false, "livemode": true, "metadata": {}, "refunded": false, "shipping": null, "application": null, "description": null, "destination": null, "receipt_url": "https://pay.stripe.com/receipts/payment/CAcQARoXChVhY2N0XzFTbGVQb0FHdExsQmMzV1Aor832zQYyBvB5O2rdAjosFoSwmiS3aBUi5HgMZZiJRoKZyXWt0ozV2mXqOmZLtdHgxT0QymM7BeEjtVk", "failure_code": null, "on_behalf_of": null, "fraud_details": {}, "radar_options": {}, "receipt_email": null, "transfer_data": null, "payment_intent": "pi_3TD9AlAGtLlBc3WP1QOmDKJY", "payment_method": "pm_1TD9AkAGtLlBc3WP3C6N55LZ", "receipt_number": null, "transfer_group": null, "amount_captured": 250, "amount_refunded": 0, "application_fee": null, "billing_details": {"name": "Shannon E Ashby", "email": "aseaofdesigns@gmail.com", "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "30043"}}, "failure_message": null, "source_transfer": null, "balance_transaction": "txn_3TD9AlAGtLlBc3WP1BleDcFq", "statement_descriptor": null, "application_fee_amount": null, "payment_method_details": {"card": {"brand": "visa", "last4": "7720", "checks": {"cvc_check": "pass", "address_line1_check": null, "address_postal_code_check": "pass"}, "wallet": null, "country": "US", "funding": "debit", "mandate": null, "network": "visa", "exp_year": 2027, "exp_month": 12, "fingerprint": "Ym4hiZ5TxjAb0nI2", "overcapture": {"status": "unavailable", "maximum_amount_capturable": 250}, "installments": null, "multicapture": {"status": "unavailable"}, "network_token": {"used": false}, "three_d_secure": null, "regulated_status": "regulated", "amount_authorized": 250, "authorization_code": "011493", "extended_authorization": {"status": "disabled"}, "network_transaction_id": "586079718513278", "incremental_authorization": {"status": "unavailable"}}, "type": "card"}, "failure_balance_transaction": null, "statement_descriptor_suffix": null, "calculated_statement_descriptor": "ASOFAI.COM"}	acct_1SlePoAGtLlBc3WP
2026-03-20 20:23:42.471543+00	2026-03-20 20:23:41+00	{"id": "ch_3TD9a1AGtLlBc3WP18s3IWvq", "paid": true, "order": null, "amount": 250, "object": "charge", "review": null, "source": null, "status": "succeeded", "created": 1774038217, "dispute": null, "outcome": {"type": "authorized", "reason": null, "risk_level": "normal", "advice_code": null, "network_status": "approved_by_network", "seller_message": "Payment complete.", "network_advice_code": null, "network_decline_code": null}, "captured": true, "currency": "usd", "customer": null, "disputed": false, "livemode": true, "metadata": {}, "refunded": false, "shipping": null, "application": null, "description": null, "destination": null, "receipt_url": "https://pay.stripe.com/receipts/payment/CAcQARoXChVhY2N0XzFTbGVQb0FHdExsQmMzV1Aozdn2zQYyBpAIniwtDDosFhRGFip2rHq9WP8MHSOE8Vs6-gZRnNOZ_EkwCTyZb5VPjOL_u-MTbTcNo-M", "failure_code": null, "on_behalf_of": null, "fraud_details": {}, "radar_options": {}, "receipt_email": null, "transfer_data": null, "payment_intent": "pi_3TD9a1AGtLlBc3WP1BsX7YbP", "payment_method": "pm_1TD9a0AGtLlBc3WPOAsXbfeM", "receipt_number": null, "transfer_group": null, "amount_captured": 250, "amount_refunded": 0, "application_fee": null, "billing_details": {"name": "Shannon E Ashby", "email": "aseaofdesigns@gmail.com", "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "30043"}}, "failure_message": null, "source_transfer": null, "balance_transaction": "txn_3TD9a1AGtLlBc3WP1dGVuc6O", "statement_descriptor": null, "application_fee_amount": null, "payment_method_details": {"card": {"brand": "visa", "last4": "7720", "checks": {"cvc_check": "pass", "address_line1_check": null, "address_postal_code_check": "pass"}, "wallet": null, "country": "US", "funding": "debit", "mandate": null, "network": "visa", "exp_year": 2027, "exp_month": 12, "fingerprint": "Ym4hiZ5TxjAb0nI2", "overcapture": {"status": "unavailable", "maximum_amount_capturable": 250}, "installments": null, "multicapture": {"status": "unavailable"}, "network_token": {"used": false}, "three_d_secure": null, "regulated_status": "regulated", "amount_authorized": 250, "authorization_code": "013258", "extended_authorization": {"status": "disabled"}, "network_transaction_id": "346079734182140", "incremental_authorization": {"status": "unavailable"}}, "type": "card"}, "failure_balance_transaction": null, "statement_descriptor_suffix": null, "calculated_statement_descriptor": "ASOFAI.COM"}	acct_1SlePoAGtLlBc3WP
2026-03-20 20:37:22.723424+00	2026-03-20 20:37:22+00	{"id": "ch_3TD9nHAGtLlBc3WP2AAXD2iX", "paid": false, "order": null, "amount": 250, "object": "charge", "review": null, "source": null, "status": "failed", "created": 1774039041, "dispute": null, "outcome": {"type": "issuer_declined", "reason": "insufficient_funds", "risk_level": "normal", "advice_code": "try_again_later", "network_status": "declined_by_network", "seller_message": "The bank returned the decline code `insufficient_funds`.", "network_advice_code": "02", "network_decline_code": "51"}, "captured": false, "currency": "usd", "customer": null, "disputed": false, "livemode": true, "metadata": {}, "refunded": false, "shipping": null, "application": null, "description": null, "destination": null, "receipt_url": null, "failure_code": "card_declined", "on_behalf_of": null, "fraud_details": {}, "radar_options": {}, "receipt_email": null, "transfer_data": null, "payment_intent": "pi_3TD9nHAGtLlBc3WP2AEMsoAX", "payment_method": "pm_1TD9nGAGtLlBc3WPo0l4390r", "receipt_number": null, "transfer_group": null, "amount_captured": 0, "amount_refunded": 0, "application_fee": null, "billing_details": {"name": "Shannon E Ashby", "email": "aseaofdesigns@gmail.com", "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "30043"}}, "failure_message": "Your card has insufficient funds.", "source_transfer": null, "balance_transaction": null, "statement_descriptor": null, "application_fee_amount": null, "payment_method_details": {"card": {"brand": "visa", "last4": "7720", "checks": {"cvc_check": "pass", "address_line1_check": null, "address_postal_code_check": "pass"}, "wallet": null, "country": "US", "funding": "debit", "mandate": null, "network": "visa", "exp_year": 2027, "exp_month": 12, "fingerprint": "Ym4hiZ5TxjAb0nI2", "overcapture": {"status": "unavailable", "maximum_amount_capturable": 250}, "installments": null, "multicapture": {"status": "unavailable"}, "network_token": {"used": false}, "three_d_secure": null, "regulated_status": "regulated", "amount_authorized": null, "authorization_code": null, "extended_authorization": {"status": "disabled"}, "network_transaction_id": "356079742411916", "incremental_authorization": {"status": "unavailable"}}, "type": "card"}, "failure_balance_transaction": null, "statement_descriptor_suffix": null, "calculated_statement_descriptor": "ASOFAI.COM"}	acct_1SlePoAGtLlBc3WP
2026-03-20 20:39:19.560243+00	2026-03-20 20:39:19+00	{"id": "ch_3TD9nHAGtLlBc3WP2XF3nmii", "paid": true, "order": null, "amount": 250, "object": "charge", "review": null, "source": null, "status": "succeeded", "created": 1774039155, "dispute": null, "outcome": {"type": "authorized", "reason": null, "risk_level": "normal", "advice_code": null, "network_status": "approved_by_network", "seller_message": "Payment complete.", "network_advice_code": null, "network_decline_code": null}, "captured": true, "currency": "usd", "customer": null, "disputed": false, "livemode": true, "metadata": {}, "refunded": false, "shipping": null, "application": null, "description": null, "destination": null, "receipt_url": "https://pay.stripe.com/receipts/payment/CAcQARoXChVhY2N0XzFTbGVQb0FHdExsQmMzV1Ao9-D2zQYyBpG-EbCAeTosFt8sj-2QVbHCSmA63-_wprvvtQtCxLESXy4PnKUAep-EF2-UotjiyNg2HYI", "failure_code": null, "on_behalf_of": null, "fraud_details": {}, "radar_options": {}, "receipt_email": null, "transfer_data": null, "payment_intent": "pi_3TD9nHAGtLlBc3WP2AEMsoAX", "payment_method": "pm_1TD9p6AGtLlBc3WP9XUK2y88", "receipt_number": null, "transfer_group": null, "amount_captured": 250, "amount_refunded": 0, "application_fee": null, "billing_details": {"name": "Shannon E Ashby", "email": "aseaofdesigns@gmail.com", "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "30043"}}, "failure_message": null, "source_transfer": null, "balance_transaction": "txn_3TD9nHAGtLlBc3WP20gPb4iJ", "statement_descriptor": null, "application_fee_amount": null, "payment_method_details": {"card": {"brand": "visa", "last4": "7720", "checks": {"cvc_check": "pass", "address_line1_check": null, "address_postal_code_check": "pass"}, "wallet": null, "country": "US", "funding": "debit", "mandate": null, "network": "visa", "exp_year": 2027, "exp_month": 12, "fingerprint": "Ym4hiZ5TxjAb0nI2", "overcapture": {"status": "unavailable", "maximum_amount_capturable": 250}, "installments": null, "multicapture": {"status": "unavailable"}, "network_token": {"used": false}, "three_d_secure": null, "regulated_status": "regulated", "amount_authorized": 250, "authorization_code": "098736", "extended_authorization": {"status": "disabled"}, "network_transaction_id": "346079743553950", "incremental_authorization": {"status": "unavailable"}}, "type": "card"}, "failure_balance_transaction": null, "statement_descriptor_suffix": null, "calculated_statement_descriptor": "ASOFAI.COM"}	acct_1SlePoAGtLlBc3WP
2026-03-20 20:41:02.065021+00	2026-03-20 20:41:01+00	{"id": "ch_3TD9qnAGtLlBc3WP09ljlHvs", "paid": true, "order": null, "amount": 50, "object": "charge", "review": null, "source": null, "status": "succeeded", "created": 1774039258, "dispute": null, "outcome": {"type": "authorized", "reason": null, "risk_level": "normal", "advice_code": null, "network_status": "approved_by_network", "seller_message": "Payment complete.", "network_advice_code": null, "network_decline_code": null}, "captured": true, "currency": "usd", "customer": null, "disputed": false, "livemode": true, "metadata": {}, "refunded": false, "shipping": null, "application": null, "description": null, "destination": null, "receipt_url": "https://pay.stripe.com/receipts/payment/CAcQARoXChVhY2N0XzFTbGVQb0FHdExsQmMzV1Ao3eH2zQYyBsfe_V3HCDosFpE_r5TRkMZ-4O1cJd-l3xhRDJzRprr8ouIotp9lxuSNgvrThceP-XuAmrQ", "failure_code": null, "on_behalf_of": null, "fraud_details": {}, "radar_options": {}, "receipt_email": null, "transfer_data": null, "payment_intent": "pi_3TD9qnAGtLlBc3WP0uzDf9jv", "payment_method": "pm_1TD9qmAGtLlBc3WPZmjpd8K2", "receipt_number": null, "transfer_group": null, "amount_captured": 50, "amount_refunded": 0, "application_fee": null, "billing_details": {"name": "Shannon E Ashby", "email": "aseaofdesigns@gmail.com", "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "30043"}}, "failure_message": null, "source_transfer": null, "balance_transaction": "txn_3TD9qnAGtLlBc3WP0GNzpMfh", "statement_descriptor": null, "application_fee_amount": null, "payment_method_details": {"card": {"brand": "visa", "last4": "7720", "checks": {"cvc_check": "pass", "address_line1_check": null, "address_postal_code_check": "pass"}, "wallet": null, "country": "US", "funding": "debit", "mandate": null, "network": "visa", "exp_year": 2027, "exp_month": 12, "fingerprint": "Ym4hiZ5TxjAb0nI2", "overcapture": {"status": "unavailable", "maximum_amount_capturable": 50}, "installments": null, "multicapture": {"status": "unavailable"}, "network_token": {"used": false}, "three_d_secure": null, "regulated_status": "regulated", "amount_authorized": 50, "authorization_code": "055250", "extended_authorization": {"status": "disabled"}, "network_transaction_id": "586079744587250", "incremental_authorization": {"status": "unavailable"}}, "type": "card"}, "failure_balance_transaction": null, "statement_descriptor_suffix": null, "calculated_statement_descriptor": "ASOFAI.COM"}	acct_1SlePoAGtLlBc3WP
2026-03-20 21:48:12.091924+00	2026-03-20 21:48:11+00	{"id": "ch_3TDAtnAGtLlBc3WP04CQbYPU", "paid": true, "order": null, "amount": 50, "object": "charge", "review": null, "source": null, "status": "succeeded", "created": 1774043287, "dispute": null, "outcome": {"type": "authorized", "reason": null, "risk_level": "normal", "advice_code": null, "network_status": "approved_by_network", "seller_message": "Payment complete.", "network_advice_code": null, "network_decline_code": null}, "captured": true, "currency": "usd", "customer": null, "disputed": false, "livemode": true, "metadata": {}, "refunded": false, "shipping": null, "application": null, "description": null, "destination": null, "receipt_url": "https://pay.stripe.com/receipts/payment/CAcQARoXChVhY2N0XzFTbGVQb0FHdExsQmMzV1Aom4H3zQYyBi9axG7rozosFh09zfTouoUyhDWuft_8h6yc61-L42VoJcSZEhLTF6XRXeMAhwWGgbV-AQs", "failure_code": null, "on_behalf_of": null, "fraud_details": {}, "radar_options": {}, "receipt_email": null, "transfer_data": null, "payment_intent": "pi_3TDAtnAGtLlBc3WP0R4ie0IJ", "payment_method": "pm_1TDAtmAGtLlBc3WPw5lq0uYf", "receipt_number": null, "transfer_group": null, "amount_captured": 50, "amount_refunded": 0, "application_fee": null, "billing_details": {"name": "Shannon E Ashby", "email": "aseaofdesigns@gmail.com", "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "30043"}}, "failure_message": null, "source_transfer": null, "balance_transaction": "txn_3TDAtnAGtLlBc3WP0eFXxtZv", "statement_descriptor": null, "application_fee_amount": null, "payment_method_details": {"card": {"brand": "visa", "last4": "7720", "checks": {"cvc_check": "pass", "address_line1_check": null, "address_postal_code_check": "pass"}, "wallet": null, "country": "US", "funding": "debit", "mandate": null, "network": "visa", "exp_year": 2027, "exp_month": 12, "fingerprint": "Ym4hiZ5TxjAb0nI2", "overcapture": {"status": "unavailable", "maximum_amount_capturable": 50}, "installments": null, "multicapture": {"status": "unavailable"}, "network_token": {"used": false}, "three_d_secure": null, "regulated_status": "regulated", "amount_authorized": 50, "authorization_code": "042471", "extended_authorization": {"status": "disabled"}, "network_transaction_id": "356079784882626", "incremental_authorization": {"status": "unavailable"}}, "type": "card"}, "failure_balance_transaction": null, "statement_descriptor_suffix": null, "calculated_statement_descriptor": "ASOFAI.COM"}	acct_1SlePoAGtLlBc3WP
2026-06-10 02:09:47.279932+00	2026-06-10 02:09:46+00	{"id": "ch_3TgbaKAGtLlBc3WP2fRZMk3T", "paid": true, "order": null, "amount": 250, "object": "charge", "review": null, "source": null, "status": "succeeded", "created": 1781057382, "dispute": null, "outcome": {"type": "authorized", "reason": null, "risk_level": "normal", "advice_code": null, "network_status": "approved_by_network", "seller_message": "Payment complete.", "network_advice_code": null, "network_decline_code": null}, "captured": true, "currency": "usd", "customer": null, "disputed": false, "livemode": true, "metadata": {}, "refunded": false, "shipping": null, "application": null, "description": null, "destination": null, "receipt_url": "https://pay.stripe.com/receipts/payment/CAcQARoXChVhY2N0XzFTbGVQb0FHdExsQmMzV1Ao6o6j0QYyBp8IWv5P6DosFtWYhQw2gJPuhQmabTI_V-UXgtruUbpgL0TCM_-Mc05eYTKyu4UAzRWwTKM", "failure_code": null, "on_behalf_of": null, "fraud_details": {}, "radar_options": {}, "receipt_email": null, "transfer_data": null, "payment_intent": "pi_3TgbaKAGtLlBc3WP2mBtGpIO", "payment_method": "pm_1TgbaEAGtLlBc3WPLeb1jpF6", "receipt_number": null, "transfer_group": null, "amount_captured": 250, "amount_refunded": 0, "application_fee": null, "billing_details": {"name": "Shannon Ashby", "email": "aseaofdesigns@gmail.com", "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "30043"}}, "failure_message": null, "source_transfer": null, "balance_transaction": "txn_3TgbaKAGtLlBc3WP2rpolpfg", "statement_descriptor": null, "application_fee_amount": null, "payment_method_details": {"card": {"brand": "visa", "last4": "0962", "checks": {"cvc_check": null, "address_line1_check": null, "address_postal_code_check": "pass"}, "wallet": {"link": {}, "type": "link", "dynamic_last4": null}, "country": "US", "funding": "debit", "mandate": null, "network": "visa", "exp_year": 2026, "exp_month": 6, "fingerprint": "PPxfX2lYBzjuLSno", "overcapture": {"status": "unavailable", "maximum_amount_capturable": 250}, "installments": null, "multicapture": {"status": "unavailable"}, "network_token": {"used": true}, "three_d_secure": null, "regulated_status": "unregulated", "amount_authorized": 250, "ds_transaction_id": null, "authorization_code": "116009", "transaction_link_id": null, "extended_authorization": {"status": "disabled"}, "network_transaction_id": "586161077827820", "incremental_authorization": {"status": "unavailable"}}, "type": "card"}, "failure_balance_transaction": null, "statement_descriptor_suffix": null, "calculated_statement_descriptor": "ASOFAI.COM"}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:41:09.448623+00	2026-06-10 21:41:09+00	{"id": "ch_3TgtrwAGtLlBc3WP0KqojfkC", "paid": true, "order": null, "amount": 100, "object": "charge", "review": null, "source": null, "status": "succeeded", "created": 1781127665, "dispute": null, "outcome": {"type": "authorized", "reason": null, "risk_level": "normal", "advice_code": null, "network_status": "approved_by_network", "seller_message": "Payment complete.", "network_advice_code": null, "network_decline_code": null}, "captured": true, "currency": "usd", "customer": null, "disputed": false, "livemode": true, "metadata": {}, "refunded": false, "shipping": null, "application": null, "description": null, "destination": null, "receipt_url": "https://pay.stripe.com/receipts/payment/CAcQARoXChVhY2N0XzFTbGVQb0FHdExsQmMzV1Ao9bOn0QYyBnKTK2IVTDosFjCaDP-8lKUvnHahdd-hG1B0UwtxPq6C9DF7xJlU0F5YTYbVzOGSgYqs6iY", "failure_code": null, "on_behalf_of": null, "fraud_details": {}, "radar_options": {}, "receipt_email": null, "transfer_data": null, "payment_intent": "pi_3TgtrwAGtLlBc3WP09Kk8UE2", "payment_method": "pm_1TgtruAGtLlBc3WP4gdWVQ73", "receipt_number": null, "transfer_group": null, "amount_captured": 100, "amount_refunded": 0, "application_fee": null, "billing_details": {"name": "Shannon Ashby", "email": "aseaofdesigns@gmail.com", "phone": null, "tax_id": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "30043"}}, "failure_message": null, "source_transfer": null, "balance_transaction": "txn_3TgtrwAGtLlBc3WP03PGvTvn", "statement_descriptor": null, "application_fee_amount": null, "payment_method_details": {"card": {"brand": "visa", "last4": "0962", "checks": {"cvc_check": null, "address_line1_check": null, "address_postal_code_check": "pass"}, "wallet": {"link": {}, "type": "link", "dynamic_last4": null}, "country": "US", "funding": "debit", "mandate": null, "network": "visa", "exp_year": 2026, "exp_month": 6, "fingerprint": "PPxfX2lYBzjuLSno", "overcapture": {"status": "unavailable", "maximum_amount_capturable": 100}, "installments": null, "multicapture": {"status": "unavailable"}, "network_token": {"used": true}, "three_d_secure": null, "regulated_status": "unregulated", "amount_authorized": 100, "ds_transaction_id": null, "authorization_code": "919029", "transaction_link_id": null, "extended_authorization": {"status": "disabled"}, "network_transaction_id": "346161780657164", "incremental_authorization": {"status": "unavailable"}}, "type": "card"}, "failure_balance_transaction": null, "statement_descriptor_suffix": null, "calculated_statement_descriptor": "ASOFAI.COM"}	acct_1SlePoAGtLlBc3WP
\.


--
-- Data for Name: checkout_session_line_items; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.checkout_session_line_items (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
2026-01-10 03:58:55.524412+00	2026-01-10 03:58:54+00	{"id": "li_1SntIQIQVqXNWHV1MgdpciGH", "price": "price_1Sns7yIQVqXNWHV10TAL6aTD", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Lite", "amount_total": 50, "amount_discount": 0, "amount_subtotal": 50, "checkout_session": "cs_test_a1MRhKcdA2am8z5w8A0a6IfrQTLE37JzYiWuOqZM8vUgLW2dSEcDlfjkkt"}	acct_1SnqwNIQVqXNWHV1
2026-01-11 05:11:45.230971+00	2026-01-11 05:11:44+00	{"id": "li_1SnuSiAGtLlBc3WPRIfrv2gM", "price": "price_1SnuQmAGtLlBc3WPf2LwcpRH", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Lite", "amount_total": 50, "amount_discount": 0, "amount_subtotal": 50, "checkout_session": "cs_live_a1d59pm8gb7cEHPiquv2H1Y0HoHqjL8fqNZFOpPOxsLLsRDJFxzy108MAD"}	acct_1SlePoAGtLlBc3WP
2026-03-20 19:57:33.668402+00	2026-03-20 19:57:32+00	{"id": "li_1TD9AQAGtLlBc3WPyPumouLe", "price": "price_1SnuQnAGtLlBc3WPMh06ap1f", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Max", "amount_total": 250, "amount_discount": 0, "amount_subtotal": 250, "checkout_session": "cs_live_a1gxyO4qOakT7EhLG1LlVozb8iT6QOd5kEegXL3jYxko2gYbTojzXsxg79", "adjustable_quantity": null}	acct_1SlePoAGtLlBc3WP
2026-03-20 20:23:39.689249+00	2026-03-20 20:23:38+00	{"id": "li_1TD9ZiAGtLlBc3WPzpawJcxl", "price": "price_1SnuQnAGtLlBc3WPMh06ap1f", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Max", "amount_total": 250, "amount_discount": 0, "amount_subtotal": 250, "checkout_session": "cs_live_a1W4RoyWxLAc5cVZTAHvs4TmDcGDUNXtqulhqb1imjGwwFzOA7fBMCFr4e", "adjustable_quantity": null}	acct_1SlePoAGtLlBc3WP
2026-03-20 20:39:17.242096+00	2026-03-20 20:39:16+00	{"id": "li_1TD9l5AGtLlBc3WPETMeqakz", "price": "price_1SnuQnAGtLlBc3WPMh06ap1f", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Max", "amount_total": 250, "amount_discount": 0, "amount_subtotal": 250, "checkout_session": "cs_live_a175nZID6Z2i67WDci1AFeBtKEjCcCaKmk9f5j4UphrX3CMwxilt1rqy0u", "adjustable_quantity": null}	acct_1SlePoAGtLlBc3WP
2026-03-20 20:40:59.749205+00	2026-03-20 20:40:59+00	{"id": "li_1TD9qVAGtLlBc3WP5Aqaw4kv", "price": "price_1SnuQmAGtLlBc3WPf2LwcpRH", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Lite", "amount_total": 50, "amount_discount": 0, "amount_subtotal": 50, "checkout_session": "cs_live_a1ABS26SEE84rjFL4w314dZnaQhZr4IglzUUGavauGFt9DdylrWDa7PwEF", "adjustable_quantity": null}	acct_1SlePoAGtLlBc3WP
2026-03-20 21:48:09.691003+00	2026-03-20 21:48:08+00	{"id": "li_1TDAtXAGtLlBc3WPHWOkd2eJ", "price": "price_1SnuQmAGtLlBc3WPf2LwcpRH", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Lite", "amount_total": 50, "amount_discount": 0, "amount_subtotal": 50, "checkout_session": "cs_live_a16UVmdpvpAlIGvGmNdk5RRvtbArepjHtOkk2MNECR4zYUE9MTp0s3fmKz", "adjustable_quantity": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 02:09:58.833798+00	2026-06-10 02:09:43+00	{"id": "li_1Tgba7AGtLlBc3WPuWFjb582", "price": "price_1Tgba7AGtLlBc3WPT2iS1Yjq", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Max", "amount_total": 250, "amount_discount": 0, "amount_subtotal": 250, "checkout_session": "cs_live_a1FZp6JBZNAQD3ZmpMvU22tje2q7HDIafM2ivvHeMhqcccC7NEMUz0hgaZ", "adjustable_quantity": {"enabled": true, "maximum": 20, "minimum": 1}}	acct_1SlePoAGtLlBc3WP
2026-06-10 20:42:28.023325+00	2026-06-10 20:42:26+00	{"id": "li_1TgWTeAGtLlBc3WPkXk9Ymrx", "price": "price_1SnuQmAGtLlBc3WPf2LwcpRH", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Lite", "amount_total": 50, "amount_discount": 0, "amount_subtotal": 50, "checkout_session": "cs_live_a1DTHZwjvMK5nMgCXSFh5eR3pfpMbADAoCGJx2UO17z1Kpk2TyzsKsNaGH", "adjustable_quantity": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 20:43:37.865347+00	2026-06-10 20:43:37+00	{"id": "li_1TgWUnAGtLlBc3WPdKpPtJ4x", "price": "price_1SnuQnAGtLlBc3WPMh06ap1f", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Max", "amount_total": 250, "amount_discount": 0, "amount_subtotal": 250, "checkout_session": "cs_live_a1glwuEmm3IvUCsJKLq1VekWwNyiAFTnRjCyga8ARleWou830QFrDR9BEE", "adjustable_quantity": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:28:13.111624+00	2026-06-10 21:28:12+00	{"id": "li_1TgXBwAGtLlBc3WPO29Behha", "price": "price_1SnuQnAGtLlBc3WPMh06ap1f", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Max", "amount_total": 250, "amount_discount": 0, "amount_subtotal": 250, "checkout_session": "cs_live_a1CXrBzJjbWRALZscEAeTRYWpZwQuRufS9OBy6TPGxq3KbxNBcaPJ7OEvI", "adjustable_quantity": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:28:20.798451+00	2026-06-10 21:28:20+00	{"id": "li_1TgXC4AGtLlBc3WPYhYrJHkd", "price": "price_1SnuQnAGtLlBc3WP0kv4feWH", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Pro", "amount_total": 100, "amount_discount": 0, "amount_subtotal": 100, "checkout_session": "cs_live_a16rKl9yIQUQGDbdzClKc8geKtVEfkGUvSWZ5bI97bSgTUroY06jzHzZy3", "adjustable_quantity": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:28:22.896166+00	2026-06-10 21:28:22+00	{"id": "li_1TgXC6AGtLlBc3WPm7pBly7v", "price": "price_1SnuQmAGtLlBc3WPf2LwcpRH", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Lite", "amount_total": 50, "amount_discount": 0, "amount_subtotal": 50, "checkout_session": "cs_live_a11wxUtM2biRCZukqeS2YNWoconx3KpAgTksEhWvqHr5mjPbFyOM9WEFaq", "adjustable_quantity": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:29:18.911284+00	2026-06-10 21:29:18+00	{"id": "li_1TgXD0AGtLlBc3WPzS9FKdT2", "price": "price_1SnuQmAGtLlBc3WPf2LwcpRH", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Lite", "amount_total": 50, "amount_discount": 0, "amount_subtotal": 50, "checkout_session": "cs_live_a1CYvNPpE9NSpn9XqJxxApK3HqIJBDWa9Khp0l7k80NvIkHxS7mEq1JWCN", "adjustable_quantity": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:35:55.978543+00	2026-06-10 21:35:55+00	{"id": "li_1TgXJPAGtLlBc3WPjDNYeqEe", "price": "price_1SnuQnAGtLlBc3WP0kv4feWH", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Pro", "amount_total": 100, "amount_discount": 0, "amount_subtotal": 100, "checkout_session": "cs_live_a1gIg2h1HdFYFxCcmcTCuB8Gc9did2WZzvHsjaZAyVyz85Nu2rgGOMEIbr", "adjustable_quantity": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:41:07.281243+00	2026-06-10 21:41:06+00	{"id": "li_1TgtrqAGtLlBc3WPJgNEUbdG", "price": "price_1TgtrqAGtLlBc3WPGcjWMrdZ", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Pro", "amount_total": 100, "amount_discount": 0, "amount_subtotal": 100, "checkout_session": "cs_live_a1WrBqu3geGyublTphyCQVNK0HIPPwTo7vaiv9P0pHfcJM70PlycG2Jbwl", "adjustable_quantity": {"enabled": true, "maximum": 20, "minimum": 1}}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:41:23.694762+00	2026-06-10 21:41:23+00	{"id": "li_1TgXOhAGtLlBc3WPKsS0Dp7n", "price": "price_1SnuQmAGtLlBc3WPf2LwcpRH", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Lite", "amount_total": 50, "amount_discount": 0, "amount_subtotal": 50, "checkout_session": "cs_live_a1oYtfjY1K7Zxx2a2TS2caeEcZS0mZAGOyugB2iClTKOi5AvpgHVn1CIox", "adjustable_quantity": {"enabled": true, "maximum": 20, "minimum": 1}}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:42:17.971826+00	2026-06-10 21:42:17+00	{"id": "li_1TgXPZAGtLlBc3WPX8Zqv3Qm", "price": "price_1SnuQmAGtLlBc3WPf2LwcpRH", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Lite", "amount_total": 50, "amount_discount": 0, "amount_subtotal": 50, "checkout_session": "cs_live_a1uEXcmM9pB5bUTpUILvVA3P5M1Ef1uyYljno6LWjIqkNZjOInBwF6bDkt", "adjustable_quantity": {"enabled": true, "maximum": 20, "minimum": 1}}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:46:22.247646+00	2026-06-10 21:46:21+00	{"id": "li_1TgXTVAGtLlBc3WPiOLP2Fnj", "price": "price_1SnuQnAGtLlBc3WPMh06ap1f", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Max", "amount_total": 250, "amount_discount": 0, "amount_subtotal": 250, "checkout_session": "cs_live_a1AxKsTsWSC6fM8eKP53mBOH5Cvg3DTKSzXSQgx1csJxGBy2lW9zQ1kJST", "adjustable_quantity": {"enabled": true, "maximum": 20, "minimum": 1}}	acct_1SlePoAGtLlBc3WP
2026-06-12 02:43:10.691818+00	2026-06-11 21:43:33+00	{"id": "li_1TgtuMAGtLlBc3WPxVRmrQnS", "price": "price_1TgtuMAGtLlBc3WPSrtqlRYr", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Max Upgrade", "amount_total": 150, "amount_discount": 0, "amount_subtotal": 150, "checkout_session": "cs_live_a16r8gbJOXLOHhqulqF9CbGQ643pvpQG3zSjZQGDBfMxBD0ky6XmtOi6fG", "adjustable_quantity": null}	acct_1SlePoAGtLlBc3WP
2026-06-13 22:30:58.257797+00	2026-06-11 01:53:49+00	{"id": "li_1TgbKzAGtLlBc3WPhLFL2RTB", "price": "price_1TgbKzAGtLlBc3WP6cRTlH0o", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "ASOF Max", "amount_total": 250, "amount_discount": 0, "amount_subtotal": 250, "checkout_session": "cs_live_a1VT48NXwW8ycWBT1xb719oB2InKVHV6kF5JLrUZ7BNUvDusvRIh4vzyj3", "adjustable_quantity": {"enabled": true, "maximum": 20, "minimum": 1}}	acct_1SlePoAGtLlBc3WP
\.


--
-- Data for Name: checkout_sessions; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.checkout_sessions (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
2026-01-10 03:58:55.266427+00	2026-01-10 03:58:54+00	{"id": "cs_test_a1MRhKcdA2am8z5w8A0a6IfrQTLE37JzYiWuOqZM8vUgLW2dSEcDlfjkkt", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "complete", "consent": null, "created": 1768017422, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": false, "metadata": {"tier": "lite"}, "discounts": [], "cancel_url": "https://1946ad19-49e8-49ad-9773-df68998f6d25-00-3f9mhrwwz4pnt.picard.replit.dev/", "expires_at": 1768103822, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://1946ad19-49e8-49ad-9773-df68998f6d25-00-3f9mhrwwz4pnt.picard.replit.dev/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 50, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": "pi_3SntKDIQVqXNWHV10RS0STfh", "payment_status": "paid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 50, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": {"name": "Test Test", "email": "aseaofdesigns@gmail.com", "phone": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "12345"}, "tax_ids": [], "tax_exempt": "none", "business_name": null, "individual_name": null}, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "AsOf Automate Sandbox", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SnqwNIQVqXNWHV1
2026-01-11 05:11:44.758295+00	2026-01-11 05:11:44+00	{"id": "cs_live_a1d59pm8gb7cEHPiquv2H1Y0HoHqjL8fqNZFOpPOxsLLsRDJFxzy108MAD", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "expired", "consent": null, "created": 1768021904, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "lite"}, "discounts": [], "cancel_url": "https://asof-ai.replit.app/", "expires_at": 1768108304, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asof-ai.replit.app/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 50, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": null, "payment_status": "unpaid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 50, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": null, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-03-20 19:57:33.268246+00	2026-03-20 19:57:32+00	{"id": "cs_live_a1gxyO4qOakT7EhLG1LlVozb8iT6QOd5kEegXL3jYxko2gYbTojzXsxg79", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "complete", "consent": null, "created": 1774036630, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "max"}, "discounts": [], "cancel_url": "https://asofai.com/", "expires_at": 1774123030, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asofai.com/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 250, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": "pi_3TD9AlAGtLlBc3WP1QOmDKJY", "payment_status": "paid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 250, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": {"name": "Shannon E Ashby", "email": "aseaofdesigns@gmail.com", "phone": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "30043"}, "tax_ids": [], "tax_exempt": "none", "business_name": null, "individual_name": null}, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-03-20 20:23:39.442713+00	2026-03-20 20:23:38+00	{"id": "cs_live_a1W4RoyWxLAc5cVZTAHvs4TmDcGDUNXtqulhqb1imjGwwFzOA7fBMCFr4e", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "complete", "consent": null, "created": 1774038198, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "max"}, "discounts": [], "cancel_url": "https://asofai.com/", "expires_at": 1774124598, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asofai.com/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 250, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": "pi_3TD9a1AGtLlBc3WP1BsX7YbP", "payment_status": "paid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 250, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": {"name": "Shannon E Ashby", "email": "aseaofdesigns@gmail.com", "phone": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "30043"}, "tax_ids": [], "tax_exempt": "none", "business_name": null, "individual_name": null}, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-03-20 20:39:16.94334+00	2026-03-20 20:39:16+00	{"id": "cs_live_a175nZID6Z2i67WDci1AFeBtKEjCcCaKmk9f5j4UphrX3CMwxilt1rqy0u", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "complete", "consent": null, "created": 1774038903, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "max"}, "discounts": [], "cancel_url": "https://asofai.com/", "expires_at": 1774125303, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asofai.com/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 250, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": "pi_3TD9nHAGtLlBc3WP2AEMsoAX", "payment_status": "paid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 250, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": {"name": "Shannon E Ashby", "email": "aseaofdesigns@gmail.com", "phone": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "30043"}, "tax_ids": [], "tax_exempt": "none", "business_name": null, "individual_name": null}, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-03-20 20:40:59.501771+00	2026-03-20 20:40:59+00	{"id": "cs_live_a1ABS26SEE84rjFL4w314dZnaQhZr4IglzUUGavauGFt9DdylrWDa7PwEF", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "complete", "consent": null, "created": 1774039239, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "lite"}, "discounts": [], "cancel_url": "https://asofai.com/", "expires_at": 1774125639, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asofai.com/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 50, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": "pi_3TD9qnAGtLlBc3WP0uzDf9jv", "payment_status": "paid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 50, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": {"name": "Shannon E Ashby", "email": "aseaofdesigns@gmail.com", "phone": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "30043"}, "tax_ids": [], "tax_exempt": "none", "business_name": null, "individual_name": null}, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-03-20 21:48:09.275833+00	2026-03-20 21:48:08+00	{"id": "cs_live_a16UVmdpvpAlIGvGmNdk5RRvtbArepjHtOkk2MNECR4zYUE9MTp0s3fmKz", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "complete", "consent": null, "created": 1774043271, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "lite"}, "discounts": [], "cancel_url": "https://asofai.com/", "expires_at": 1774129671, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asofai.com/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 50, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": "pi_3TDAtnAGtLlBc3WP0R4ie0IJ", "payment_status": "paid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 50, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": {"name": "Shannon E Ashby", "email": "aseaofdesigns@gmail.com", "phone": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "30043"}, "tax_ids": [], "tax_exempt": "none", "business_name": null, "individual_name": null}, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 02:09:58.539074+00	2026-06-10 02:09:43+00	{"id": "cs_live_a1FZp6JBZNAQD3ZmpMvU22tje2q7HDIafM2ivvHeMhqcccC7NEMUz0hgaZ", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "complete", "consent": null, "created": 1781057367, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "max"}, "discounts": [], "cancel_url": "https://asofai.com/", "expires_at": 1781143767, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asofai.com/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 250, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": "pi_3TgbaKAGtLlBc3WP2mBtGpIO", "payment_status": "paid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 250, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": {"name": "Shannon Ashby", "email": "aseaofdesigns@gmail.com", "phone": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "30043"}, "tax_ids": [], "tax_exempt": "none", "business_name": null, "individual_name": null}, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "managed_payments": {"enabled": false}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 20:42:26.853248+00	2026-06-10 20:42:26+00	{"id": "cs_live_a1DTHZwjvMK5nMgCXSFh5eR3pfpMbADAoCGJx2UO17z1Kpk2TyzsKsNaGH", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "expired", "consent": null, "created": 1781037746, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "lite"}, "discounts": [], "cancel_url": "https://1946ad19-49e8-49ad-9773-df68998f6d25-00-3f9mhrwwz4pnt.picard.replit.dev/", "expires_at": 1781124146, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://1946ad19-49e8-49ad-9773-df68998f6d25-00-3f9mhrwwz4pnt.picard.replit.dev/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 50, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": null, "payment_status": "unpaid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 50, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": null, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "managed_payments": {"enabled": false}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 20:43:37.672939+00	2026-06-10 20:43:37+00	{"id": "cs_live_a1glwuEmm3IvUCsJKLq1VekWwNyiAFTnRjCyga8ARleWou830QFrDR9BEE", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "expired", "consent": null, "created": 1781037817, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "max"}, "discounts": [], "cancel_url": "https://1946ad19-49e8-49ad-9773-df68998f6d25-00-3f9mhrwwz4pnt.picard.replit.dev/", "expires_at": 1781124217, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://1946ad19-49e8-49ad-9773-df68998f6d25-00-3f9mhrwwz4pnt.picard.replit.dev/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 250, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": null, "payment_status": "unpaid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 250, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": null, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "managed_payments": {"enabled": false}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:28:12.649736+00	2026-06-10 21:28:12+00	{"id": "cs_live_a1CXrBzJjbWRALZscEAeTRYWpZwQuRufS9OBy6TPGxq3KbxNBcaPJ7OEvI", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "expired", "consent": null, "created": 1781040492, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "max"}, "discounts": [], "cancel_url": "https://asofai.com/", "expires_at": 1781126892, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asofai.com/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 250, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": null, "payment_status": "unpaid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 250, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": null, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "managed_payments": {"enabled": false}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:28:20.539728+00	2026-06-10 21:28:20+00	{"id": "cs_live_a16rKl9yIQUQGDbdzClKc8geKtVEfkGUvSWZ5bI97bSgTUroY06jzHzZy3", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "expired", "consent": null, "created": 1781040500, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "pro"}, "discounts": [], "cancel_url": "https://asofai.com/", "expires_at": 1781126900, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asofai.com/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 100, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": null, "payment_status": "unpaid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 100, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": null, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "managed_payments": {"enabled": false}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:28:22.805497+00	2026-06-10 21:28:22+00	{"id": "cs_live_a11wxUtM2biRCZukqeS2YNWoconx3KpAgTksEhWvqHr5mjPbFyOM9WEFaq", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "expired", "consent": null, "created": 1781040502, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "lite"}, "discounts": [], "cancel_url": "https://asofai.com/", "expires_at": 1781126902, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asofai.com/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 50, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": null, "payment_status": "unpaid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 50, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": null, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "managed_payments": {"enabled": false}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:29:18.784035+00	2026-06-10 21:29:18+00	{"id": "cs_live_a1CYvNPpE9NSpn9XqJxxApK3HqIJBDWa9Khp0l7k80NvIkHxS7mEq1JWCN", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "expired", "consent": null, "created": 1781040558, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "lite"}, "discounts": [], "cancel_url": "https://localhost:5000/", "expires_at": 1781126958, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://localhost:5000/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 50, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": null, "payment_status": "unpaid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 50, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": null, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "managed_payments": {"enabled": false}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:35:55.643049+00	2026-06-10 21:35:55+00	{"id": "cs_live_a1gIg2h1HdFYFxCcmcTCuB8Gc9did2WZzvHsjaZAyVyz85Nu2rgGOMEIbr", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "expired", "consent": null, "created": 1781040955, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "pro"}, "discounts": [], "cancel_url": "https://asofai.com/", "expires_at": 1781127355, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asofai.com/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 100, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": null, "payment_status": "unpaid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 100, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": null, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "managed_payments": {"enabled": false}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:41:06.995358+00	2026-06-10 21:41:06+00	{"id": "cs_live_a1WrBqu3geGyublTphyCQVNK0HIPPwTo7vaiv9P0pHfcJM70PlycG2Jbwl", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "complete", "consent": null, "created": 1781127658, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "pro"}, "discounts": [], "cancel_url": "https://asofai.com/", "expires_at": 1781214058, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asofai.com/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 100, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": "pi_3TgtrwAGtLlBc3WP09Kk8UE2", "payment_status": "paid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 100, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": {"name": "Shannon Ashby", "email": "aseaofdesigns@gmail.com", "phone": null, "address": {"city": null, "line1": null, "line2": null, "state": null, "country": "US", "postal_code": "30043"}, "tax_ids": [], "tax_exempt": "none", "business_name": null, "individual_name": null}, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "managed_payments": {"enabled": false}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:41:23.596174+00	2026-06-10 21:41:23+00	{"id": "cs_live_a1oYtfjY1K7Zxx2a2TS2caeEcZS0mZAGOyugB2iClTKOi5AvpgHVn1CIox", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "expired", "consent": null, "created": 1781041283, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "lite"}, "discounts": [], "cancel_url": "https://asofai.com/", "expires_at": 1781127683, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asofai.com/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 50, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": null, "payment_status": "unpaid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 50, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": null, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "managed_payments": {"enabled": false}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:42:17.83176+00	2026-06-10 21:42:17+00	{"id": "cs_live_a1uEXcmM9pB5bUTpUILvVA3P5M1Ef1uyYljno6LWjIqkNZjOInBwF6bDkt", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "expired", "consent": null, "created": 1781041337, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "lite"}, "discounts": [], "cancel_url": "https://asofai.com/", "expires_at": 1781127737, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asofai.com/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 50, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": null, "payment_status": "unpaid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 50, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": null, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "managed_payments": {"enabled": false}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:46:22.008054+00	2026-06-10 21:46:21+00	{"id": "cs_live_a1AxKsTsWSC6fM8eKP53mBOH5Cvg3DTKSzXSQgx1csJxGBy2lW9zQ1kJST", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "expired", "consent": null, "created": 1781041581, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "max"}, "discounts": [], "cancel_url": "https://asofai.com/", "expires_at": 1781127981, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asofai.com/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 250, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": "pi_3TgXTjAGtLlBc3WP0R9yvd4q", "payment_status": "unpaid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 250, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": {"name": null, "email": "aseaofdesigns@gmail.com", "phone": null, "address": null, "tax_ids": null, "tax_exempt": "none", "business_name": null, "individual_name": null}, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "managed_payments": {"enabled": false}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-12 02:43:08.957857+00	2026-06-11 21:43:33+00	{"id": "cs_live_a16r8gbJOXLOHhqulqF9CbGQ643pvpQG3zSjZQGDBfMxBD0ky6XmtOi6fG", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "expired", "consent": null, "created": 1781127814, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "max", "fromTier": "pro", "analysisId": "6"}, "discounts": [], "cancel_url": "https://asofai.com/", "expires_at": 1781214213, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asofai.com/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 150, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": null, "payment_status": "unpaid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 150, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": null, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "managed_payments": {"enabled": false}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-13 22:30:56.717654+00	2026-06-11 01:53:49+00	{"id": "cs_live_a1VT48NXwW8ycWBT1xb719oB2InKVHV6kF5JLrUZ7BNUvDusvRIh4vzyj3", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "expired", "consent": null, "created": 1781056429, "invoice": null, "ui_mode": "hosted", "currency": "usd", "customer": null, "livemode": true, "metadata": {"tier": "max"}, "discounts": [], "cancel_url": "https://asofai.com/", "expires_at": 1781142829, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://asofai.com/verify?session_id={CHECKOUT_SESSION_ID}", "amount_total": 250, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": null, "payment_status": "unpaid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 250, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": null, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "managed_payments": {"enabled": false}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Shannon Ashby", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": null, "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": null, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
\.


--
-- Data for Name: coupons; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.coupons (_updated_at, _last_synced_at, _raw_data) FROM stdin;
\.


--
-- Data for Name: credit_notes; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.credit_notes (_last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.customers (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: disputes; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.disputes (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: early_fraud_warnings; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.early_fraud_warnings (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.events (_updated_at, _last_synced_at, _raw_data) FROM stdin;
\.


--
-- Data for Name: features; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.features (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.invoices (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: payment_intents; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.payment_intents (_last_synced_at, _raw_data, _account_id) FROM stdin;
2026-01-10 03:58:54+00	{"id": "pi_3SntKDIQVqXNWHV10RS0STfh", "amount": 50, "object": "payment_intent", "review": null, "source": null, "status": "succeeded", "created": 1768017533, "currency": "usd", "customer": null, "livemode": false, "metadata": {}, "shipping": null, "processing": null, "application": null, "canceled_at": null, "description": null, "next_action": null, "on_behalf_of": null, "client_secret": "pi_3SntKDIQVqXNWHV10RS0STfh_secret_9lNOXZ5Fih8MM8qqwx9m3yw98", "latest_charge": "ch_3SntKDIQVqXNWHV102PimAYA", "receipt_email": null, "transfer_data": null, "amount_details": {"tax": {"total_tax_amount": 0}, "tip": {}, "shipping": {"amount": 0, "to_postal_code": null, "from_postal_code": null}}, "capture_method": "automatic_async", "payment_method": "pm_1SntKDIQVqXNWHV1YzdqY2Uh", "transfer_group": null, "amount_received": 50, "payment_details": {"order_reference": "prod_TlOvy3Iku07nB0", "customer_reference": null}, "customer_account": null, "amount_capturable": 0, "last_payment_error": null, "setup_future_usage": null, "cancellation_reason": null, "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	acct_1SnqwNIQVqXNWHV1
2026-03-20 19:57:32+00	{"id": "pi_3TD9AlAGtLlBc3WP1QOmDKJY", "amount": 250, "object": "payment_intent", "review": null, "source": null, "status": "succeeded", "created": 1774036651, "currency": "usd", "customer": null, "livemode": true, "metadata": {}, "shipping": null, "processing": null, "application": null, "canceled_at": null, "description": null, "next_action": null, "on_behalf_of": null, "client_secret": "pi_3TD9AlAGtLlBc3WP1QOmDKJY_secret_7GOykMDfRWpZqCECopk77ZWfY", "latest_charge": "ch_3TD9AlAGtLlBc3WP1PIUZDC0", "receipt_email": null, "transfer_data": null, "amount_details": {"tax": {"total_tax_amount": 0}, "tip": {}, "shipping": {"amount": 0, "to_postal_code": null, "from_postal_code": null}}, "capture_method": "automatic_async", "payment_method": "pm_1TD9AkAGtLlBc3WP3C6N55LZ", "transfer_group": null, "amount_received": 250, "payment_details": {"order_reference": "cs_live_a1gxyO4qOakT7EhLG1LlVozb8iT6QOd5kEegXL3jYxko2gYbTojzXsxg79", "customer_reference": null}, "customer_account": null, "amount_capturable": 0, "last_payment_error": null, "setup_future_usage": null, "cancellation_reason": null, "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-03-20 20:23:38+00	{"id": "pi_3TD9a1AGtLlBc3WP1BsX7YbP", "amount": 250, "object": "payment_intent", "review": null, "source": null, "status": "succeeded", "created": 1774038217, "currency": "usd", "customer": null, "livemode": true, "metadata": {}, "shipping": null, "processing": null, "application": null, "canceled_at": null, "description": null, "next_action": null, "on_behalf_of": null, "client_secret": "pi_3TD9a1AGtLlBc3WP1BsX7YbP_secret_spf2sMxwaGfsUu4myzxrNX0YX", "latest_charge": "ch_3TD9a1AGtLlBc3WP18s3IWvq", "receipt_email": null, "transfer_data": null, "amount_details": {"tax": {"total_tax_amount": 0}, "tip": {}, "shipping": {"amount": 0, "to_postal_code": null, "from_postal_code": null}}, "capture_method": "automatic_async", "payment_method": "pm_1TD9a0AGtLlBc3WPOAsXbfeM", "transfer_group": null, "amount_received": 250, "payment_details": {"order_reference": "cs_live_a1W4RoyWxLAc5cVZTAHvs4TmDcGDUNXtqulhqb1imjGwwFzOA7fBMCFr4e", "customer_reference": null}, "customer_account": null, "amount_capturable": 0, "last_payment_error": null, "setup_future_usage": null, "cancellation_reason": null, "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-03-20 20:39:16+00	{"id": "pi_3TD9nHAGtLlBc3WP2AEMsoAX", "amount": 250, "object": "payment_intent", "review": null, "source": null, "status": "succeeded", "created": 1774039039, "currency": "usd", "customer": null, "livemode": true, "metadata": {}, "shipping": null, "processing": null, "application": null, "canceled_at": null, "description": null, "next_action": null, "on_behalf_of": null, "client_secret": "pi_3TD9nHAGtLlBc3WP2AEMsoAX_secret_QKLdWYHt4pxNf7sFfLKt3Ih2Q", "latest_charge": "ch_3TD9nHAGtLlBc3WP2XF3nmii", "receipt_email": null, "transfer_data": null, "amount_details": {"tax": {"total_tax_amount": 0}, "tip": {}, "shipping": {"amount": 0, "to_postal_code": null, "from_postal_code": null}}, "capture_method": "automatic_async", "payment_method": "pm_1TD9p6AGtLlBc3WP9XUK2y88", "transfer_group": null, "amount_received": 250, "payment_details": {"order_reference": "cs_live_a175nZID6Z2i67WDci1AFeBtKEjCcCaKmk9f5j4UphrX3CMwxilt1rqy0u", "customer_reference": null}, "customer_account": null, "amount_capturable": 0, "last_payment_error": null, "setup_future_usage": null, "cancellation_reason": null, "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-03-20 20:40:58+00	{"id": "pi_3TD9qnAGtLlBc3WP0uzDf9jv", "amount": 50, "object": "payment_intent", "review": null, "source": null, "status": "succeeded", "created": 1774039257, "currency": "usd", "customer": null, "livemode": true, "metadata": {}, "shipping": null, "processing": null, "application": null, "canceled_at": null, "description": null, "next_action": null, "on_behalf_of": null, "client_secret": "pi_3TD9qnAGtLlBc3WP0uzDf9jv_secret_lv35ljsN7udygZNCPFKaTjFmZ", "latest_charge": "ch_3TD9qnAGtLlBc3WP09ljlHvs", "receipt_email": null, "transfer_data": null, "amount_details": {"tax": {"total_tax_amount": 0}, "tip": {}, "shipping": {"amount": 0, "to_postal_code": null, "from_postal_code": null}}, "capture_method": "automatic_async", "payment_method": "pm_1TD9qmAGtLlBc3WPZmjpd8K2", "transfer_group": null, "amount_received": 50, "payment_details": {"order_reference": "cs_live_a1ABS26SEE84rjFL4w314dZnaQhZr4IglzUUGavauGFt9DdylrWDa7PwEF", "customer_reference": null}, "customer_account": null, "amount_capturable": 0, "last_payment_error": null, "setup_future_usage": null, "cancellation_reason": null, "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-03-20 21:48:08+00	{"id": "pi_3TDAtnAGtLlBc3WP0R4ie0IJ", "amount": 50, "object": "payment_intent", "review": null, "source": null, "status": "succeeded", "created": 1774043287, "currency": "usd", "customer": null, "livemode": true, "metadata": {}, "shipping": null, "processing": null, "application": null, "canceled_at": null, "description": null, "next_action": null, "on_behalf_of": null, "client_secret": "pi_3TDAtnAGtLlBc3WP0R4ie0IJ_secret_tGLVQvEh4dokhAaFz2HzrVrFA", "latest_charge": "ch_3TDAtnAGtLlBc3WP04CQbYPU", "receipt_email": null, "transfer_data": null, "amount_details": {"tax": {"total_tax_amount": 0}, "tip": {}, "shipping": {"amount": 0, "to_postal_code": null, "from_postal_code": null}}, "capture_method": "automatic_async", "payment_method": "pm_1TDAtmAGtLlBc3WPw5lq0uYf", "transfer_group": null, "amount_received": 50, "payment_details": {"order_reference": "cs_live_a16UVmdpvpAlIGvGmNdk5RRvtbArepjHtOkk2MNECR4zYUE9MTp0s3fmKz", "customer_reference": null}, "customer_account": null, "amount_capturable": 0, "last_payment_error": null, "setup_future_usage": null, "cancellation_reason": null, "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 02:09:43+00	{"id": "pi_3TgbaKAGtLlBc3WP2mBtGpIO", "amount": 250, "object": "payment_intent", "review": null, "source": null, "status": "succeeded", "created": 1781057380, "currency": "usd", "customer": null, "livemode": true, "metadata": {}, "shipping": null, "processing": null, "application": null, "canceled_at": null, "description": null, "next_action": null, "on_behalf_of": null, "client_secret": "pi_3TgbaKAGtLlBc3WP2mBtGpIO_secret_XN4gyKx1mScAWB8mjHdce7LMl", "latest_charge": "ch_3TgbaKAGtLlBc3WP2fRZMk3T", "receipt_email": null, "transfer_data": null, "amount_details": {"tax": {"total_tax_amount": 0}, "tip": {}, "shipping": {"amount": 0, "to_postal_code": null, "from_postal_code": null}}, "capture_method": "automatic_async", "payment_method": "pm_1TgbaEAGtLlBc3WPLeb1jpF6", "transfer_group": null, "amount_received": 250, "payment_details": {"order_reference": "cs_live_a1FZp6JBZNAQD3ZmpMvU22tje2q7HDIafM2ivvHeMhqcccC7NEMUz0hgaZ", "customer_reference": null}, "customer_account": null, "managed_payments": {"enabled": false}, "amount_capturable": 0, "last_payment_error": null, "setup_future_usage": null, "cancellation_reason": null, "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "shared_payment_granted_token": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:41:06+00	{"id": "pi_3TgtrwAGtLlBc3WP09Kk8UE2", "amount": 100, "object": "payment_intent", "review": null, "source": null, "status": "succeeded", "created": 1781127664, "currency": "usd", "customer": null, "livemode": true, "metadata": {}, "shipping": null, "processing": null, "application": null, "canceled_at": null, "description": null, "next_action": null, "on_behalf_of": null, "client_secret": "pi_3TgtrwAGtLlBc3WP09Kk8UE2_secret_TNgB0BZEnXSQftvrCIwPoB4TG", "latest_charge": "ch_3TgtrwAGtLlBc3WP0KqojfkC", "receipt_email": null, "transfer_data": null, "amount_details": {"tax": {"total_tax_amount": 0}, "tip": {}, "shipping": {"amount": 0, "to_postal_code": null, "from_postal_code": null}}, "capture_method": "automatic_async", "payment_method": "pm_1TgtruAGtLlBc3WP4gdWVQ73", "transfer_group": null, "amount_received": 100, "payment_details": {"order_reference": "cs_live_a1WrBqu3geGyublTphyCQVNK0HIPPwTo7vaiv9P0pHfcJM70PlycG2Jbwl", "customer_reference": null}, "customer_account": null, "managed_payments": {"enabled": false}, "amount_capturable": 0, "last_payment_error": null, "setup_future_usage": null, "cancellation_reason": null, "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "shared_payment_granted_token": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:46:21+00	{"id": "pi_3TgXTjAGtLlBc3WP0R9yvd4q", "amount": 250, "object": "payment_intent", "review": null, "source": null, "status": "canceled", "created": 1781041595, "currency": "usd", "customer": null, "livemode": true, "metadata": {}, "shipping": null, "processing": null, "application": null, "canceled_at": 1781127981, "description": null, "next_action": null, "on_behalf_of": null, "client_secret": "pi_3TgXTjAGtLlBc3WP0R9yvd4q_secret_c9jBdGTPOpyLvP2e1XoGuQkqi", "latest_charge": "ch_3TgXTjAGtLlBc3WP0uyHp4Bt", "receipt_email": null, "transfer_data": null, "amount_details": {"tax": {"total_tax_amount": 0}, "tip": {}, "shipping": {"amount": 0, "to_postal_code": null, "from_postal_code": null}}, "capture_method": "automatic_async", "payment_method": null, "transfer_group": null, "amount_received": 0, "payment_details": {"order_reference": "cs_live_a1AxKsTsWSC6fM8eKP53mBOH5Cvg3DTKSzXSQgx1csJxGBy2lW9zQ1kJST", "customer_reference": null}, "customer_account": null, "managed_payments": {"enabled": false}, "amount_capturable": 0, "last_payment_error": null, "setup_future_usage": null, "cancellation_reason": "automatic", "confirmation_method": "automatic", "payment_method_types": ["card"], "statement_descriptor": null, "application_fee_amount": null, "payment_method_options": {"card": {"network": null, "installments": null, "mandate_options": null, "request_three_d_secure": "automatic"}}, "automatic_payment_methods": null, "statement_descriptor_suffix": null, "shared_payment_granted_token": null, "excluded_payment_method_types": null, "payment_method_configuration_details": null}	acct_1SlePoAGtLlBc3WP
\.


--
-- Data for Name: payment_methods; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.payment_methods (_last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: payouts; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.payouts (_updated_at, _last_synced_at, _raw_data) FROM stdin;
\.


--
-- Data for Name: plans; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.plans (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: prices; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.prices (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
2026-01-10 02:42:11.388831+00	2026-01-10 02:42:10+00	{"id": "price_1Sns7yIQVqXNWHV10TAL6aTD", "type": "one_time", "active": true, "object": "price", "created": 1768012930, "product": "prod_TlOvy3Iku07nB0", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 50, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "50"}	acct_1SnqwNIQVqXNWHV1
2026-01-10 02:42:11.818309+00	2026-01-10 02:42:11+00	{"id": "price_1Sns7zIQVqXNWHV1RRh5wYEN", "type": "one_time", "active": true, "object": "price", "created": 1768012931, "product": "prod_TlOvVxqLnDAKaU", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 100, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "100"}	acct_1SnqwNIQVqXNWHV1
2026-01-10 02:42:12.280045+00	2026-01-10 02:42:11+00	{"id": "price_1Sns7zIQVqXNWHV1mQNtcLQ9", "type": "one_time", "active": true, "object": "price", "created": 1768012931, "product": "prod_TlOvcOIxajK2a0", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 250, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "250"}	acct_1SnqwNIQVqXNWHV1
2026-01-10 05:09:44.987566+00	2026-01-10 05:09:44+00	{"id": "price_1SnuQmAGtLlBc3WPf2LwcpRH", "type": "one_time", "active": true, "object": "price", "created": 1768021784, "product": "prod_TlRJRHOUSRG5kK", "currency": "usd", "livemode": true, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 50, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "50"}	acct_1SlePoAGtLlBc3WP
2026-01-10 05:09:45.426695+00	2026-01-10 05:09:45+00	{"id": "price_1SnuQnAGtLlBc3WP0kv4feWH", "type": "one_time", "active": true, "object": "price", "created": 1768021785, "product": "prod_TlRJwn6DAWVcbv", "currency": "usd", "livemode": true, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 100, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "100"}	acct_1SlePoAGtLlBc3WP
2026-01-10 05:09:45.861228+00	2026-01-10 05:09:45+00	{"id": "price_1SnuQnAGtLlBc3WPMh06ap1f", "type": "one_time", "active": true, "object": "price", "created": 1768021785, "product": "prod_TlRJJyjQncSBYA", "currency": "usd", "livemode": true, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 250, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "250"}	acct_1SlePoAGtLlBc3WP
2026-06-10 02:09:58.829944+00	2026-06-10 02:09:58.829+00	{"id": "price_1Tgba7AGtLlBc3WPT2iS1Yjq", "type": "one_time", "active": false, "object": "price", "created": 1781057367, "product": "prod_UfxF2I17rUQqFA", "currency": "usd", "livemode": true, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 250, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "250"}	acct_1SlePoAGtLlBc3WP
2026-06-10 21:41:07.276135+00	2026-06-10 21:41:07.275+00	{"id": "price_1TgtrqAGtLlBc3WPGcjWMrdZ", "type": "one_time", "active": false, "object": "price", "created": 1781127658, "product": "prod_UgGO0hrlHMLTqK", "currency": "usd", "livemode": true, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 100, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "100"}	acct_1SlePoAGtLlBc3WP
2026-06-12 02:43:10.677995+00	2026-06-12 02:43:10.677+00	{"id": "price_1TgtuMAGtLlBc3WPSrtqlRYr", "type": "one_time", "active": false, "object": "price", "created": 1781127813, "product": "prod_UgGRedabdDTmdW", "currency": "usd", "livemode": true, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 150, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "150"}	acct_1SlePoAGtLlBc3WP
2026-06-13 22:30:58.251752+00	2026-06-13 22:30:58.251+00	{"id": "price_1TgbKzAGtLlBc3WP6cRTlH0o", "type": "one_time", "active": false, "object": "price", "created": 1781056429, "product": "prod_UfxF2I17rUQqFA", "currency": "usd", "livemode": true, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 250, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "250"}	acct_1SlePoAGtLlBc3WP
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.products (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
2026-01-10 02:42:11.126559+00	2026-01-10 02:42:10+00	{"id": "prod_TlOvy3Iku07nB0", "url": null, "name": "ASOF Lite", "type": "service", "active": true, "images": [], "object": "product", "created": 1768012930, "updated": 1768012930, "livemode": false, "metadata": {"tier": "lite", "features": "verdict,score"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "Single checks & daily validation. Includes verdict and confidence score.", "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1SnqwNIQVqXNWHV1
2026-01-10 02:42:11.569071+00	2026-01-10 02:42:11+00	{"id": "prod_TlOvVxqLnDAKaU", "url": null, "name": "ASOF Pro", "type": "service", "active": true, "images": [], "object": "product", "created": 1768012931, "updated": 1768012931, "livemode": false, "metadata": {"tier": "pro", "features": "verdict,score,evidence,risk"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "High-risk decisions with evidence. Includes verdict, score, evidence, and risk analysis.", "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1SnqwNIQVqXNWHV1
2026-01-10 02:42:12.104743+00	2026-01-10 02:42:11+00	{"id": "prod_TlOvcOIxajK2a0", "url": null, "name": "ASOF Max", "type": "service", "active": true, "images": [], "object": "product", "created": 1768012931, "updated": 1768012931, "livemode": false, "metadata": {"tier": "max", "features": "verdict,score,evidence,risk,conflict,priority"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "Mission-critical multi-signal verification. Includes all features plus conflict detection and priority execution.", "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1SnqwNIQVqXNWHV1
2026-01-10 05:09:44.754795+00	2026-01-10 05:09:44+00	{"id": "prod_TlRJRHOUSRG5kK", "url": null, "name": "ASOF Lite", "type": "service", "active": true, "images": [], "object": "product", "created": 1768021784, "updated": 1768021784, "livemode": true, "metadata": {"tier": "lite", "features": "verdict,score"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "Single checks & daily validation. Includes verdict and confidence score.", "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1SlePoAGtLlBc3WP
2026-01-10 05:09:45.181947+00	2026-01-10 05:09:44+00	{"id": "prod_TlRJwn6DAWVcbv", "url": null, "name": "ASOF Pro", "type": "service", "active": true, "images": [], "object": "product", "created": 1768021784, "updated": 1768021784, "livemode": true, "metadata": {"tier": "pro", "features": "verdict,score,evidence,risk"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "High-risk decisions with evidence. Includes verdict, score, evidence, and risk analysis.", "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1SlePoAGtLlBc3WP
2026-01-10 05:09:45.641894+00	2026-01-10 05:09:45+00	{"id": "prod_TlRJJyjQncSBYA", "url": null, "name": "ASOF Max", "type": "service", "active": true, "images": [], "object": "product", "created": 1768021785, "updated": 1768021785, "livemode": true, "metadata": {"tier": "max", "features": "verdict,score,evidence,risk,conflict,priority"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "Mission-critical multi-signal verification. Includes all features plus conflict detection and priority execution.", "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1SlePoAGtLlBc3WP
\.


--
-- Data for Name: refunds; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.refunds (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.reviews (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: setup_intents; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.setup_intents (_last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: subscription_items; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.subscription_items (_last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: subscription_schedules; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.subscription_schedules (_last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.subscriptions (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: tax_ids; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.tax_ids (_last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Name: code_analyses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.code_analyses_id_seq', 2, true);


--
-- Name: free_trials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.free_trials_id_seq', 8, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 13, true);


--
-- Name: signals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.signals_id_seq', 11, true);


--
-- Name: _sync_status_id_seq; Type: SEQUENCE SET; Schema: stripe; Owner: postgres
--

SELECT pg_catalog.setval('stripe._sync_status_id_seq', 1, false);


--
-- Name: code_analyses code_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.code_analyses
    ADD CONSTRAINT code_analyses_pkey PRIMARY KEY (id);


--
-- Name: free_trials free_trials_fingerprint_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.free_trials
    ADD CONSTRAINT free_trials_fingerprint_unique UNIQUE (fingerprint);


--
-- Name: free_trials free_trials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.free_trials
    ADD CONSTRAINT free_trials_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_stripe_session_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_stripe_session_id_unique UNIQUE (stripe_session_id);


--
-- Name: signals signals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.signals
    ADD CONSTRAINT signals_pkey PRIMARY KEY (id);


--
-- Name: _migrations _migrations_name_key; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._migrations
    ADD CONSTRAINT _migrations_name_key UNIQUE (name);


--
-- Name: _migrations _migrations_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._migrations
    ADD CONSTRAINT _migrations_pkey PRIMARY KEY (id);


--
-- Name: _sync_status _sync_status_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._sync_status
    ADD CONSTRAINT _sync_status_pkey PRIMARY KEY (id);


--
-- Name: _sync_status _sync_status_resource_account_key; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._sync_status
    ADD CONSTRAINT _sync_status_resource_account_key UNIQUE (resource, account_id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: active_entitlements active_entitlements_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.active_entitlements
    ADD CONSTRAINT active_entitlements_pkey PRIMARY KEY (id);


--
-- Name: charges charges_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.charges
    ADD CONSTRAINT charges_pkey PRIMARY KEY (id);


--
-- Name: checkout_session_line_items checkout_session_line_items_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.checkout_session_line_items
    ADD CONSTRAINT checkout_session_line_items_pkey PRIMARY KEY (id);


--
-- Name: checkout_sessions checkout_sessions_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.checkout_sessions
    ADD CONSTRAINT checkout_sessions_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: credit_notes credit_notes_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.credit_notes
    ADD CONSTRAINT credit_notes_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: disputes disputes_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.disputes
    ADD CONSTRAINT disputes_pkey PRIMARY KEY (id);


--
-- Name: early_fraud_warnings early_fraud_warnings_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.early_fraud_warnings
    ADD CONSTRAINT early_fraud_warnings_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: features features_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.features
    ADD CONSTRAINT features_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: _managed_webhooks managed_webhooks_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._managed_webhooks
    ADD CONSTRAINT managed_webhooks_pkey PRIMARY KEY (id);


--
-- Name: _managed_webhooks managed_webhooks_url_account_unique; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._managed_webhooks
    ADD CONSTRAINT managed_webhooks_url_account_unique UNIQUE (url, account_id);


--
-- Name: payment_intents payment_intents_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.payment_intents
    ADD CONSTRAINT payment_intents_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: payouts payouts_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.payouts
    ADD CONSTRAINT payouts_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: prices prices_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.prices
    ADD CONSTRAINT prices_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: refunds refunds_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.refunds
    ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: setup_intents setup_intents_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.setup_intents
    ADD CONSTRAINT setup_intents_pkey PRIMARY KEY (id);


--
-- Name: subscription_items subscription_items_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.subscription_items
    ADD CONSTRAINT subscription_items_pkey PRIMARY KEY (id);


--
-- Name: subscription_schedules subscription_schedules_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.subscription_schedules
    ADD CONSTRAINT subscription_schedules_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: tax_ids tax_ids_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.tax_ids
    ADD CONSTRAINT tax_ids_pkey PRIMARY KEY (id);


--
-- Name: active_entitlements_lookup_key_key; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE UNIQUE INDEX active_entitlements_lookup_key_key ON stripe.active_entitlements USING btree (lookup_key) WHERE (lookup_key IS NOT NULL);


--
-- Name: features_lookup_key_key; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE UNIQUE INDEX features_lookup_key_key ON stripe.features USING btree (lookup_key) WHERE (lookup_key IS NOT NULL);


--
-- Name: idx_accounts_api_key_hashes; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX idx_accounts_api_key_hashes ON stripe.accounts USING gin (api_key_hashes);


--
-- Name: idx_accounts_business_name; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX idx_accounts_business_name ON stripe.accounts USING btree (business_name);


--
-- Name: idx_sync_status_resource_account; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX idx_sync_status_resource_account ON stripe._sync_status USING btree (resource, account_id);


--
-- Name: stripe_active_entitlements_customer_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_active_entitlements_customer_idx ON stripe.active_entitlements USING btree (customer);


--
-- Name: stripe_active_entitlements_feature_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_active_entitlements_feature_idx ON stripe.active_entitlements USING btree (feature);


--
-- Name: stripe_checkout_session_line_items_price_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_checkout_session_line_items_price_idx ON stripe.checkout_session_line_items USING btree (price);


--
-- Name: stripe_checkout_session_line_items_session_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_checkout_session_line_items_session_idx ON stripe.checkout_session_line_items USING btree (checkout_session);


--
-- Name: stripe_checkout_sessions_customer_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_checkout_sessions_customer_idx ON stripe.checkout_sessions USING btree (customer);


--
-- Name: stripe_checkout_sessions_invoice_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_checkout_sessions_invoice_idx ON stripe.checkout_sessions USING btree (invoice);


--
-- Name: stripe_checkout_sessions_payment_intent_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_checkout_sessions_payment_intent_idx ON stripe.checkout_sessions USING btree (payment_intent);


--
-- Name: stripe_checkout_sessions_subscription_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_checkout_sessions_subscription_idx ON stripe.checkout_sessions USING btree (subscription);


--
-- Name: stripe_credit_notes_customer_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_credit_notes_customer_idx ON stripe.credit_notes USING btree (customer);


--
-- Name: stripe_credit_notes_invoice_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_credit_notes_invoice_idx ON stripe.credit_notes USING btree (invoice);


--
-- Name: stripe_dispute_created_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_dispute_created_idx ON stripe.disputes USING btree (created);


--
-- Name: stripe_early_fraud_warnings_charge_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_early_fraud_warnings_charge_idx ON stripe.early_fraud_warnings USING btree (charge);


--
-- Name: stripe_early_fraud_warnings_payment_intent_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_early_fraud_warnings_payment_intent_idx ON stripe.early_fraud_warnings USING btree (payment_intent);


--
-- Name: stripe_invoices_customer_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_invoices_customer_idx ON stripe.invoices USING btree (customer);


--
-- Name: stripe_invoices_subscription_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_invoices_subscription_idx ON stripe.invoices USING btree (subscription);


--
-- Name: stripe_managed_webhooks_enabled_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_managed_webhooks_enabled_idx ON stripe._managed_webhooks USING btree (enabled);


--
-- Name: stripe_managed_webhooks_status_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_managed_webhooks_status_idx ON stripe._managed_webhooks USING btree (status);


--
-- Name: stripe_payment_intents_customer_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_payment_intents_customer_idx ON stripe.payment_intents USING btree (customer);


--
-- Name: stripe_payment_intents_invoice_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_payment_intents_invoice_idx ON stripe.payment_intents USING btree (invoice);


--
-- Name: stripe_payment_methods_customer_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_payment_methods_customer_idx ON stripe.payment_methods USING btree (customer);


--
-- Name: stripe_refunds_charge_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_refunds_charge_idx ON stripe.refunds USING btree (charge);


--
-- Name: stripe_refunds_payment_intent_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_refunds_payment_intent_idx ON stripe.refunds USING btree (payment_intent);


--
-- Name: stripe_reviews_charge_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_reviews_charge_idx ON stripe.reviews USING btree (charge);


--
-- Name: stripe_reviews_payment_intent_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_reviews_payment_intent_idx ON stripe.reviews USING btree (payment_intent);


--
-- Name: stripe_setup_intents_customer_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_setup_intents_customer_idx ON stripe.setup_intents USING btree (customer);


--
-- Name: stripe_tax_ids_customer_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_tax_ids_customer_idx ON stripe.tax_ids USING btree (customer);


--
-- Name: _managed_webhooks handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe._managed_webhooks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_metadata();


--
-- Name: _sync_status handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe._sync_status FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_metadata();


--
-- Name: accounts handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: active_entitlements handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.active_entitlements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: charges handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.charges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: checkout_session_line_items handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.checkout_session_line_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: checkout_sessions handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.checkout_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: coupons handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: customers handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: disputes handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.disputes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: early_fraud_warnings handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.early_fraud_warnings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: events handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: features handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.features FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: invoices handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payouts handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.payouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: plans handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: prices handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.prices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: products handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: refunds handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.refunds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: reviews handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: subscriptions handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: active_entitlements fk_active_entitlements_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.active_entitlements
    ADD CONSTRAINT fk_active_entitlements_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: charges fk_charges_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.charges
    ADD CONSTRAINT fk_charges_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: checkout_session_line_items fk_checkout_session_line_items_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.checkout_session_line_items
    ADD CONSTRAINT fk_checkout_session_line_items_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: checkout_sessions fk_checkout_sessions_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.checkout_sessions
    ADD CONSTRAINT fk_checkout_sessions_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: credit_notes fk_credit_notes_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.credit_notes
    ADD CONSTRAINT fk_credit_notes_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: customers fk_customers_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.customers
    ADD CONSTRAINT fk_customers_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: disputes fk_disputes_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.disputes
    ADD CONSTRAINT fk_disputes_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: early_fraud_warnings fk_early_fraud_warnings_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.early_fraud_warnings
    ADD CONSTRAINT fk_early_fraud_warnings_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: features fk_features_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.features
    ADD CONSTRAINT fk_features_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: invoices fk_invoices_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.invoices
    ADD CONSTRAINT fk_invoices_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: _managed_webhooks fk_managed_webhooks_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._managed_webhooks
    ADD CONSTRAINT fk_managed_webhooks_account FOREIGN KEY (account_id) REFERENCES stripe.accounts(id);


--
-- Name: payment_intents fk_payment_intents_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.payment_intents
    ADD CONSTRAINT fk_payment_intents_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: payment_methods fk_payment_methods_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.payment_methods
    ADD CONSTRAINT fk_payment_methods_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: plans fk_plans_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.plans
    ADD CONSTRAINT fk_plans_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: prices fk_prices_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.prices
    ADD CONSTRAINT fk_prices_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: products fk_products_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.products
    ADD CONSTRAINT fk_products_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: refunds fk_refunds_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.refunds
    ADD CONSTRAINT fk_refunds_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: reviews fk_reviews_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.reviews
    ADD CONSTRAINT fk_reviews_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: setup_intents fk_setup_intents_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.setup_intents
    ADD CONSTRAINT fk_setup_intents_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: subscription_items fk_subscription_items_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.subscription_items
    ADD CONSTRAINT fk_subscription_items_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: subscription_schedules fk_subscription_schedules_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.subscription_schedules
    ADD CONSTRAINT fk_subscription_schedules_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: subscriptions fk_subscriptions_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.subscriptions
    ADD CONSTRAINT fk_subscriptions_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: _sync_status fk_sync_status_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._sync_status
    ADD CONSTRAINT fk_sync_status_account FOREIGN KEY (account_id) REFERENCES stripe.accounts(id);


--
-- Name: tax_ids fk_tax_ids_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.tax_ids
    ADD CONSTRAINT fk_tax_ids_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 7ER6kcgLvuYjvIEwDCHSfl0LP8gFhBSbfVcoaaMJlcAtCa9Fa7zG6q3130ZAXK9

