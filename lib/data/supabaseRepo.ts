// Real backend implementation of the Repo contract (repo.ts), against the
// schema in supabase/migrations/0002_phase_b.sql. Only imported by
// lib/data/index.ts when Supabase env vars are present (see the demo/live
// switch there) — every query here assumes RLS is enabled and does its own
// scoping only where RLS can't (e.g. "public OR mine" reads still rely on RLS;
// this file never re-implements RLS logic, it just shapes queries around it).

import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase as supabaseClient } from '../supabase';
import { BEAN_FIELD_KEYS } from './types';
import type {
  Basis,
  BeanFieldKey,
  BeanFieldMeta,
  BrewTemplate,
  Comment,
  CreateLogInput,
  CreateTemplateInput,
  DiscoveryFacets,
  DiscoveryFilters,
  Log,
  Profile,
  ProfileStats,
  ProfileSummary,
  Session,
  SignUpInput,
  UpdateProfileInput,
  Visibility,
} from './types';
import type { Repo } from './repo';

// Module-level only: lib/data/index.ts statically imports this file so it must
// evaluate cleanly even in demo mode (no env vars). The cast is safe because
// index.ts only ever calls methods on this object when hasSupabaseEnv is true.
const supabase = supabaseClient as SupabaseClient;

const BUCKET = 'bag-scans';
const SIGNED_URL_TTL_S = 60 * 60 * 24; // 24h — re-resolved on every fetch, so a long TTL just avoids churn.

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

function uniqueSorted(values: Array<string | null>): string[] {
  const set = new Set(values.filter((v): v is string => Boolean(v)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

async function requireUserId(): Promise<string> {
  const uid = await getCurrentUserId();
  if (!uid) throw new Error('Not signed in');
  return uid;
}

/** Batch-resolve storage paths to signed URLs. Missing/failed paths map to null. */
async function resolveManyPhotoUrls(paths: Array<string | null>): Promise<Map<string, string | null>> {
  const unique = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  const map = new Map<string, string | null>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, SIGNED_URL_TTL_S);
  if (error || !data) {
    unique.forEach((p) => map.set(p, null));
    return map;
  }
  data.forEach((entry) => {
    if (entry.path) map.set(entry.path, entry.signedUrl ?? null);
  });
  return map;
}

function serializeBeanBasis(
  beanBasis: Partial<Record<BeanFieldKey, BeanFieldMeta>>
): Record<string, { source_text: string | null; basis: string }> {
  const out: Record<string, { source_text: string | null; basis: string }> = {};
  for (const key of BEAN_FIELD_KEYS) {
    const meta = beanBasis[key];
    if (meta) out[key] = { source_text: meta.sourceText, basis: meta.basis };
  }
  return out;
}

function deserializeBeanBasis(
  raw: Record<string, { source_text: string | null; basis: string }> | null
): Partial<Record<BeanFieldKey, BeanFieldMeta>> {
  const out: Partial<Record<BeanFieldKey, BeanFieldMeta>> = {};
  if (!raw) return out;
  for (const key of BEAN_FIELD_KEYS) {
    const entry = raw[key];
    if (entry) out[key] = { sourceText: entry.source_text, basis: entry.basis as Basis };
  }
  return out;
}

function extFromUri(uri: string): string {
  const clean = uri.split('?')[0];
  const dot = clean.lastIndexOf('.');
  return dot === -1 ? 'jpg' : clean.slice(dot + 1).toLowerCase();
}

function contentTypeFor(ext: string): string {
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'webp') return 'image/webp';
  return 'application/octet-stream';
}

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_path: string | null;
  created_at: string;
};

async function mapProfileRow(row: ProfileRow): Promise<Profile> {
  const urlMap = await resolveManyPhotoUrls([row.avatar_path]);
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    avatarPath: row.avatar_path,
    avatarUrl: row.avatar_path ? urlMap.get(row.avatar_path) ?? null : null,
    createdAt: row.created_at,
  };
}

function toProfileSummary(
  row: { id: string; username: string; display_name: string | null; avatar_path: string | null } | null,
  fallbackUserId: string,
  urlMap: Map<string, string | null>
): ProfileSummary {
  if (!row) return { id: fallbackUserId, username: 'unknown', displayName: null, avatarUrl: null };
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_path ? urlMap.get(row.avatar_path) ?? null : null,
  };
}

