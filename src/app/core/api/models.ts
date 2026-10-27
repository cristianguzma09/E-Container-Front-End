// Mirrors the Pydantic schemas in econtainer-ocr-app. Field names stay
// snake_case, exactly as on the wire; keep this file in step with the backend.

export type JobStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'NEEDS_REVIEW'
  | 'FAILED'
  | 'CONFIRMED';

export type Cleanliness = 'CLEAN' | 'DIRTY';
export type StructuralState = 'SOUND' | 'DAMAGED';
export type CargoGrade = 'NOT_SUITABLE' | 'GENERAL_CARGO' | 'FOOD_GRADE';
export type IdentificationSource = 'OCR' | 'MANUAL' | 'IMPORT';

export interface Candidate {
  value: string;
  raw_text: string;
  confidence: number;
  score: number;
  check_digit_valid: boolean;
  expected_check_digit: number | null;
  repaired: boolean;
  needs_human_confirmation: boolean;
}

export interface Fragment {
  text: string;
  confidence: number;
}

export interface RecognitionJob {
  id: string;
  status: JobStatus;
  image_ref: string;
  submitted_at: string;
  submitted_by: string | null;
  completed_at: string | null;
  failure_reason: string | null;
  confirmed_container_number: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  container_number: string | null;
  confidence: number | null;
  check_digit_valid: boolean | null;
  repaired: boolean | null;
  needs_review: boolean;
  candidates: Candidate[];
  fragments: Fragment[];
}

export interface ConfirmCaptureRequest {
  confirmed_by: string;
  size_type_code: string;
  cleanliness: Cleanliness;
  structural: StructuralState;
  food_certified?: boolean;
  /** Null accepts the engine's reading; a value corrects it. */
  container_number?: string | null;
  notes?: string | null;
}

export interface Container {
  number: string;
  formatted_number: string;
  owner_code: string;
  equipment_category: string;
  serial_number: string;
  check_digit: number;
  size_type_code: string;
  size_label: string;
  length_ft: number;
  height_mm: number;
  is_high_cube: boolean;
  container_type: string;
  cleanliness: Cleanliness;
  structural: StructuralState;
  cargo_grade: CargoGrade;
  is_available_for_loading: boolean;
  identified_at: string;
  identified_by: string;
  inspection_count: number;
  last_inspected_at: string | null;
}

export interface ConfirmedCapture {
  job: RecognitionJob;
  container: Container;
  newly_registered: boolean;
  corrected: boolean;
}

export interface Inspection {
  id: string;
  inspected_at: string;
  inspected_by: string;
  cleanliness: Cleanliness;
  structural: StructuralState;
  cargo_grade: CargoGrade;
  notes: string | null;
  evidence_image_ref: string | null;
}

export interface ContainerDetail {
  container: Container;
  inspections: Inspection[];
}

export interface RegisterContainerRequest {
  container_number: string;
  size_type_code: string;
  cleanliness: Cleanliness;
  structural: StructuralState;
  food_certified?: boolean;
  source?: IdentificationSource;
  inspected_by?: string | null;
  notes?: string | null;
  evidence_image_ref?: string | null;
}

export interface RecordInspectionRequest {
  inspected_by: string;
  cleanliness: Cleanliness;
  structural: StructuralState;
  food_certified?: boolean;
  notes?: string | null;
  evidence_image_ref?: string | null;
  inspected_at?: string | null;
}

export interface ContainerNumberValidation {
  input: string;
  is_valid: boolean;
  number: string | null;
  formatted_number: string | null;
  owner_code: string | null;
  equipment_category: string | null;
  serial_number: string | null;
  check_digit: number | null;
  expected_check_digit: number | null;
  error: string | null;
}

/** Body of every domain error the API returns (404 / 409 / 422). */
export interface ApiError {
  code: string;
  detail: string;
  rule: string | null;
}

export interface Page {
  limit?: number;
  offset?: number;
}
