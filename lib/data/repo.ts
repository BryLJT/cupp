// The repository interface: the single boundary between screens and the backend.
// Screens depend ONLY on this interface (imported via lib/data). Two implementations
// exist: demoRepo (in-memory fixtures, no network) and supabaseRepo (real backend).

import type {
  BrewTemplate,
  Comment,
  CreateLogInput,
  CreateTemplateInput,
  DiscoveryFacets,
  DiscoveryFilters,
  Log,
  Profile,
  ProfileStats,
  Session,
  SignUpInput,
  UpdateProfileInput,
} from './types';

export interface Repo {
  // --- auth -----------------------------------------------------------------
  /** Current session, or null if signed out. */
  getSession(): Promise<Session | null>;
  /** Subscribe to auth changes. Returns an unsubscribe fn. */
  onAuthChange(cb: (session: Session | null) => void): () => void;
  /** identifier: email or username. */
  signIn(identifier: string, password: string): Promise<Session>;
  signUp(input: SignUpInput): Promise<Session>;
  signOut(): Promise<void>;

  // --- profiles -------------------------------------------------------------
  getProfile(userId: string): Promise<Profile | null>;
  getProfileByUsername(username: string): Promise<Profile | null>;
  getProfileStats(userId: string): Promise<ProfileStats>;
  updateProfile(input: UpdateProfileInput): Promise<Profile>;

  // --- logs -----------------------------------------------------------------
  createLog(input: CreateLogInput): Promise<Log>;
  getLog(id: string): Promise<Log | null>;
  /** A user's logs, newest first. Own private logs included only when it's you. */
  logsByUser(userId: string, opts?: { includePrivate?: boolean }): Promise<Log[]>;
  /** For You = all public logs, newest first. */
  feedForYou(): Promise<Log[]>;
  /** Following = public logs from people you follow, newest first. */
  feedFollowing(): Promise<Log[]>;
  /** Mine = all your own logs (public + private), newest first. */
  feedMine(): Promise<Log[]>;

  // --- social ---------------------------------------------------------------
  follow(userId: string): Promise<void>;
  unfollow(userId: string): Promise<void>;
  isFollowing(userId: string): Promise<boolean>;
  like(logId: string): Promise<void>;
  unlike(logId: string): Promise<void>;
  listComments(logId: string): Promise<Comment[]>;
  addComment(logId: string, body: string): Promise<Comment>;
  deleteComment(commentId: string): Promise<void>;

  // --- brew templates -------------------------------------------------------
  listTemplates(): Promise<BrewTemplate[]>;
  createTemplate(input: CreateTemplateInput): Promise<BrewTemplate>;
  deleteTemplate(id: string): Promise<void>;

  // --- discovery ------------------------------------------------------------
  /** Text search over public logs (beans, roasters, people), narrowed by filters. */
  search(query: string, filters: DiscoveryFilters): Promise<Log[]>;
  /** Distinct filter values derived from public logs (custom methods included). */
  discoveryFacets(): Promise<DiscoveryFacets>;

  // --- storage --------------------------------------------------------------
  /** Upload a local image; returns the storage path to persist on the log. */
  uploadPhoto(localUri: string): Promise<string>;
  /** Resolve a stored path to a displayable URL (null if no path / not resolvable). */
  resolvePhotoUrl(path: string | null): Promise<string | null>;
}