async function buildSession(userId: string): Promise<Session> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Signed-in user has no profile row yet.');
  const profile = await mapProfileRow(data as ProfileRow);
  return { userId: profile.id, username: profile.username, profile };
}

// ---------------------------------------------------------------------------
// logs
// ---------------------------------------------------------------------------

const AUTHOR_EMBED = 'profiles ( id, username, display_name, avatar_path )';
const LOG_SELECT = `
  id, user_id, visibility,
  roaster, coffee_name, origin_country, origin_region, process, variety, roast_level, altitude, roast_date,
  roaster_tasting_notes, weight, decaf, bean_basis, photo_path,
  method, dose_g, yield_g, grind, water_temp_c, brew_time_s,
  strength, acidity, sweetness, bitterness, overall, notes, created_at,
  ${AUTHOR_EMBED},
  likes ( count ),
  comments ( count )
`;

type AuthorRow = { id: string; username: string; display_name: string | null; avatar_path: string | null };

type LogRow = {
  id: string;
  user_id: string;
  visibility: string;
  roaster: string | null;
  coffee_name: string | null;
  origin_country: string | null;
  origin_region: string | null;
  process: string | null;
  variety: string | null;
  roast_level: string | null;
  altitude: string | null;
  roast_date: string | null;
  roaster_tasting_notes: string[] | null;
  weight: string | null;
  decaf: boolean | null;
  bean_basis: Record<string, { source_text: string | null; basis: string }> | null;
  photo_path: string | null;
  method: string | null;
  dose_g: number | null;
  yield_g: number | null;
  grind: string | null;
  water_temp_c: number | null;
  brew_time_s: number | null;
  strength: number | null;
  acidity: number | null;
  sweetness: number | null;
  bitterness: number | null;
  overall: number | null;
  notes: string | null;
  created_at: string;
  profiles: AuthorRow | null;
  likes: { count: number }[] | null;
  comments: { count: number }[] | null;
};

function countFrom(agg: { count: number }[] | null | undefined): number {
  return agg?.[0]?.count ?? 0;
}

function mapLogRow(row: LogRow, urlMap: Map<string, string | null>, likedByMe: boolean): Log {
  return {
    id: row.id,
    userId: row.user_id,
    author: toProfileSummary(row.profiles, row.user_id, urlMap),
    visibility: row.visibility as Visibility,
    roaster: row.roaster,
    coffeeName: row.coffee_name,
    originCountry: row.origin_country,
    originRegion: row.origin_region,
    process: row.process,
    variety: row.variety,
    roastLevel: row.roast_level,
    altitude: row.altitude,
    roastDate: row.roast_date,
    roasterTastingNotes: row.roaster_tasting_notes ?? [],
    weight: row.weight,
    decaf: row.decaf,
    beanBasis: deserializeBeanBasis(row.bean_basis),
    photoPath: row.photo_path,
    photoUrl: row.photo_path ? urlMap.get(row.photo_path) ?? null : null,
    method: row.method,
    doseG: row.dose_g,
    yieldG: row.yield_g,
    grind: row.grind,
    waterTempC: row.water_temp_c,
    brewTimeS: row.brew_time_s,
    ratings: {
      strength: row.strength,
      acidity: row.acidity,
      sweetness: row.sweetness,
      bitterness: row.bitterness,
      overall: row.overall,
    },
    notes: row.notes,
    createdAt: row.created_at,
    likeCount: countFrom(row.likes),
    commentCount: countFrom(row.comments),
    likedByMe,
  };
}

async function hydrateLogs(rows: LogRow[]): Promise<Log[]> {
  if (rows.length === 0) return [];

  const uid = await getCurrentUserId();
  let likedSet = new Set<string>();
  if (uid) {
    const ids = rows.map((r) => r.id);
    const { data } = await supabase.from('likes').select('log_id').eq('user_id', uid).in('log_id', ids);
    likedSet = new Set((data ?? []).map((d: { log_id: string }) => d.log_id));
  }

  const paths = rows.flatMap((r) => [r.photo_path, r.profiles?.avatar_path ?? null]);
  const urlMap = await resolveManyPhotoUrls(paths);

  return rows.map((row) => mapLogRow(row, urlMap, likedSet.has(row.id)));
}

