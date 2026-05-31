--
-- PostgreSQL database dump
--

\restrict JF1XBwFQ4moxROhQbmObpAkSFKXB2ZJK3OLnuWc53cF0SLfA7krADblhAxS3Ccw

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF-8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: update_pregnant_updated_at(); Type: FUNCTION; Schema: public; Owner: myuser
--

CREATE FUNCTION public.update_pregnant_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.update_pregnant_updated_at() OWNER TO myuser;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: myuser
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

  NEW.updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;

END;

$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO myuser;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: doctors; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.doctors (
    id integer NOT NULL,
    user_id integer,
    crm character varying(20) NOT NULL,
    crm_estado character varying(2) NOT NULL,
    especialidade character varying(100),
    telefone character varying(20),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.doctors OWNER TO myuser;

--
-- Name: doctors_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--user

CREATE SEQUENCE public.doctors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.doctors_id_seq OWNER TO myuser;

--
-- Name: doctors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.doctors_id_seq OWNED BY public.doctors.id;


--
-- Name: medidas_fetais; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.medidas_fetais (
    id integer NOT NULL,
    ccn double precision DEFAULT 0.0,
    crl double precision DEFAULT 0.0,
    dgn double precision DEFAULT 0.0,
    idade_gestacional_semanas integer NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.medidas_fetais OWNER TO myuser;

--
-- Name: medidas_fetais_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.medidas_fetais_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.medidas_fetais_id_seq OWNER TO myuser;

--
-- Name: medidas_fetais_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.medidas_fetais_id_seq OWNED BY public.medidas_fetais.id;


--
-- Name: pregnancies; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.pregnancies (
    id integer NOT NULL,
    pregnant_id integer,
    weeks integer DEFAULT 0,
    is_checked boolean DEFAULT false,
    dum date NOT NULL,
    dpp date NOT NULL,
    ccn double precision DEFAULT 0.0,
    dgm double precision DEFAULT 0.0,
    glicemia double precision,
    frequencia_cardiaca integer DEFAULT 0,
    altura_uterina double precision DEFAULT 0,
    regularidade_do_ciclo boolean DEFAULT true,
    ig_ultrassonografia date NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pregnancies OWNER TO myuser;

--
-- Name: pregnancies_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.pregnancies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pregnancies_id_seq OWNER TO myuser;

--
-- Name: pregnancies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.pregnancies_id_seq OWNED BY public.pregnancies.id;


--
-- Name: pregnancy_events; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.pregnancy_events (
    id integer NOT NULL,
    pregnancy_id integer,
    descricao text NOT NULL,
    data_evento date NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pregnancy_events OWNER TO myuser;

--
-- Name: pregnancy_events_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.pregnancy_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pregnancy_events_id_seq OWNER TO myuser;

--
-- Name: pregnancy_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.pregnancy_events_id_seq OWNED BY public.pregnancy_events.id;


--
-- Name: pregnant_documents; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.pregnant_documents (
    id integer NOT NULL,
    pregnant_id integer,
    document_name character varying(255) NOT NULL,
    document_type character varying(100),
    file_path text NOT NULL,
    extracted_text text,
    extraction_status character varying(20) DEFAULT 'pending'::character varying,
    extraction_method character varying(20),
    extraction_confidence numeric(5,2),
    extraction_error text,
    extraction_attempts integer DEFAULT 0,
    extracted_at timestamp without time zone,
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pregnant_documents OWNER TO myuser;

--
-- Name: pregnant_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.pregnant_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pregnant_documents_id_seq OWNER TO myuser;

--
-- Name: pregnant_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.pregnant_documents_id_seq OWNED BY public.pregnant_documents.id;


--
-- Name: pregnants; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.pregnants (
    id integer NOT NULL,
    user_id integer,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    altura double precision,
    peso_pregestacional double precision,
    peso_atual double precision,
    temperatura_materna double precision,
    pressao_sistole integer DEFAULT 0,
    pressao_diastole integer DEFAULT 0,
    antecedentes_diabetes boolean DEFAULT false,
    antecedentes_hipertensao boolean DEFAULT false,
    antecedentes_gemelar boolean DEFAULT false,
    antecedentes_outros boolean DEFAULT false,
    antecedentes_texto text,
    gestacao_partos integer DEFAULT 0,
    gestacao_vaginal integer DEFAULT 0,
    gestacao_cesarea integer DEFAULT 0,
    gestacao_bebe_maior_45 boolean DEFAULT false,
    gestacao_bebe_maior_25 boolean DEFAULT false,
    gestacao_eclampsia_pre_eclampsia boolean DEFAULT false,
    gestacao_gestas boolean DEFAULT false,
    gestacao_abortos integer DEFAULT 0,
    gestacao_mais_tres_abortos boolean DEFAULT false,
    gestacao_nascidos_vivos integer DEFAULT 0,
    gestacao_nascidos_mortos integer DEFAULT 0,
    gestacao_vivem integer DEFAULT 0,
    gestacao_mortos_primeira_semana integer DEFAULT 0,
    gestacao_mortos_depois_primeira_semana integer DEFAULT 0,
    gestacao_final_gestacao_anterior_1ano boolean DEFAULT false,
    antecedentes_clinicos_diabetes boolean DEFAULT false,
    antecedentes_clinicos_infeccao_urinaria boolean DEFAULT false,
    antecedentes_clinicos_infertilidade boolean DEFAULT false,
    antecedentes_clinicos_dific_amamentacao boolean DEFAULT false,
    antecedentes_clinicos_cardiopatia boolean DEFAULT false,
    antecedentes_clinicos_tromboembolismo boolean DEFAULT false,
    antecedentes_clinicos_hipertensao_arterial boolean DEFAULT false,
    antecedentes_clinicos_cirur_per_uterina boolean DEFAULT false,
    antecedentes_clinicos_cirurgia boolean DEFAULT false,
    antecedentes_clinicos_outros boolean DEFAULT false,
    antecedentes_clinicos_outros_texto text,
    gestacao_atual_fumante boolean DEFAULT false,
    gestacao_atual_quant_cigarros integer DEFAULT 0,
    gestacao_atual_alcool boolean DEFAULT false,
    gestacao_atual_outras_drogas boolean DEFAULT false,
    gestacao_atual_hiv_aids boolean DEFAULT false,
    gestacao_atual_sifilis boolean DEFAULT false,
    gestacao_atual_toxoplasmose boolean DEFAULT false,
    gestacao_atual_infeccao_urinaria boolean DEFAULT false,
    gestacao_atual_anemia boolean DEFAULT false,
    gestacao_atual_inc_istmocervical boolean DEFAULT false,
    gestacao_atual_ameaca_parto_premat boolean DEFAULT false,
    gestacao_atual_imuniz_rh boolean DEFAULT false,
    gestacao_atual_oligo_polidramio boolean DEFAULT false,
    gestacao_atual_rut_prem_membrana boolean DEFAULT false,
    gestacao_atual_ciur boolean DEFAULT false,
    gestacao_atual_pos_datismo boolean DEFAULT false,
    gestacao_atual_febre boolean DEFAULT false,
    gestacao_atual_hipertensao_arterial boolean DEFAULT false,
    gestacao_atual_pre_eclamp_eclamp boolean DEFAULT false,
    gestacao_atual_cardiopatia boolean DEFAULT false,
    gestacao_atual_diabete_gestacional boolean DEFAULT false,
    gestacao_atual_uso_insulina boolean DEFAULT false,
    gestacao_atual_hemorragia_1trim boolean DEFAULT false,
    gestacao_atual_hemorragia_2trim boolean DEFAULT false,
    gestacao_atual_hemorragia_3trim boolean DEFAULT false,
    exantema_rash boolean DEFAULT false,
    vacina_antitetanica boolean DEFAULT false,
    vacina_antitetanica_1dose TIMESTAMPTZ,
    vacina_antitetanica_2dose TIMESTAMPTZ,
    vacina_antitetanica_dtpa TIMESTAMPTZ,
    vacina_hepatite_b boolean DEFAULT false,
    vacina_hepatite_b_1dose TIMESTAMPTZ,
    vacina_hepatite_b_2dose TIMESTAMPTZ,
    vacina_hepatite_b_3dose TIMESTAMPTZ,
    vacina_influenza boolean DEFAULT false,
    vacina_influenza_1dose TIMESTAMPTZ,
    vacina_covid19 boolean DEFAULT false,
    vacina_covid19_1dose TIMESTAMPTZ,
    vacina_covid19_2dose TIMESTAMPTZ,
    info_gerais_edemas text,
    info_gerais_sintomas text,
    info_gerais_estado_geral_1 text,
    info_gerais_estado_geral_2 text,
    info_gerais_nutricional text,
    info_gerais_psicossocial text
);


ALTER TABLE public.pregnants OWNER TO myuser;

--
-- Name: pregnants_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.pregnants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pregnants_id_seq OWNER TO myuser;

--
-- Name: pregnants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.pregnants_id_seq OWNED BY public.pregnants.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password text NOT NULL,
    birthdate date NOT NULL,
    is_active boolean DEFAULT true,
    role character varying(20) DEFAULT 'gestante'::character varying,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['gestante'::character varying, 'medico'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO myuser;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO myuser;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: doctors id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.doctors ALTER COLUMN id SET DEFAULT nextval('public.doctors_id_seq'::regclass);


--
-- Name: medidas_fetais id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.medidas_fetais ALTER COLUMN id SET DEFAULT nextval('public.medidas_fetais_id_seq'::regclass);


--
-- Name: pregnancies id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.pregnancies ALTER COLUMN id SET DEFAULT nextval('public.pregnancies_id_seq'::regclass);


--
-- Name: pregnancy_events id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.pregnancy_events ALTER COLUMN id SET DEFAULT nextval('public.pregnancy_events_id_seq'::regclass);


--
-- Name: pregnant_documents id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.pregnant_documents ALTER COLUMN id SET DEFAULT nextval('public.pregnant_documents_id_seq'::regclass);


--
-- Name: pregnants id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.pregnants ALTER COLUMN id SET DEFAULT nextval('public.pregnants_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: doctors doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_pkey PRIMARY KEY (id);


--
-- Name: medidas_fetais medidas_fetais_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.medidas_fetais
    ADD CONSTRAINT medidas_fetais_pkey PRIMARY KEY (id);


--
-- Name: pregnancies pregnancies_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.pregnancies
    ADD CONSTRAINT pregnancies_pkey PRIMARY KEY (id);


--
-- Name: pregnancy_events pregnancy_events_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.pregnancy_events
    ADD CONSTRAINT pregnancy_events_pkey PRIMARY KEY (id);


--
-- Name: pregnant_documents pregnant_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.pregnant_documents
    ADD CONSTRAINT pregnant_documents_pkey PRIMARY KEY (id);


--
-- Name: pregnant_documents pregnant_documents_extraction_status_check; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.pregnant_documents
    ADD CONSTRAINT pregnant_documents_extraction_status_check CHECK (((extraction_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'done'::character varying, 'failed'::character varying])::text[])));


--
-- Name: pregnants pregnants_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.pregnants
    ADD CONSTRAINT pregnants_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: pregnants trg_update_pregnant_updated_at; Type: TRIGGER; Schema: public; Owner: myuser
--

CREATE TRIGGER trg_update_pregnant_updated_at BEFORE UPDATE ON public.pregnants FOR EACH ROW EXECUTE FUNCTION public.update_pregnant_updated_at();


--
-- Name: doctors update_doctors_updated_at; Type: TRIGGER; Schema: public; Owner: myuser
--

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: medidas_fetais update_medidas_fetais_updated_at; Type: TRIGGER; Schema: public; Owner: myuser
--

CREATE TRIGGER update_medidas_fetais_updated_at BEFORE UPDATE ON public.medidas_fetais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pregnancies update_pregnancies_updated_at; Type: TRIGGER; Schema: public; Owner: myuser
--

CREATE TRIGGER update_pregnancies_updated_at BEFORE UPDATE ON public.pregnancies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pregnancy_events update_pregnancy_events_updated_at; Type: TRIGGER; Schema: public; Owner: myuser
--

CREATE TRIGGER update_pregnancy_events_updated_at BEFORE UPDATE ON public.pregnancy_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pregnant_documents update_pregnant_documents_updated_at; Type: TRIGGER; Schema: public; Owner: myuser
--

CREATE TRIGGER update_pregnant_documents_updated_at BEFORE UPDATE ON public.pregnant_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_user_updated_at; Type: TRIGGER; Schema: public; Owner: myuser
--

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: doctors doctors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pregnancies pregnancies_pregnant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.pregnancies
    ADD CONSTRAINT pregnancies_pregnant_id_fkey FOREIGN KEY (pregnant_id) REFERENCES public.pregnants(id) ON DELETE CASCADE;


--
-- Name: pregnancy_events pregnancy_events_pregnancy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.pregnancy_events
    ADD CONSTRAINT pregnancy_events_pregnancy_id_fkey FOREIGN KEY (pregnancy_id) REFERENCES public.pregnancies(id) ON DELETE CASCADE;


--
-- Name: pregnant_documents pregnant_documents_pregnant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.pregnant_documents
    ADD CONSTRAINT pregnant_documents_pregnant_id_fkey FOREIGN KEY (pregnant_id) REFERENCES public.pregnants(id) ON DELETE CASCADE;


--
-- Name: pregnants pregnants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.pregnants
    ADD CONSTRAINT pregnants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict JF1XBwFQ4moxROhQbmObpAkSFKXB2ZJK3OLnuWc53cF0SLfA7krADblhAxS3Ccw
