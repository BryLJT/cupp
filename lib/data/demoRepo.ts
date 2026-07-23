// In-memory demo repository. Implements the full Repo contract (repo.ts) with
// zero network calls so the app works with no env vars. Boots "signed in" as a
// fixture demo user (elliot.brews) so the app lands straight in a populated feed.
//
// Everything here is mutable module state — this file IS the "database" for
// demo mode. State resets whenever the JS process restarts (that's fine; it's
// a demo).

import { BEAN_FIELD_KEYS } from './types';
import type {
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
} from './types';
import type { Repo } from './repo';

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

function toSummary(profile: Profile): ProfileSummary {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
  };
}

function byNewest(a: Log, b: Log): number {
  return b.createdAt.localeCompare(a.createdAt);
}

function uniqueSorted(values: Array<string | null>): string[] {
  const set = new Set(values.filter((v): v is string => Boolean(v)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

const NOT_VISIBLE: BeanFieldMeta = { basis: 'not_visible', sourceText: null };
function read(sourceText: string): BeanFieldMeta {
  return { basis: 'read', sourceText };
}
function inferred(sourceText: string): BeanFieldMeta {
  return { basis: 'inferred', sourceText };
}
function manual(): BeanFieldMeta {
  return { basis: 'manual', sourceText: null };
}

// ---------------------------------------------------------------------------
// fixture profiles
// ---------------------------------------------------------------------------

const DEMO_USER_ID = 'u-elliot';

const elliotProfile: Profile = {
  id: DEMO_USER_ID,
  username: 'elliot.brews',
  displayName: 'Elliot N.',
  bio: 'Brewing since 2024 · V60 loyalist',
  avatarPath: null,
  avatarUrl: null,
  createdAt: '2024-01-15T09:00:00.000Z',
};

const bryanProfile: Profile = {
  id: 'u-bryan',
  username: 'bryan.pours',
  displayName: 'Bryan T.',
  bio: 'Chasing the perfect espresso shot.',
  avatarPath: null,
  avatarUrl: null,
  createdAt: '2024-01-20T10:00:00.000Z',
};

const mikaProfile: Profile = {
  id: 'u-mika',
  username: 'mika.filter',
  displayName: 'Mika S.',
  bio: 'Light roasts only. Kalita fan.',
  avatarPath: null,
  avatarUrl: null,
  createdAt: '2024-02-01T11:00:00.000Z',
};

const tomasProfile: Profile = {
  id: 'u-tomas',
  username: 'tomas.roasts',
  displayName: 'Tomás R.',
  bio: 'Home roaster. Ethiopia forever.',
  avatarPath: null,
  avatarUrl: null,
  createdAt: '2024-02-10T12:00:00.000Z',
};

const users: Profile[] = [elliotProfile, bryanProfile, mikaProfile, tomasProfile];

// ---------------------------------------------------------------------------
// fixture logs
// ---------------------------------------------------------------------------

const log1Huila: Log = {
  id: 'log-1',
  userId: elliotProfile.id,
  author: toSummary(elliotProfile),
  visibility: 'public',
  roaster: 'SEY',
  coffeeName: 'Huila',
  originCountry: 'Colombia',
  originRegion: 'Huila',
  process: 'Washed',
  variety: null,
  roastLevel: null,
  altitude: null,
  roastDate: null,
  roasterTastingNotes: [],
  weight: null,
  decaf: true,
  beanBasis: {
    roaster: read('SEY'),
    coffee_name: read('Huila'),
    origin_country: read('Colombia'),
    origin_region: read('Huila'),
    process: read('Washed'),
    decaf: read('DECAF'),
    variety: NOT_VISIBLE,
    roast_level: NOT_VISIBLE,
    altitude: NOT_VISIBLE,
    roast_date: NOT_VISIBLE,
    roaster_tasting_notes: NOT_VISIBLE,
    weight: NOT_VISIBLE,
  },
  photoPath: null,
  photoUrl: null,
  method: 'V60',
  doseG: 15,
  yieldG: 250,
  grind: 'medium-fine',
  waterTempC: 94,
  brewTimeS: 165,
  ratings: { strength: 3, acidity: 4, sweetness: 4, bitterness: 1, overall: 4 },
  notes: 'Clean, gentle, no decaf funk.',
  createdAt: '2024-08-16T08:30:00.000Z',
  likeCount: 5,
  commentCount: 1,
  likedByMe: false,
};

const log2Worka: Log = {
  id: 'log-2',
  userId: bryanProfile.id,
  author: toSummary(bryanProfile),
  visibility: 'public',
  roaster: 'Onyx',
  coffeeName: 'Worka',
  originCountry: 'Ethiopia',
  originRegion: 'Guji',
  process: 'Washed',
  variety: 'Heirloom',
  roastLevel: 'Light',
  altitude: null,
  roastDate: null,
  roasterTastingNotes: ['blueberry', 'cocoa'],
  weight: null,
  decaf: false,
  beanBasis: {
    roaster: read('ONYX COFFEE LAB'),
    coffee_name: inferred('Worka'),
    origin_country: inferred('Ethiopia'),
    origin_region: inferred('Guji'),
    process: inferred('Washed'),
    variety: inferred('Heirloom'),
    roast_level: inferred('Light'),
    roaster_tasting_notes: inferred('Blueberry, Cocoa'),
    altitude: NOT_VISIBLE,
    roast_date: NOT_VISIBLE,
    weight: NOT_VISIBLE,
    decaf: NOT_VISIBLE,
  },
  photoPath: null,
  photoUrl: null,
  method: 'Espresso',
  doseG: 18,
  yieldG: 40,
  grind: 'fine',
  waterTempC: 93,
  brewTimeS: 28,
  ratings: { strength: 4, acidity: 3, sweetness: 4, bitterness: 2, overall: 5 },
  notes: 'Blueberry jam. Believe the hype.',
  createdAt: '2024-08-14T07:15:00.000Z',
  likeCount: 12,
  commentCount: 2,
  likedByMe: true,
};

const log3Kamwangi: Log = {
  id: 'log-3',
  userId: mikaProfile.id,
  author: toSummary(mikaProfile),
  visibility: 'public',
  roaster: 'April',
  coffeeName: 'Kamwangi',
  originCountry: 'Kenya',
  originRegion: 'Nyeri',
  process: 'Washed',
  variety: 'SL28',
  roastLevel: 'Light-Medium',
  altitude: null,
  roastDate: null,
  roasterTastingNotes: ['blackcurrant', 'tomato', 'brown sugar'],
  weight: null,
  decaf: false,
  beanBasis: {
    roaster: read('APRIL COFFEE ROASTERS'),
    coffee_name: inferred('Kamwangi'),
    origin_country: inferred('Kenya'),
    origin_region: inferred('Nyeri'),
    process: inferred('Washed'),
    variety: inferred('SL28'),
    roast_level: inferred('Light-Medium'),
    roaster_tasting_notes: inferred('Blackcurrant, Tomato, Brown Sugar'),
    altitude: NOT_VISIBLE,
    roast_date: NOT_VISIBLE,
    weight: NOT_VISIBLE,
    decaf: NOT_VISIBLE,
  },
  photoPath: null,
  photoUrl: null,
  method: 'Kalita Wave',
  doseG: 20,
  yieldG: 300,
  grind: 'medium',
  waterTempC: 92,
  brewTimeS: 210,
  ratings: { strength: 3, acidity: 5, sweetness: 3, bitterness: 2, overall: 4 },
  notes: 'Juicy, almost tomato-soup savory. Wild SL28 funk.',
  createdAt: '2024-08-10T09:00:00.000Z',
  likeCount: 8,
  commentCount: 0,
  likedByMe: false,
};

const log4Yirgacheffe: Log = {
  id: 'log-4',
  userId: tomasProfile.id,
  author: toSummary(tomasProfile),
  visibility: 'public',
  roaster: 'Tomás Home Roast',
  coffeeName: 'Yirgacheffe Natural',
  originCountry: 'Ethiopia',
  originRegion: 'Yirgacheffe',
  process: 'Natural',
  variety: 'Heirloom',
  roastLevel: 'Medium',
  altitude: null,
  roastDate: null,
  roasterTastingNotes: ['strawberry', 'red wine'],
  weight: null,
  decaf: false,
  beanBasis: {
    // Home roast, hand-labeled bag — no printed label to scan, so these are
    // Tomás's own manual entries rather than "read"/"inferred" from a bag.
    roaster: manual(),
    coffee_name: manual(),
    origin_country: manual(),
    origin_region: manual(),
    process: manual(),
    variety: manual(),
    roast_level: manual(),
    roaster_tasting_notes: manual(),
    altitude: NOT_VISIBLE,
    roast_date: NOT_VISIBLE,
    weight: NOT_VISIBLE,
    decaf: NOT_VISIBLE,
  },
  photoPath: null,
  photoUrl: null,
  method: 'Turkish cezve',
  doseG: 10,
  yieldG: 80,
  grind: 'extra-fine',
  waterTempC: 95,
  brewTimeS: 240,
  ratings: { strength: 5, acidity: 2, sweetness: 4, bitterness: 3, overall: 4 },
  notes: 'Roasted this batch myself two days ago — still resting but syrupy already.',
  createdAt: '2024-08-07T06:45:00.000Z',
  likeCount: 4,
  commentCount: 0,
  likedByMe: false,
};

const log5ElInjerto: Log = {
  id: 'log-5',
  userId: elliotProfile.id,
  author: toSummary(elliotProfile),
  visibility: 'private',
  roaster: 'Tim Wendelboe',
  coffeeName: 'El Injerto',
  originCountry: 'Guatemala',
  originRegion: 'Huehuetenango',
  process: 'Washed',
  variety: 'Bourbon',
  roastLevel: 'Light',
  altitude: null,
  roastDate: null,
  roasterTastingNotes: ['caramel', 'apple'],
  weight: null,
  decaf: false,
  beanBasis: {
    roaster: read('TIM WENDELBOE'),
    coffee_name: inferred('El Injerto'),
    origin_country: inferred('Guatemala'),
    origin_region: inferred('Huehuetenango'),
    process: inferred('Washed'),
    variety: inferred('Bourbon'),
    roast_level: inferred('Light'),
    roaster_tasting_notes: inferred('Caramel, Apple'),
    altitude: NOT_VISIBLE,
    roast_date: NOT_VISIBLE,
    weight: NOT_VISIBLE,
    decaf: NOT_VISIBLE,
  },
  photoPath: null,
  photoUrl: null,
  method: 'Aeropress',
  doseG: 16,
  yieldG: 220,
  grind: 'medium-fine',
  waterTempC: 90,
  brewTimeS: 120,
  ratings: { strength: 3, acidity: 3, sweetness: 4, bitterness: 2, overall: 3 },
  notes: 'Solid but unremarkable — comparing against the Huila.',
  createdAt: '2024-08-05T18:20:00.000Z',
  likeCount: 0,
  commentCount: 0,
  likedByMe: false,
};

const log6Daterra: Log = {
  id: 'log-6',
  userId: bryanProfile.id,
  author: toSummary(bryanProfile),
  visibility: 'public',
  roaster: 'Sey',
  coffeeName: 'Daterra',
  originCountry: 'Brazil',
  originRegion: 'Cerrado',
  process: 'Natural',
  variety: 'Yellow Bourbon',
  roastLevel: 'Medium',
  altitude: null,
  roastDate: null,
  roasterTastingNotes: ['hazelnut', 'milk chocolate', 'caramel'],
  weight: null,
  decaf: false,
  beanBasis: {
    roaster: read('SEY'),
    coffee_name: inferred('Daterra'),
    origin_country: inferred('Brazil'),
    origin_region: inferred('Cerrado'),
    process: inferred('Natural'),
    variety: inferred('Yellow Bourbon'),
    roast_level: inferred('Medium'),
    roaster_tasting_notes: inferred('Hazelnut, Milk Chocolate, Caramel'),
    altitude: NOT_VISIBLE,
    roast_date: NOT_VISIBLE,
    weight: NOT_VISIBLE,
    decaf: NOT_VISIBLE,
  },
  photoPath: null,
  photoUrl: null,
  method: 'V60',
  doseG: 15,
  yieldG: 240,
  grind: 'medium',
  waterTempC: 93,
  brewTimeS: 180,
  ratings: { strength: 3, acidity: 2, sweetness: 5, bitterness: 1, overall: 4 },
  notes: 'Dessert in a cup. Hazelnut praline all day.',
  createdAt: '2024-08-02T08:00:00.000Z',
  likeCount: 9,
  commentCount: 0,
  likedByMe: true,
};

const log7Gedeb: Log = {
  id: 'log-7',
  userId: mikaProfile.id,
  author: toSummary(mikaProfile),
  visibility: 'public',
  roaster: 'Onyx',
  coffeeName: 'Gedeb',
  originCountry: 'Ethiopia',
  originRegion: 'Gedeb',
  process: 'Washed',
  variety: 'Heirloom',
  roastLevel: 'Light',
  altitude: null,
  roastDate: null,
  roasterTastingNotes: ['jasmine', 'lemon', 'honey'],
  weight: null,
  decaf: false,
  beanBasis: {
    roaster: read('ONYX COFFEE LAB'),
    coffee_name: inferred('Gedeb'),
    origin_country: inferred('Ethiopia'),
    origin_region: inferred('Gedeb'),
    process: inferred('Washed'),
    variety: inferred('Heirloom'),
    roast_level: inferred('Light'),
    roaster_tasting_notes: inferred('Jasmine, Lemon, Honey'),
    altitude: NOT_VISIBLE,
    roast_date: NOT_VISIBLE,
    weight: NOT_VISIBLE,
    decaf: NOT_VISIBLE,
  },
  photoPath: null,
  photoUrl: null,
  method: 'Kalita Wave',
  doseG: 20,
  yieldG: 310,
  grind: 'medium',
  waterTempC: 92,
  brewTimeS: 200,
  ratings: { strength: 2, acidity: 5, sweetness: 3, bitterness: 1, overall: 4 },
  notes: 'Floral and delicate. Jasmine tea vibes.',
  createdAt: '2024-07-29T07:30:00.000Z',
  likeCount: 6,
  commentCount: 0,
  likedByMe: false,
};

const log8ElPuente: Log = {
  id: 'log-8',
  userId: tomasProfile.id,
  author: toSummary(tomasProfile),
  visibility: 'public',
  roaster: 'April',
  coffeeName: 'Finca El Puente',
  originCountry: 'Guatemala',
  originRegion: 'Huehuetenango',
  process: 'Washed',
  variety: 'Caturra',
  roastLevel: 'Medium-Light',
  altitude: null,
  roastDate: null,
  roasterTastingNotes: ['plum', 'almond'],
  weight: null,
  decaf: false,
  beanBasis: {
    roaster: read('APRIL COFFEE ROASTERS'),
    coffee_name: inferred('Finca El Puente'),
    origin_country: inferred('Guatemala'),
    origin_region: inferred('Huehuetenango'),
    process: inferred('Washed'),
    variety: inferred('Caturra'),
    roast_level: inferred('Medium-Light'),
    roaster_tasting_notes: inferred('Plum, Almond'),
    altitude: NOT_VISIBLE,
    roast_date: NOT_VISIBLE,
    weight: NOT_VISIBLE,
    decaf: NOT_VISIBLE,
  },
  photoPath: null,
  photoUrl: null,
  method: 'Espresso',
  doseG: 18,
  yieldG: 36,
  grind: 'fine',
  waterTempC: 94,
  brewTimeS: 30,
  ratings: { strength: 4, acidity: 3, sweetness: 3, bitterness: 3, overall: 3 },
  notes: 'Nice as espresso but I preferred it as filter last time.',
  createdAt: '2024-07-25T06:00:00.000Z',
  likeCount: 3,
  commentCount: 0,
  likedByMe: false,
};

// Newest first.
const logs: Log[] = [
  log1Huila,
  log2Worka,
  log3Kamwangi,
  log4Yirgacheffe,
  log5ElInjerto,
  log6Daterra,
  log7Gedeb,
  log8ElPuente,
];

// ---------------------------------------------------------------------------
// fixture comments
// ---------------------------------------------------------------------------

let comments: Comment[] = [
  {
    id: 'c-1',
    logId: log2Worka.id,
    author: toSummary(elliotProfile),
    body: 'what grinder setting?',
    createdAt: '2024-08-14T09:00:00.000Z',
  },
  {
    id: 'c-2',
    logId: log2Worka.id,
    author: toSummary(mikaProfile),
    body: 'Been eyeing this one — adding to cart.',
    createdAt: '2024-08-14T12:00:00.000Z',
  },
  {
    id: 'c-3',
    logId: log1Huila.id,
    author: toSummary(bryanProfile),
    body: "How's the decaf process taste-wise? Usually get a flat cup from decaf.",
    createdAt: '2024-08-16T10:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// fixture follows
// ---------------------------------------------------------------------------

interface FollowEdge {
  followerId: string;
  followeeId: string;
}

let follows: FollowEdge[] = [
  { followerId: elliotProfile.id, followeeId: bryanProfile.id },
  { followerId: elliotProfile.id, followeeId: mikaProfile.id },
];

// ---------------------------------------------------------------------------
// fixture templates
// ---------------------------------------------------------------------------

let templates: BrewTemplate[] = [
  {
    id: 't-1',
    userId: elliotProfile.id,
    name: 'My morning V60',
    method: 'V60',
    doseG: 15,
    yieldG: 250,
    grind: 'medium-fine',
    waterTempC: 94,
    brewTimeS: 165,
    createdAt: '2024-03-01T07:00:00.000Z',
  },
  {
    id: 't-2',
    userId: elliotProfile.id,
    name: 'Quick Aeropress',
    method: 'Aeropress',
    doseG: 16,
    yieldG: 220,
    grind: 'medium',
    waterTempC: 85,
    brewTimeS: 90,
    createdAt: '2024-04-15T07:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// auth session state
// ---------------------------------------------------------------------------

let currentSession: Session | null = {
  userId: elliotProfile.id,
  username: elliotProfile.username,
  profile: elliotProfile,
};

let authListeners: Array<(session: Session | null) => void> = [];

function notifyAuthChange(): void {
  for (const cb of authListeners) cb(currentSession);
}

// ---------------------------------------------------------------------------
// id counters (no uuid dependency)
// ---------------------------------------------------------------------------

let logSeq = 100;
function nextLogId(): string {
  return `d-${Date.now()}-${logSeq++}`;
}
let commentSeq = 100;
function nextCommentId(): string {
  return `c-${Date.now()}-${commentSeq++}`;
}
let templateSeq = 100;
function nextTemplateId(): string {
  return `t-${Date.now()}-${templateSeq++}`;
}
let userSeq = 100;
function nextUserId(): string {
  return `u-new-${userSeq++}`;
}

// ---------------------------------------------------------------------------
// storage (fake)
// ---------------------------------------------------------------------------

async function uploadPhotoInternal(_localUri: string): Promise<string> {
  return `demo/${Date.now()}.jpg`;
}

async function resolvePhotoUrlInternal(_path: string | null): Promise<string | null> {
  // Demo mode never resolves a real URL — the UI falls back to its placeholder.
  return null;
}

// ---------------------------------------------------------------------------
// the repo
// ---------------------------------------------------------------------------

export const demoRepo: Repo = {
  // --- auth -----------------------------------------------------------------

  async getSession(): Promise<Session | null> {
    return currentSession;
  },

  onAuthChange(cb: (session: Session | null) => void): () => void {
    authListeners.push(cb);
    // Mirrors supabase's onAuthStateChange, which fires an initial event too.
    cb(currentSession);
    return () => {
      authListeners = authListeners.filter((fn) => fn !== cb);
    };
  },

  async signIn(_identifier: string, _password: string): Promise<Session> {
    // Demo mode: any credentials sign you in as the demo user.
    const session: Session = {
      userId: elliotProfile.id,
      username: elliotProfile.username,
      profile: elliotProfile,
    };
    currentSession = session;
    notifyAuthChange();
    return session;
  },

  async signUp(input: SignUpInput): Promise<Session> {
    const profile: Profile = {
      id: nextUserId(),
      username: input.username,
      displayName: input.displayName ?? null,
      bio: null,
      avatarPath: null,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    };
    users.push(profile);
    const session: Session = {
      userId: profile.id,
      username: profile.username,
      profile,
    };
    currentSession = session;
    notifyAuthChange();
    return session;
  },

  async signOut(): Promise<void> {
    currentSession = null;
    notifyAuthChange();
  },

  // --- profiles ---------------------------------------------------------------

  async getProfile(userId: string): Promise<Profile | null> {
    return users.find((u) => u.id === userId) ?? null;
  },

  async getProfileByUsername(username: string): Promise<Profile | null> {
    return users.find((u) => u.username === username) ?? null;
  },

  async getProfileStats(userId: string): Promise<ProfileStats> {
    const isSelf = currentSession?.userId === userId;
    const logCount = logs.filter(
      (l) => l.userId === userId && (isSelf || l.visibility === 'public')
    ).length;
    const followerCount = follows.filter((f) => f.followeeId === userId).length;
    const followingCount = follows.filter((f) => f.followerId === userId).length;
    return { logCount, followerCount, followingCount };
  },

  async updateProfile(input: UpdateProfileInput): Promise<Profile> {
    if (!currentSession) throw new Error('Not signed in');
    const profile = users.find((u) => u.id === currentSession!.userId);
    if (!profile) throw new Error('Current user not found');
    if (input.displayName !== undefined) profile.displayName = input.displayName;
    if (input.bio !== undefined) profile.bio = input.bio;
    if (input.avatarPath !== undefined) profile.avatarPath = input.avatarPath;
    return profile;
  },

  // --- logs -------------------------------------------------------------------

  async createLog(input: CreateLogInput): Promise<Log> {
    if (!currentSession) throw new Error('Not signed in');
    const bean = input.bean;

    const beanBasis: Partial<Record<BeanFieldKey, BeanFieldMeta>> = {};
    for (const key of BEAN_FIELD_KEYS) {
      const field = bean[key];
      beanBasis[key] = { sourceText: field.sourceText, basis: field.basis };
    }

    const roasterTastingNotes = bean.roaster_tasting_notes.value
      ? bean.roaster_tasting_notes.value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const decafValue = bean.decaf.value;
    const decaf = decafValue === 'Decaf' ? true : decafValue === 'Caffeinated' ? false : null;

    let photoPath: string | null = null;
    if (input.photoLocalUri) {
      photoPath = await uploadPhotoInternal(input.photoLocalUri);
    }
    const photoUrl = await resolvePhotoUrlInternal(photoPath);

    const log: Log = {
      id: nextLogId(),
      userId: currentSession.userId,
      author: toSummary(currentSession.profile),
      visibility: input.visibility,
      roaster: bean.roaster.value,
      coffeeName: bean.coffee_name.value,
      originCountry: bean.origin_country.value,
      originRegion: bean.origin_region.value,
      process: bean.process.value,
      variety: bean.variety.value,
      roastLevel: bean.roast_level.value,
      altitude: bean.altitude.value,
      roastDate: bean.roast_date.value,
      roasterTastingNotes,
      weight: bean.weight.value,
      decaf,
      beanBasis,
      photoPath,
      photoUrl,
      method: input.method,
      doseG: input.doseG,
      yieldG: input.yieldG,
      grind: input.grind,
      waterTempC: input.waterTempC,
      brewTimeS: input.brewTimeS,
      ratings: input.ratings,
      notes: input.notes,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
    };

    logs.unshift(log);
    return log;
  },

  async getLog(id: string): Promise<Log | null> {
    return logs.find((l) => l.id === id) ?? null;
  },

  async logsByUser(userId: string, opts?: { includePrivate?: boolean }): Promise<Log[]> {
    const includePrivate = Boolean(opts?.includePrivate) || currentSession?.userId === userId;
    return logs
      .filter((l) => l.userId === userId && (includePrivate || l.visibility === 'public'))
      .sort(byNewest);
  },

  async feedForYou(): Promise<Log[]> {
    return logs.filter((l) => l.visibility === 'public').sort(byNewest);
  },

  async feedFollowing(): Promise<Log[]> {
    if (!currentSession) return [];
    const followedIds = new Set(
      follows.filter((f) => f.followerId === currentSession!.userId).map((f) => f.followeeId)
    );
    return logs
      .filter((l) => l.visibility === 'public' && followedIds.has(l.userId))
      .sort(byNewest);
  },

  async feedMine(): Promise<Log[]> {
    if (!currentSession) return [];
    return logs.filter((l) => l.userId === currentSession!.userId).sort(byNewest);
  },

  // --- social -------------------------------------------------------------------

  async follow(userId: string): Promise<void> {
    if (!currentSession || currentSession.userId === userId) return;
    const exists = follows.some(
      (f) => f.followerId === currentSession!.userId && f.followeeId === userId
    );
    if (!exists) follows.push({ followerId: currentSession.userId, followeeId: userId });
  },

  async unfollow(userId: string): Promise<void> {
    if (!currentSession) return;
    follows = follows.filter(
      (f) => !(f.followerId === currentSession!.userId && f.followeeId === userId)
    );
  },

  async isFollowing(userId: string): Promise<boolean> {
    if (!currentSession) return false;
    return follows.some(
      (f) => f.followerId === currentSession!.userId && f.followeeId === userId
    );
  },

  async like(logId: string): Promise<void> {
    const log = logs.find((l) => l.id === logId);
    if (!log || log.likedByMe) return;
    log.likedByMe = true;
    log.likeCount += 1;
  },

  async unlike(logId: string): Promise<void> {
    const log = logs.find((l) => l.id === logId);
    if (!log || !log.likedByMe) return;
    log.likedByMe = false;
    log.likeCount = Math.max(0, log.likeCount - 1);
  },

  async listComments(logId: string): Promise<Comment[]> {
    return comments
      .filter((c) => c.logId === logId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async addComment(logId: string, body: string): Promise<Comment> {
    if (!currentSession) throw new Error('Not signed in');
    const comment: Comment = {
      id: nextCommentId(),
      logId,
      author: toSummary(currentSession.profile),
      body,
      createdAt: new Date().toISOString(),
    };
    comments.push(comment);
    const log = logs.find((l) => l.id === logId);
    if (log) log.commentCount += 1;
    return comment;
  },

  async deleteComment(commentId: string): Promise<void> {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;
    comments = comments.filter((c) => c.id !== commentId);
    const log = logs.find((l) => l.id === comment.logId);
    if (log) log.commentCount = Math.max(0, log.commentCount - 1);
  },

  // --- brew templates -------------------------------------------------------------

  async listTemplates(): Promise<BrewTemplate[]> {
    if (!currentSession) return [];
    return templates.filter((t) => t.userId === currentSession!.userId);
  },

  async createTemplate(input: CreateTemplateInput): Promise<BrewTemplate> {
    if (!currentSession) throw new Error('Not signed in');
    const template: BrewTemplate = {
      id: nextTemplateId(),
      userId: currentSession.userId,
      createdAt: new Date().toISOString(),
      ...input,
    };
    templates.push(template);
    return template;
  },

  async deleteTemplate(id: string): Promise<void> {
    templates = templates.filter((t) => t.id !== id);
  },

  // --- discovery -------------------------------------------------------------

  async search(query: string, filters: DiscoveryFilters): Promise<Log[]> {
    const q = query.trim().toLowerCase();
    return logs
      .filter((l) => l.visibility === 'public')
      .filter((l) => {
        if (!q) return true;
        const haystack = [l.roaster, l.coffeeName, l.originCountry, l.author.username]
          .filter((v): v is string => Boolean(v))
          .map((v) => v.toLowerCase());
        return haystack.some((v) => v.includes(q));
      })
      .filter((l) => (filters.origin ? l.originCountry === filters.origin : true))
      .filter((l) => (filters.roaster ? l.roaster === filters.roaster : true))
      .filter((l) => (filters.method ? l.method === filters.method : true))
      .sort(byNewest);
  },

  async discoveryFacets(): Promise<DiscoveryFacets> {
    const pub = logs.filter((l) => l.visibility === 'public');
    return {
      origins: uniqueSorted(pub.map((l) => l.originCountry)),
      roasters: uniqueSorted(pub.map((l) => l.roaster)),
      methods: uniqueSorted(pub.map((l) => l.method)),
    };
  },

  // --- storage -------------------------------------------------------------

  async uploadPhoto(localUri: string): Promise<string> {
    return uploadPhotoInternal(localUri);
  },

  async resolvePhotoUrl(path: string | null): Promise<string | null> {
    return resolvePhotoUrlInternal(path);
  },
};