// ---------------------------------------------------------------------------
// comments
// ---------------------------------------------------------------------------

const COMMENT_SELECT = `id, log_id, body, created_at, ${AUTHOR_EMBED}`;

type CommentRow = {
  id: string;
  log_id: string;
  body: string;
  created_at: string;
  profiles: AuthorRow | null;
};

async function hydrateComments(rows: CommentRow[]): Promise<Comment[]> {
  if (rows.length === 0) return [];
  const urlMap = await resolveManyPhotoUrls(rows.map((r) => r.profiles?.avatar_path ?? null));
  return rows.map((row) => ({
    id: row.id,
    logId: row.log_id,
    author: toProfileSummary(row.profiles, '', urlMap),
    body: row.body,
    createdAt: row.created_at,
  }));
}

// ---------------------------------------------------------------------------
// brew templates
// ---------------------------------------------------------------------------

type TemplateRow = {
  id: string;
  user_id: string;
  name: string;
  method: string;
  dose_g: number | null;
  yield_g: number | null;
  grind: string | null;
  water_temp_c: number | null;
  brew_time_s: number | null;
  created_at: string;
};

function mapTemplateRow(row: TemplateRow): BrewTemplate {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    method: row.method,
    doseG: row.dose_g,
    yieldG: row.yield_g,
    grind: row.grind,
    waterTempC: row.water_temp_c,
    brewTimeS: row.brew_time_s,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// the repo
// ---------------------------------------------------------------------------

export const supabaseRepo: Repo = {
  // --- auth -----------------------------------------------------------------

  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    return buildSession(user.id);
  },

  onAuthChange(cb: (session: Session | null) => void): () => void {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, authSession) => {
      const user = authSession?.user;
      if (!user) {
        if (!cancelled) cb(null);
        return;
      }
      buildSession(user.id)
        .then((session) => {
          if (!cancelled) cb(session);
        })
        .catch(() => {
          if (!cancelled) cb(null);
        });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  },

  async signIn(identifier: string, password: string): Promise<Session> {
    const trimmed = identifier.trim();

    if (trimmed.includes('@')) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
      if (error) throw error;
      if (!data.session) throw new Error('Sign in did not return a session.');
      return buildSession(data.session.user.id);
    }

    // Username: resolve to email + sign in server-side, so the email is
    // never exposed to this client. See supabase/functions/login-with-username.
    const { data, error } = await supabase.functions.invoke<{
      session?: { access_token: string; refresh_token: string };
      error?: string;
    }>('login-with-username', { body: { identifier: trimmed, password } });
    if (error || !data?.session) throw new Error('Invalid login credentials');

    const { error: setError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (setError) throw setError;

    const uid = await requireUserId();
    return buildSession(uid);
  },

  async signUp(input: SignUpInput): Promise<Session> {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { username: input.username, display_name: input.displayName ?? null } },
    });
    if (error) throw error;
    if (!data.session || !data.user) {
      throw new Error('Sign-up succeeded but no session was returned — check if email confirmation is required.');
    }
    return buildSession(data.user.id);
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // --- profiles ---------------------------------------------------------------

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data ? mapProfileRow(data as ProfileRow) : null;
  },

  async getProfileByUsername(username: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
    if (error) throw error;
    return data ? mapProfileRow(data as ProfileRow) : null;
  },

  async getProfileStats(userId: string): Promise<ProfileStats> {
    const uid = await getCurrentUserId();
    const isSelf = uid === userId;

    let logQuery = supabase.from('logs').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    if (!isSelf) logQuery = logQuery.eq('visibility', 'public');

    const [logRes, followerRes, followingRes] = await Promise.all([
      logQuery,
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', userId),
      supabase.from('follows').select('followee_id', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);

    return {
      logCount: logRes.count ?? 0,
      followerCount: followerRes.count ?? 0,
      followingCount: followingRes.count ?? 0,
    };
  },

  async updateProfile(input: UpdateProfileInput): Promise<Profile> {
    const uid = await requireUserId();
    const patch: Record<string, unknown> = {};
    if (input.displayName !== undefined) patch.display_name = input.displayName;
    if (input.bio !== undefined) patch.bio = input.bio;
    if (input.avatarPath !== undefined) patch.avatar_path = input.avatarPath;

    const { data, error } = await supabase.from('profiles').update(patch).eq('id', uid).select('*').single();
    if (error) throw error;
    return mapProfileRow(data as ProfileRow);
  },

  // --- logs -------------------------------------------------------------------

  async createLog(input: CreateLogInput): Promise<Log> {
    const uid = await requireUserId();
    const bean = input.bean;

    const beanBasis: Partial<Record<BeanFieldKey, BeanFieldMeta>> = {};
    for (const key of BEAN_FIELD_KEYS) {
      const f = bean[key];
      beanBasis[key] = { sourceText: f.sourceText, basis: f.basis };
    }

    const roasterTastingNotes = bean.roaster_tasting_notes.value
      ? bean.roaster_tasting_notes.value.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const decafValue = bean.decaf.value;
    const decaf = decafValue === 'Decaf' ? true : decafValue === 'Caffeinated' ? false : null;

    let photoPath: string | null = null;
    if (input.photoLocalUri) {
      photoPath = await uploadPhotoInternal(uid, input.photoLocalUri);
    }

    const insertRow = {
      user_id: uid,
      visibility: input.visibility,
      roaster: bean.roaster.value,
      coffee_name: bean.coffee_name.value,
      origin_country: bean.origin_country.value,
      origin_region: bean.origin_region.value,
      process: bean.process.value,
      variety: bean.variety.value,
      roast_level: bean.roast_level.value,
      altitude: bean.altitude.value,
      roast_date: bean.roast_date.value,
      roaster_tasting_notes: roasterTastingNotes,
      weight: bean.weight.value,
      decaf,
      bean_basis: serializeBeanBasis(beanBasis),
      photo_path: photoPath,
      method: input.method,
      dose_g: input.doseG,
      yield_g: input.yieldG,
      grind: input.grind,
      water_temp_c: input.waterTempC,
      brew_time_s: input.brewTimeS,
      strength: input.ratings.strength,
      acidity: input.ratings.acidity,
      sweetness: input.ratings.sweetness,
      bitterness: input.ratings.bitterness,
      overall: input.ratings.overall,
      notes: input.notes,
    };

    const { data, error } = await supabase.from('logs').insert(insertRow).select(LOG_SELECT).single();
    if (error) throw error;
    const [log] = await hydrateLogs([data as unknown as LogRow]);
    return log;
  },

  async getLog(id: string): Promise<Log | null> {
    const { data, error } = await supabase.from('logs').select(LOG_SELECT).eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const [log] = await hydrateLogs([data as unknown as LogRow]);
    return log;
  },

  async logsByUser(userId: string): Promise<Log[]> {
    // RLS already scopes private rows to their owner, regardless of caller intent.
    const { data, error } = await supabase
      .from('logs')
      .select(LOG_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return hydrateLogs((data ?? []) as unknown as LogRow[]);
  },

  async feedForYou(): Promise<Log[]> {
    const { data, error } = await supabase
      .from('logs')
      .select(LOG_SELECT)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return hydrateLogs((data ?? []) as unknown as LogRow[]);
  },

  async feedFollowing(): Promise<Log[]> {
    const uid = await getCurrentUserId();
    if (!uid) return [];
    const { data: followData, error: followError } = await supabase
      .from('follows')
      .select('followee_id')
      .eq('follower_id', uid);
    if (followError) throw followError;
    const followeeIds = (followData ?? []).map((f: { followee_id: string }) => f.followee_id);
    if (followeeIds.length === 0) return [];

    const { data, error } = await supabase
      .from('logs')
      .select(LOG_SELECT)
      .eq('visibility', 'public')
      .in('user_id', followeeIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return hydrateLogs((data ?? []) as unknown as LogRow[]);
  },

  async feedMine(): Promise<Log[]> {
    const uid = await getCurrentUserId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from('logs')
      .select(LOG_SELECT)
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return hydrateLogs((data ?? []) as unknown as LogRow[]);
  },

  // --- social -------------------------------------------------------------------

  async follow(userId: string): Promise<void> {
    const uid = await requireUserId();
    if (uid === userId) return;
    const { error } = await supabase.from('follows').insert({ follower_id: uid, followee_id: userId });
    if (error && error.code !== '23505') throw error;
  },

  async unfollow(userId: string): Promise<void> {
    const uid = await requireUserId();
    const { error } = await supabase.from('follows').delete().eq('follower_id', uid).eq('followee_id', userId);
    if (error) throw error;
  },

  async isFollowing(userId: string): Promise<boolean> {
    const uid = await getCurrentUserId();
    if (!uid) return false;
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', uid)
      .eq('followee_id', userId)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  },

  async like(logId: string): Promise<void> {
    const uid = await requireUserId();
    const { error } = await supabase.from('likes').insert({ user_id: uid, log_id: logId });
    if (error && error.code !== '23505') throw error;
  },

  async unlike(logId: string): Promise<void> {
    const uid = await requireUserId();
    const { error } = await supabase.from('likes').delete().eq('user_id', uid).eq('log_id', logId);
    if (error) throw error;
  },

  async listComments(logId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(COMMENT_SELECT)
      .eq('log_id', logId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return hydrateComments((data ?? []) as unknown as CommentRow[]);
  },

  async addComment(logId: string, body: string): Promise<Comment> {
    const uid = await requireUserId();
    const { data, error } = await supabase
      .from('comments')
      .insert({ log_id: logId, user_id: uid, body })
      .select(COMMENT_SELECT)
      .single();
    if (error) throw error;
    const [comment] = await hydrateComments([data as unknown as CommentRow]);
    return comment;
  },

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) throw error;
  },

  // --- brew templates -------------------------------------------------------------

  async listTemplates(): Promise<BrewTemplate[]> {
    const uid = await getCurrentUserId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from('brew_templates')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row: TemplateRow) => mapTemplateRow(row));
  },

  async createTemplate(input: CreateTemplateInput): Promise<BrewTemplate> {
    const uid = await requireUserId();
    const { data, error } = await supabase
      .from('brew_templates')
      .insert({
        user_id: uid,
        name: input.name,
        method: input.method,
        dose_g: input.doseG,
        yield_g: input.yieldG,
        grind: input.grind,
        water_temp_c: input.waterTempC,
        brew_time_s: input.brewTimeS,
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapTemplateRow(data as TemplateRow);
  },

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase.from('brew_templates').delete().eq('id', id);
    if (error) throw error;
  },

  // --- discovery ------------------------------------------------------------

  async search(query: string, filters: DiscoveryFilters): Promise<Log[]> {
    let q = supabase.from('logs').select(LOG_SELECT).eq('visibility', 'public');
    if (filters.origin) q = q.eq('origin_country', filters.origin);
    if (filters.roaster) q = q.eq('roaster', filters.roaster);
    if (filters.method) q = q.eq('method', filters.method);
    q = q.order('created_at', { ascending: false });

    const { data, error } = await q;
    if (error) throw error;
    const logs = await hydrateLogs((data ?? []) as unknown as LogRow[]);

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return logs;
    return logs.filter((l) => {
      const haystack = [l.roaster, l.coffeeName, l.originCountry, l.author.username]
        .filter((v): v is string => Boolean(v))
        .map((v) => v.toLowerCase());
      return haystack.some((v) => v.includes(trimmed));
    });
  },

  async discoveryFacets(): Promise<DiscoveryFacets> {
    const { data, error } = await supabase
      .from('logs')
      .select('origin_country, roaster, method')
      .eq('visibility', 'public');
    if (error) throw error;
    const rows = (data ?? []) as Array<{ origin_country: string | null; roaster: string | null; method: string | null }>;
    return {
      origins: uniqueSorted(rows.map((r) => r.origin_country)),
      roasters: uniqueSorted(rows.map((r) => r.roaster)),
      methods: uniqueSorted(rows.map((r) => r.method)),
    };
  },

  // --- storage --------------------------------------------------------------

  async uploadPhoto(localUri: string): Promise<string> {
    const uid = await requireUserId();
    return uploadPhotoInternal(uid, localUri);
  },

  async resolvePhotoUrl(path: string | null): Promise<string | null> {
    if (!path) return null;
    const urlMap = await resolveManyPhotoUrls([path]);
    return urlMap.get(path) ?? null;
  },
};

async function uploadPhotoInternal(uid: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const ext = extFromUri(localUri);
  const path = `${uid}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: contentTypeFor(ext),
    upsert: false,
  });
  if (error) throw error;
  return path;
}
