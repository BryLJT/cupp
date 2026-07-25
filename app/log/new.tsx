import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Chip,
  DotsRating,
  Photo,
  PressableScale,
  Screen,
  Segmented,
  Stars,
  TextField,
  colors,
  space,
} from '@/components';
import { repo, type BeanFieldKey, type BeanFields, type BrewTemplate, type Ratings, type Visibility } from '@/lib/data';
import { decodeFields } from '@/lib/scan';

const BASE_METHODS = ['V60', 'Espresso', 'Aeropress', 'French Press', 'Kalita Wave'];
const CUSTOM = '__custom__';

// Bean rows shown in the form (decaf handled separately as a toggle).
const BEAN_ROWS: { key: Exclude<BeanFieldKey, 'decaf'>; label: string; placeholder: string }[] = [
  { key: 'roaster', label: 'Roaster', placeholder: 'e.g. SEY' },
  { key: 'coffee_name', label: 'Coffee', placeholder: 'e.g. Huila' },
  { key: 'origin_country', label: 'Origin country', placeholder: 'e.g. Colombia' },
  { key: 'origin_region', label: 'Region', placeholder: 'e.g. Huila' },
  { key: 'process', label: 'Process', placeholder: 'e.g. Washed' },
  { key: 'variety', label: 'Variety', placeholder: 'not on the label — add it?' },
  { key: 'roast_level', label: 'Roast level', placeholder: 'e.g. Light' },
  { key: 'roaster_tasting_notes', label: 'Roaster notes (comma-separated)', placeholder: 'e.g. blueberry, cocoa' },
  { key: 'altitude', label: 'Altitude (masl)', placeholder: 'e.g. 1800' },
  { key: 'weight', label: 'Weight (g)', placeholder: 'e.g. 250' },
];

