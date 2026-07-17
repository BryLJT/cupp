// The bag-scan pipeline. Interface is stable; the implementation is a MOCK by
// default (staged delays + the validated SEY Huila extraction) so the scan flow
// is fully demoable with no backend. A real path (behind EXPO_PUBLIC_SCAN_LIVE=1)
// uploads to storage and invokes the 'scan-bag' Edge Function — but that Edge
// Function is Block 3 scope and is NOT built here; this only defines the call.
//
// Reference for the contract + grounding guardrail: scripts/scan_spike.py.

import * as ImageManipulator from 'expo-image-manipulator';

import { BEAN_FIELD_KEYS } from './data';
import type { BeanField, BeanFieldKey, BeanFields, ScanResult, ScanStage } from './data';

const SCAN_LIVE = process.env.EXPO_PUBLIC_SCAN_LIVE === '1';

// ---------------------------------------------------------------------------
// bean-field helpers
// ---------------------------------------------------------------------------

function emptyBeanFields(): BeanFields {
  const fields = {} as BeanFields;
  for (const key of BEAN_FIELD_KEYS) {
    fields[key] = { value: null, sourceText: null, basis: 'not_visible' };
  }
  return fields;
}

function field(value: string | null, sourceText: string | null, basis: BeanField['basis']): BeanField {
  return { value, sourceText, basis };
}

// ---------------------------------------------------------------------------
// mock fixtures — grounded in the validated 14 Jul spike
// ---------------------------------------------------------------------------

/** SEY Huila decaf: legible label, most fields read + cited. */
function seyHuilaResult(): ScanResult {
  const fields = emptyBeanFields();
  fields.roaster = field('SEY', 'SEY', 'read');
  fields.coffee_name = field('Huila', 'HUILA', 'read');
  fields.origin_country = field('Colombia', 'COLOMBIA', 'read');
  fields.origin_region = field('Huila', 'HUILA', 'read');
  fields.process = field('Washed', 'FIELD BLEND - WASHED', 'read');
  fields.decaf = field('Decaf', 'DECAFFEINATED', 'read');
  // variety / roast_level / altitude / roast_date / roaster_tasting_notes /
  // weight stay not_visible — the model correctly nulled what wasn't printed.
  return { isCoffeeBag: true, fields };
}

/** Onyx Worka honesty test: olive bag, only a skull logo — roaster only. */
function onyxWorkaResult(): ScanResult {
  const fields = emptyBeanFields();
  fields.roaster = field('Onyx', 'Onyx', 'read');
  // Everything else stays not_visible. The model must NOT hallucinate the true
  // Ethiopia/washed/heirloom identity it had no way to see.
  return { isCoffeeBag: true, fields };
}

export type MockFixture = 'sey-huila' | 'onyx-worka';

function mockResultFor(fixture: MockFixture): ScanResult {
  return fixture === 'onyx-worka' ? onyxWorkaResult() : seyHuilaResult();
}

// ---------------------------------------------------------------------------
// preprocess (both impls): downsize + JPEG. Handles HEIC and is the provisional
// latency fix. TODO Block 4: final resize spec (longest edge / quality matrix).
// ---------------------------------------------------------------------------

async function preprocess(localUri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 1280 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch {
    // If manipulation fails (e.g. odd source), fall back to the original.
    return localUri;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------

export interface ScanOptions {
  /** Which mock fixture to return in mock mode. Defaults to 'sey-huila'. */
  fixture?: MockFixture;
}

/**
 * Scan a coffee-bag image. Reports progress through named stages so the UI can
 * show an honest, staged loading state instead of a bare spinner.
 */
export async function scanBag(
  localImageUri: string,
  onStage: (stage: ScanStage) => void,
  options: ScanOptions = {}
): Promise<ScanResult> {
  onStage('uploading');
  const processedUri = await preprocess(localImageUri);

  if (SCAN_LIVE) {
    return scanLive(processedUri, onStage);
  }
  return scanMock(onStage, options.fixture ?? 'sey-huila');
}

async function scanMock(onStage: (stage: ScanStage) => void, fixture: MockFixture): Promise<ScanResult> {
  await wait(1000); // "uploading"
  onStage('reading');
  await wait(4000); // model latency, per the spike's real-world timing
  onStage('building');
  await wait(1000);
  return mockResultFor(fixture);
}

async function scanLive(_processedUri: string, onStage: (stage: ScanStage) => void): Promise<ScanResult> {
  // Real path — deferred to Block 3 (Edge Function). Wiring only:
  //   const path = await repo.uploadPhoto(processedUri);
  //   onStage('reading');
  //   const { data } = await supabase.functions.invoke('scan-bag', { body: { path } });
  //   onStage('building');
  //   return parseContract(data);
  // Until the Edge Function exists, fail loudly so we never ship a fake "live".
  onStage('reading');
  throw new Error('Live scan not available yet (Edge Function is Block 3). Use manual entry.');
}

/** True bean fields → a fresh BeanFields, for seeding the blank manual form. */
export function blankBeanFields(): BeanFields {
  return emptyBeanFields();
}

/** Serialize a ScanResult's fields to pass through router params. */
export function encodeFields(fields: BeanFields): string {
  return JSON.stringify(fields);
}

/** Parse fields from a router param; returns blank fields if absent/invalid. */
export function decodeFields(raw?: string | string[]): BeanFields {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return emptyBeanFields();
  try {
    const parsed = JSON.parse(value) as Partial<BeanFields>;
    const fields = emptyBeanFields();
    for (const key of BEAN_FIELD_KEYS) {
      const incoming = parsed[key as BeanFieldKey];
      if (incoming) fields[key] = incoming;
    }
    return fields;
  } catch {
    return emptyBeanFields();
  }
}
