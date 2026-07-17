// Cupp data-layer types — the contract every screen and repo speaks.
// Screens NEVER import supabase directly; they go through the Repo interface (repo.ts).

// ---------------------------------------------------------------------------
// Bean fields (the scan half of a log) + grounding metadata
// ---------------------------------------------------------------------------

/**
 * Where a bean value came from.
 * - read/inferred/not_visible come from the scan grounding guardrail.
 * - manual = the user typed it in the form (never merged with roaster notes).
 */
export type Basis = 'read' | 'inferred' | 'not_visible' | 'manual';

/** The 12 bean fields, in canonical order. Keys match DB columns / scan contract. */
export type BeanFieldKey =
  | 'roaster'
  | 'coffee_name'
  | 'origin_country'
  | 'origin_region'
  | 'process'
  | 'variety'
  | 'roast_level'
  | 'altitude'
  | 'roast_date'
  | 'roaster_tasting_notes'
  | 'weight'
  | 'decaf';

export const BEAN_FIELD_KEYS: BeanFieldKey[] = [
  'roaster',
  'coffee_name',
  'origin_country',
  'origin_region',
  'process',
  'variety',
  'roast_level',
  'altitude',
  'roast_date',
  'roaster_tasting_notes',
  'weight',
  'decaf',
];

/**
 * A single bean field as carried through scan + form.
 * `value` is uniformly a string (or null) for a generic form UI:
 *  - roaster_tasting_notes: comma-separated string (split to text[] on save)
 *  - decaf: 'Decaf' | 'Caffeinated' | null
 * `sourceText` is the exact label snippet the model read it from (or null).
 */
export interface BeanField {
  value: string | null;
  sourceText: string | null;
  basis: Basis;
}

/** All 12 bean fields, keyed. This is the scan output shape and the form's bean model. */
export type BeanFields = Record<BeanFieldKey, BeanField>;

/** Per-field grounding metadata as stored in logs.bean_basis (jsonb). */
export interface BeanFieldMeta {
  sourceText: string | null;
  basis: Basis;
}

// ---------------------------------------------------------------------------
// Scan pipeline (lib/scan.ts, WP9)
// ---------------------------------------------------------------------------

export type ScanStage = 'uploading' | 'reading' | 'building';

export interface ScanResult {
  isCoffeeBag: boolean;
  fields: BeanFields;
}

// ---------------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------------

/** Four cupping characteristics + overall, each 1–5 (null = unset). */
export interface Ratings {
  strength: number | null;
  acidity: number | null;
  sweetness: number | null;
  bitterness: number | null;
  overall: number | null;
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarPath: string | null;
  /** Pre-resolved displayable avatar URL (repo hydrates this; null = show initials). */
  avatarUrl: string | null;
  createdAt: string;
}

/** Lightweight author reference denormalized onto logs/comments for cards. */
export interface ProfileSummary {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface ProfileStats {
  logCount: number;
  followerCount: number;
  followingCount: number;
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export type Visibility = 'public' | 'private';

export interface Log {
  id: string;
  userId: string;
  author: ProfileSummary;
  visibility: Visibility;

  // Bean (flattened, matches DB columns)
  roaster: string | null;
  coffeeName: string | null;
  originCountry: string | null;
  originRegion: string | null;
  process: string | null;
  variety: string | null;
  roastLevel: string | null;
  altitude: string | null;
  roastDate: string | null;
  roasterTastingNotes: string[]; // the ROASTER's printed notes (never the user's)
  weight: string | null;
  decaf: boolean | null;
  /** Grounding metadata per bean field (source_text + basis), for the read ✓ chips. */
  beanBasis: Partial<Record<BeanFieldKey, BeanFieldMeta>>;

  photoPath: string | null;
  /** Pre-resolved displayable photo URL (repo hydrates; null = show placeholder). */
  photoUrl: string | null;

  // Brew
  method: string | null;
  doseG: number | null;
  yieldG: number | null;
  grind: string | null;
  waterTempC: number | null;
  brewTimeS: number | null;

  // Rating + notes
  ratings: Ratings;
  notes: string | null; // the USER's own tasting notes

  createdAt: string;

  // Social (counts + viewer state)
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

// ---------------------------------------------------------------------------
// Comments, templates
// ---------------------------------------------------------------------------

export interface Comment {
  id: string;
  logId: string;
  author: ProfileSummary;
  body: string;
  createdAt: string;
}

export interface BrewTemplate {
  id: string;
  userId: string;
  name: string;
  method: string;
  doseG: number | null;
  yieldG: number | null;
  grind: string | null;
  waterTempC: number | null;
  brewTimeS: number | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Auth session
// ---------------------------------------------------------------------------

export interface Session {
  userId: string;
  username: string;
  profile: Profile;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface SignUpInput {
  email: string;
  password: string;
  username: string;
  displayName?: string;
}

/** Everything the log form collects on save. */
export interface CreateLogInput {
  visibility: Visibility;
  /** Bean fields (form-edited; basis carried through for storage). */
  bean: BeanFields;
  /** Local image uri to upload, if any (repo uploads → path). */
  photoLocalUri?: string | null;
  method: string | null;
  doseG: number | null;
  yieldG: number | null;
  grind: string | null;
  waterTempC: number | null;
  brewTimeS: number | null;
  ratings: Ratings;
  notes: string | null;
}

export type UpdateProfileInput = Partial<
  Pick<Profile, 'displayName' | 'bio' | 'avatarPath'>
>;

export type CreateTemplateInput = Omit<
  BrewTemplate,
  'id' | 'userId' | 'createdAt'
>;

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

export interface DiscoveryFilters {
  /** null/undefined = "All". */
  origin?: string | null;
  roaster?: string | null;
  method?: string | null;
}

export interface DiscoveryFacets {
  origins: string[];
  roasters: string[];
  methods: string[];
}