function parseNum(value: string): number | null {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function BasisChip({ basis }: { basis: string }) {
  if (basis === 'read') return <Chip label="read ✓" variant="read" />;
  if (basis === 'inferred') return <Chip label="inferred" />;
  return null;
}

export default function LogFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prefill?: string; photoUri?: string }>();

  const [bean, setBean] = useState<BeanFields>(() => decodeFields(params.prefill));
  const initialPhotoUri = typeof params.photoUri === 'string' ? params.photoUri : null;
  const [photoUri, setPhotoUri] = useState<string | null>(initialPhotoUri);

  const [method, setMethod] = useState<string>('V60');
  const [customMethod, setCustomMethod] = useState('');
  const [dose, setDose] = useState('');
  const [yieldAmt, setYieldAmt] = useState('');
  const [grind, setGrind] = useState('');
  const [temp, setTemp] = useState('');
  const [time, setTime] = useState('');

  const [ratings, setRatings] = useState<Ratings>({
    strength: null,
    acidity: null,
    sweetness: null,
    bitterness: null,
    overall: null,
  });
  const [notes, setNotes] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [busy, setBusy] = useState(false);

  const [templates, setTemplates] = useState<BrewTemplate[]>([]);
  useEffect(() => {
    repo.listTemplates().then(setTemplates);
  }, []);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera needed', 'Enable camera access in Settings to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const pickPhotoFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Library needed', 'Enable photo access in Settings to pick a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const choosePhoto = () => {
    Alert.alert('Bag photo', undefined, [
      { text: 'Take photo', onPress: takePhoto },
      { text: 'Choose from library', onPress: pickPhotoFromLibrary },
      ...(photoUri ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => setPhotoUri(null) }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const methodOptions = useMemo(() => {
    const known = new Set(BASE_METHODS);
    const extras = templates.map((t) => t.method).filter((m) => !known.has(m));
    return [...BASE_METHODS, ...Array.from(new Set(extras))];
  }, [templates]);

  const setBeanValue = (key: BeanFieldKey, value: string) => {
    setBean((prev) => {
      const current = prev[key];
      const basis = current.basis === 'not_visible' && value ? 'manual' : current.basis;
      return { ...prev, [key]: { ...current, value: value || null, basis } };
    });
  };

  const decafValue = bean.decaf.value ?? '';
  const setDecaf = (value: string) => {
    setBean((prev) => ({
      ...prev,
      decaf: { value: value || null, sourceText: prev.decaf.sourceText, basis: value ? 'manual' : 'not_visible' },
    }));
  };

  const applyTemplate = (t: BrewTemplate) => {
    setMethod(BASE_METHODS.includes(t.method) || methodOptions.includes(t.method) ? t.method : CUSTOM);
    if (!BASE_METHODS.includes(t.method) && !methodOptions.includes(t.method)) setCustomMethod(t.method);
    setDose(t.doseG != null ? String(t.doseG) : '');
    setYieldAmt(t.yieldG != null ? String(t.yieldG) : '');
    setGrind(t.grind ?? '');
    setTemp(t.waterTempC != null ? String(t.waterTempC) : '');
    setTime(t.brewTimeS != null ? String(t.brewTimeS) : '');
  };

  const resolvedMethod = method === CUSTOM ? customMethod.trim() : method;

  const saveTemplate = async () => {
    if (!resolvedMethod) {
      Alert.alert('Pick a method first', 'Choose or type a brew method before saving a template.');
      return;
    }
    const create = async (name: string) => {
      const t = await repo.createTemplate({
        name,
        method: resolvedMethod,
        doseG: parseNum(dose),
        yieldG: parseNum(yieldAmt),
        grind: grind || null,
        waterTempC: parseNum(temp),
        brewTimeS: parseNum(time),
      });
      setTemplates((prev) => [...prev, t]);
    };
    if (Platform.OS === 'ios') {
      Alert.prompt('Save this setup', 'Name your template', (name) => {
        if (name?.trim()) create(name.trim());
      });
    } else {
      await create(`${resolvedMethod} recipe`);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      await repo.createLog({
        visibility,
        bean,
        photoLocalUri: photoUri,
        method: resolvedMethod || null,
        doseG: parseNum(dose),
        yieldG: parseNum(yieldAmt),
        grind: grind || null,
        waterTempC: parseNum(temp),
        brewTimeS: parseNum(time),
        ratings,
        notes: notes.trim() || null,
      });
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  };

  return (
    <Screen scroll edges={['top', 'bottom']} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <AppText variant="title">New log</AppText>
        <PressableScale onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.taupe} />
        </PressableScale>
      </View>

      <PressableScale
        onPress={choosePhoto}
        accessibilityRole="button"
        accessibilityLabel={photoUri ? 'Change bag photo' : 'Add a bag photo'}
        style={styles.photoTap}
      >
        <Photo url={photoUri} height={160} style={styles.photo} />
        <View style={styles.photoBadge}>
          <Ionicons name={photoUri ? 'camera' : 'add'} size={16} color={colors.onAccent} />
        </View>
      </PressableScale>

      {/* Bean */}
      <AppText variant="label" style={styles.sectionLabel}>
        Bean {params.prefill ? '— from the bag' : ''}
      </AppText>
      {BEAN_ROWS.map((row) => (
        <View key={row.key} style={styles.beanRow}>
          <View style={styles.beanField}>
            <TextField
              label={row.label}
              value={bean[row.key].value ?? ''}
              onChangeText={(text) => setBeanValue(row.key, text)}
              placeholder={row.placeholder}
            />
          </View>
          <View style={styles.basis}>
            <BasisChip basis={bean[row.key].basis} />
          </View>
        </View>
      ))}
      <View style={styles.decaf}>
        <AppText variant="label" style={styles.inlineLabel}>
          Caffeine
        </AppText>
        <Segmented
          options={[
            { label: 'Caffeinated', value: 'Caffeinated' },
            { label: 'Decaf', value: 'Decaf' },
          ]}
          value={decafValue}
          onChange={setDecaf}
        />
      </View>

      {/* Templates */}
      {templates.length > 0 || resolvedMethod ? (
        <>
          <AppText variant="label" style={styles.sectionLabel}>
            Brew templates
          </AppText>
          <View style={styles.chipWrap}>
            {templates.map((t) => (
              <Chip key={t.id} label={`★ ${t.name}`} onPress={() => applyTemplate(t)} />
            ))}
            <Chip label="Save this setup ＋" onPress={saveTemplate} />
          </View>
        </>
      ) : null}

      {/* Brew */}
      <AppText variant="label" style={styles.sectionLabel}>
        Your brew
      </AppText>
      <View style={styles.chipWrap}>
        {methodOptions.map((m) => (
          <Chip key={m} label={m} selected={method === m} onPress={() => setMethod(m)} />
        ))}
        <Chip label="＋ Custom" selected={method === CUSTOM} onPress={() => setMethod(CUSTOM)} />
      </View>
      {method === CUSTOM ? (
        <TextField
          label="Custom method"
          value={customMethod}
          onChangeText={setCustomMethod}
          placeholder="e.g. Turkish cezve"
          containerStyle={styles.spacedField}
        />
      ) : null}
      <View style={styles.brewGrid}>
        <TextField label="Dose (g)" value={dose} onChangeText={setDose} keyboardType="numeric" containerStyle={styles.half} />
        <TextField
          label="Yield (g)"
          value={yieldAmt}
          onChangeText={setYieldAmt}
          keyboardType="numeric"
          containerStyle={styles.half}
        />
      </View>
      <View style={styles.brewGrid}>
        <TextField label="Grind" value={grind} onChangeText={setGrind} placeholder="e.g. medium-fine" containerStyle={styles.half} />
        <TextField label="Water °C" value={temp} onChangeText={setTemp} keyboardType="numeric" containerStyle={styles.half} />
      </View>
      <TextField label="Brew time (s)" value={time} onChangeText={setTime} keyboardType="numeric" containerStyle={styles.spacedField} />

      {/* Rating */}
      <AppText variant="label" style={styles.sectionLabel}>
        Your verdict — 1 to 5
      </AppText>
      <View style={styles.ratings}>
        <DotsRating label="Strength" value={ratings.strength ?? 0} onChange={(v) => setRatings((r) => ({ ...r, strength: v }))} />
        <DotsRating label="Acidity" value={ratings.acidity ?? 0} onChange={(v) => setRatings((r) => ({ ...r, acidity: v }))} />
        <DotsRating label="Sweetness" value={ratings.sweetness ?? 0} onChange={(v) => setRatings((r) => ({ ...r, sweetness: v }))} />
        <DotsRating label="Bitterness" value={ratings.bitterness ?? 0} onChange={(v) => setRatings((r) => ({ ...r, bitterness: v }))} />
        <View style={styles.overallRow}>
          <AppText variant="bodySemiBold">Overall</AppText>
          <Stars value={ratings.overall ?? 0} size={22} onChange={(v) => setRatings((r) => ({ ...r, overall: v }))} />
        </View>
      </View>

      {/* Notes */}
      <TextField
        label="Your tasting notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="What did you taste?"
        multiline
        numberOfLines={3}
        containerStyle={styles.spacedField}
        style={styles.notesInput}
      />

      {/* Visibility + save */}
      <AppText variant="label" style={styles.sectionLabel}>
        Visibility
      </AppText>
      <Segmented
        options={[
          { label: 'Public', value: 'public' },
          { label: 'Private', value: 'private' },
        ]}
        value={visibility}
        onChange={(v) => setVisibility(v as Visibility)}
      />
      <Button
        title={visibility === 'public' ? 'Share to feed' : 'Save privately'}
        onPress={save}
        loading={busy}
        style={styles.save}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: space(12),
    gap: space(2),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space(2),
    paddingBottom: space(1),
  },
  photoTap: {
    position: 'relative',
  },
  photo: {
    borderRadius: 10,
  },
  photoBadge: {
    position: 'absolute',
    right: space(2),
    bottom: space(2),
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    marginTop: space(4),
  },
  beanRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space(2),
  },
  beanField: {
    flex: 1,
  },
  basis: {
    paddingBottom: space(2.5),
    minWidth: 0,
  },
  inlineLabel: {
    marginBottom: space(2),
  },
  decaf: {
    marginTop: space(1),
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(2),
  },
  spacedField: {
    marginTop: space(1),
  },
  brewGrid: {
    flexDirection: 'row',
    gap: space(3),
  },
  half: {
    flex: 1,
  },
  ratings: {
    gap: space(3),
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.surface,
    padding: space(4),
  },
  overallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space(1),
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  save: {
    marginTop: space(5),
  },
});
