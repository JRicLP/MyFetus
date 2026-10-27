

// ==========================================
// LOTE 1: UTILIZADORES, MÉDICOS E AUTENTICAÇÃO
// ==========================================

// O ficheiro SQL define que o 'role' só pode ser um destes três
export type Role = 'gestante' | 'medico' | 'admin';
export type DoctorApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

export interface User {
  id: number;
  name: string;
  email: string;
  birthdate: string;
  is_active: boolean;
  role: Role;
  created_at: string;
  updated_at: string;
}

// Contrato exato do que a função loginUser devolve
export interface AuthResponse {
  message: string;
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: Role;
    pregnant_id: number | null;
    doctor_approval_status?: DoctorApprovalStatus;
    doctor_approval_reason?: string | null;
  };
}

export interface Doctor {
  id: number;
  user_id: number;
  crm: string;
  crm_estado: string;
  especialidade?: string | null;
  telefone?: string | null;
  created_at: string;
  updated_at: string;
  approval_status?: DoctorApprovalStatus;
  approval_reason?: string | null;
}

export interface DoctorApprovalRecord extends Doctor {
  name: string;
  email: string;
  birthdate: string;
  is_active: boolean;
}

export interface CreateDoctorRequest {
  name: string;
  email: string;
  password: string;
  birthdate: string;
  crm: string;
  crm_estado: string;
  especialidade?: string;
  telefone?: string;
}


// ==========================================
// LOTE 2: GESTANTES E GESTAÇÕES
// ==========================================

// Contrato da resposta gerada pela função getPregnants no backend
export interface PregnantSummary {
  pregnant_id: number;
  user_id: number;
  patient_name: string;
  birthdate: string;
  semanas_gestacao: number | null;
}

// Contrato da tabela pregnancies
export interface Pregnancy {
  id: number;
  pregnant_id: number;
  weeks: number;
  is_checked: boolean;
  dum: string;
  dpp: string;
  ccn: number;
  dgm: number;
  glicemia: number | null;
  frequencia_cardiaca: number;
  altura_uterina: number;
  regularidade_do_ciclo: boolean;
  ig_ultrassonografia: string;
  created_at: string;
  updated_at: string;
}

// Dados exigidos pela função createPregnancy
export interface CreatePregnancyRequest {
  pregnant_id: number;
  weeks?: number;
  is_checked?: boolean;
  dum: string; // datas trafegam como strings (formato ISO)
  dpp: string;
  ccn?: number;
  dgm?: number;
  glicemia?: number;
  frequencia_cardiaca?: number;
  altura_uterina?: number;
  regularidade_do_ciclo?: boolean;
  ig_ultrassonografia: string;
}

// ==========================================
// LOTE 3: EXAMES E DOCUMENTOS
// ==========================================

export type ExtractionStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface PregnantDocument {
  id: number;
  pregnant_id: number;
  document_name: string;
  document_type: string | null;
  // file_path não é enviado para o frontend por segurança
  extracted_text?: string | null;
  extraction_status: ExtractionStatus;
  extraction_method?: string | null;
  extraction_confidence?: number | null;
  extraction_error?: string | null;
  extraction_attempts?: number;
  extracted_at?: string | null;
  uploaded_at: string;
  updated_at: string;
  report_comment?: string | null;
  reviewed_by_user_id?: number | null;
  status?: string; // ex: 'reviewed'
}

export interface DocumentExtractedTextResponse {
  document_id: number;
  extraction_status: ExtractionStatus;
  extraction_method?: string;
  extraction_confidence?: number;
  extraction_error?: string;
  extraction_attempts?: number;
  extracted_at?: string;
  extracted_text?: string;
}
