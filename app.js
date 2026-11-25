(() => {
  'use strict';

  /* =========================================================
     定数・デフォルトデータ
     ========================================================= */
  const DB_NAME = 'tejun_schedule_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'app_state';
  const STATE_KEY = 'main_state_v1';
  const SYMBOLS_KEY = 'symbols_library_v1';
  const LS_FALLBACK_KEY = 'tejun_schedule_fallback_v1';
  const LS_SYMBOLS_FALLBACK_KEY = 'tejun_schedule_symbols_fallback_v1';
  const MAX_VISIBLE_SYMBOLS = 120;
  const HOLD_DURATION_MS = 1500;
  const RING_CIRCUMFERENCE = 2 * Math.PI * 19; // r=19

  const SCHOOL_EMOJIS = [
    '🎒', '📓', '🥤', '🧻', '🧼', '🪑', '👟', '👕', '👖', '🎽',
    '🧥', '🧢', '🍵', '👋', '✏️', '✂️', '🖍️', '📖', '📁', '🍱',
    '🥢', '🪥', '🚽', '🗑️', '🧹', '🪣', '🧽', '📱', '💻', '🔔',
    '⏰', '🚌', '🚶', '🙌', '✋', '👀', '👂', '😊', '💮', '⭐',
    '☀️', '🌇', '🏠', '🏫', '🎵', '🎨', '⚽', '🏊', '📚', '💊',
    '😷', '🔑', '🧤', '☂️'
  ];

  const LEGACY_SAMPLE_HINTS = new Set([
    'じぶんの ロッカーに いれる',
    'かごに いれる',
    'きまった ばしょに おく',
    'じぶんの フックに かける',
    'せっけんで きれいに あらう',
    'しずかに まつ',
    'リュックに いれる',
    'ふくろに いれて リュックへ',
    'チャックを しっかり しめる',
    'つくえの したに いれる',
    'せんせいの はなしを きく'
  ]);

  function createUid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function createDefaultState() {
    return {
      version: 5,
      activeScheduleId: 'morning',
      viewMode: 'list', // 'list' | 'single'
      settings: {
        fontSize: 'normal', // 'normal' | 'large'
        trainMode: false,
        trainLineCode: 'JB',
        sequential: true,
        lockDone: true,
        teacherPin: '',
        sound: true,
        speech: true,
        speechOnceOnly: true,
        autoSpeech: false,
        compactDone: false
      },
      schedules: [
        {
          id: 'morning',
          title: 'あさの じゅんび',
          icon: '☀️',
          theme: 'morning',
          nextActivity: '',
          steps: [
            { id: 'm1', text: 'リュック', hint: '', emoji: '🎒', image: null, done: false },
            { id: 'm2', text: 'れんらくちょう', hint: '', emoji: '📓', image: null, done: false },
            { id: 'm3', text: 'すいとう', hint: '', emoji: '🥤', image: null, done: false },
            { id: 'm4', text: 'タオルとエプロン', hint: '', emoji: '🧻', image: null, done: false },
            { id: 'm5', text: 'こうないぎ', hint: '', emoji: '👕', image: null, done: false },
            { id: 'm6', text: 'うわぐつをぬぐ', hint: '', emoji: '👟', image: null, done: false },
            { id: 'm7', text: 'ズボンをぬぐ', hint: '', emoji: '👖', image: null, done: false },
            { id: 'm8', text: 'ズボンをはく', hint: '', emoji: '👖', image: null, done: false },
            { id: 'm9', text: 'ふくをぬぐ', hint: '', emoji: '👕', image: null, done: false },
            { id: 'm10', text: 'ふくをきる', hint: '', emoji: '👕', image: null, done: false },
            { id: 'm11', text: 'うわぐつをはく', hint: '', emoji: '👟', image: null, done: false },
            { id: 'm12', text: 'おはようタイム', hint: '', emoji: '👋', image: null, done: false },
            { id: 'm13', text: 'トイレ', hint: '', emoji: '🚽', image: null, done: false },
            { id: 'm14', text: 'おちゃのみ', hint: '', emoji: '🍵', image: null, done: false },
            { id: 'm15', text: 'あさのかい', hint: '', emoji: '🪑', image: null, done: false }
          ]
        },
        {
          id: 'evening',
          title: 'かえりの じゅんび',
          icon: '🌇',
          theme: 'evening',
          nextActivity: 'かえりの かい ／ げこう',
          steps: [
            { id: 'e1', text: 'れんらくちょうを しまう', hint: '', emoji: '📓', image: null, done: false },
            { id: 'e2', text: 'すいとうを しまう', hint: '', emoji: '🥤', image: null, done: false },
            { id: 'e3', text: 'タオルを しまう', hint: '', emoji: '🧻', image: null, done: false },
            { id: 'e4', text: 'リュックを しめる', hint: '', emoji: '🎒', image: null, done: false },
            { id: 'e5', text: 'いすを しまう', hint: '', emoji: '🪑', image: null, done: false },
            { id: 'e6', text: 'ならんで まつ', hint: '', emoji: '🚶', image: null, done: false }
          ]
        }
      ]
    };
  }

  /* =========================================================
     IndexedDB ストレージ（localStorageフォールバック付き）
     ========================================================= */
  function openDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function loadStateFromStorage() {
    try {
      const db = await openDb();
      const data = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(STATE_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      if (data && Array.isArray(data.schedules) && data.schedules.length > 0) {
        return normalizeState(data);
      }
    } catch (e) {
      // IndexedDB不可時はフォールバックへ
    }

    try {
      const raw = localStorage.getItem(LS_FALLBACK_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.schedules) && parsed.schedules.length > 0) {
          return normalizeState(parsed);
        }
      }
    } catch (e) {
      // 無視して初期状態を使う
    }

    return createDefaultState();
  }

  async function saveStateToStorage(nextState) {
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(nextState, STATE_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      return;
    } catch (e) {
      // フォールバック
    }

    try {
      localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(nextState));
    } catch (e) {
      showToast('保存容量がいっぱいです。写真を減らしてください。');
    }
  }

  async function loadSymbolsFromStorage() {
    try {
      const db = await openDb();
      const list = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(SYMBOLS_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      if (Array.isArray(list)) return list;
    } catch (e) {
      // フォールバックへ
    }

    try {
      const raw = localStorage.getItem(LS_SYMBOLS_FALLBACK_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // 無視
    }
    return [];
  }

  async function saveSymbolsToStorage(list) {
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(list, SYMBOLS_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      return;
    } catch (e) {
      // フォールバック
    }

    try {
      localStorage.setItem(LS_SYMBOLS_FALLBACK_KEY, JSON.stringify(list));
    } catch (e) {
      showToast('保存容量がいっぱいです。シンボルを減らしてください。');
    }
  }

  async function loadBundledSymbols() {
    if (location.protocol === 'file:') return [];
    try {
      const res = await fetch('./symbols/index.json', { cache: 'no-cache' });
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data
        .filter((item) => item && typeof item.file === 'string')
        .map((item, i) => ({
          id: `bundled_${i}_${item.file}`,
          name: String(item.name || item.file.replace(/\.[^.]+$/, '')),
          dataUrl: `./symbols/${item.file}`,
          bundled: true
        }));
    } catch (e) {
      return [];
    }
  }

  function normalizeState(raw) {
    const def = createDefaultState();
    const isLegacyV1 = !raw.version || raw.version < 2;
    const isLegacyV2 = !raw.version || raw.version < 3;
    const isLegacyV3 = !raw.version || raw.version < 4;
    const isLegacyV4 = !raw.version || raw.version < 5;
    const schedules = Array.isArray(raw.schedules) && raw.schedules.length > 0
      ? raw.schedules.map((sch) => {
          // 旧サンプル（6項目）の「あさの じゅんび」は自動で新しい15項目へ更新
          if (
            isLegacyV2 &&
            sch.id === 'morning' &&
            Array.isArray(sch.steps) &&
            sch.steps.length === 6 &&
            sch.steps[0] &&
            sch.steps[0].id === 'm1' &&
            sch.steps[0].text === 'リュックを おく'
          ) {
            return def.schedules[0];
          }
          return {
            id: String(sch.id || createUid('sch')),
            title: String(sch.title || 'てじゅんひょう'),
            icon: String(sch.icon || '📋'),
            theme: ['morning', 'evening', 'green', 'purple'].includes(sch.theme) ? sch.theme : 'morning',
            nextActivity: String(sch.nextActivity || ''),
            steps: Array.isArray(sch.steps)
              ? sch.steps.map((st) => {
                  const rawHint = String(st.hint || '');
                  const cleanedHint = isLegacyV1 && LEGACY_SAMPLE_HINTS.has(rawHint) ? '' : rawHint;
                  return {
                    id: String(st.id || createUid('st')),
                    text: String(st.text || ''),
                    hint: cleanedHint,
                    emoji: String(st.emoji || '⭐'),
                    image: typeof st.image === 'string' && (st.image.startsWith('data:image/') || st.image.startsWith('./symbols/')) ? st.image : null,
                    done: Boolean(st.done)
                  };
                })
              : []
          };
        })
      : def.schedules;

    const activeExists = schedules.some((s) => s.id === raw.activeScheduleId);
    const mergedSettings = {
      ...def.settings,
      ...(raw.settings || {})
    };
    if (isLegacyV3) {
      mergedSettings.sequential = true;
    }
    if (isLegacyV4) {
      mergedSettings.lockDone = true;
    }
    return {
      version: 5,
      activeScheduleId: activeExists ? raw.activeScheduleId : schedules[0].id,
      viewMode: raw.viewMode === 'single' ? 'single' : 'list',
      settings: mergedSettings,
      schedules
    };
  }

  /* =========================================================
     音声（Web Audio API 効果音 & Web Speech API 読み上げ）
     ========================================================= */
  let audioCtx = null;

  function ensureAudioContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) {
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function playTone(freq, startOffset, duration, gainPeak = 0.14) {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playChimeNote(freq, startOffset, duration, gainPeak = 0.15) {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + startOffset;

    // 鉄琴・駅電子チャイム風の倍音構成（基音 + 2倍音 + 3倍音）
    const harmonics = [
      { mult: 1, type: 'triangle', amp: 1.0, decay: duration },
      { mult: 2, type: 'sine', amp: 0.38, decay: duration * 0.7 },
      { mult: 3, type: 'sine', amp: 0.14, decay: duration * 0.4 }
    ];

    harmonics.forEach((h) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = h.type;
      osc.frequency.setValueAtTime(freq * h.mult, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainPeak * h.amp, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.08, h.decay));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + Math.max(0.08, h.decay) + 0.03);
    });
  }

  function playTrainStepChime() {
    // 駅・車内放送ふう「ピン・ポン・パン・ポーン♪」チャイム
    playChimeNote(783.99, 0.00, 0.38, 0.14); // G5
    playChimeNote(659.25, 0.17, 0.38, 0.14); // E5
    playChimeNote(523.25, 0.34, 0.38, 0.14); // C5
    playChimeNote(783.99, 0.52, 0.65, 0.16); // G5 (のびる)
  }

  function playTrainArrivalMelody() {
    // 終点到着・発車メロディ風の華やかな和音つき鉄道メロディ
    const melody = [
      { f: 523.25, t: 0.00, d: 0.28 }, // C5
      { f: 659.25, t: 0.16, d: 0.28 }, // E5
      { f: 783.99, t: 0.32, d: 0.32 }, // G5
      { f: 1046.5, t: 0.48, d: 0.42 }, // C6
      { f: 987.77, t: 0.72, d: 0.26 }, // B5
      { f: 783.99, t: 0.88, d: 0.26 }, // G5
      { f: 880.00, t: 1.04, d: 0.28 }, // A5
      { f: 987.77, t: 1.20, d: 0.28 }, // B5
      { f: 1046.5, t: 1.38, d: 0.90 }  // C6
    ];
    melody.forEach((n) => playChimeNote(n.f, n.t, n.d, 0.14));

    // 伴奏のやさしい和音
    playChimeNote(261.63, 0.00, 0.65, 0.08); // C4
    playChimeNote(392.00, 0.72, 0.60, 0.08); // G4
    playChimeNote(261.63, 1.38, 0.90, 0.09); // C4
    playChimeNote(523.25, 1.38, 0.90, 0.09); // C5
    playChimeNote(659.25, 1.38, 0.90, 0.08); // E5
  }

  function playDoneSound() {
    if (!state.settings.sound) return;
    if (state.settings.trainMode) {
      playTrainStepChime();
      return;
    }
    playTone(523.25, 0, 0.16, 0.14); // C5
    playTone(659.25, 0.09, 0.24, 0.15); // E5
  }

  function playUndoSound() {
    if (!state.settings.sound) return;
    playTone(392.0, 0, 0.12, 0.08); // G4
  }

  function playFanfareSound() {
    if (!state.settings.sound) return;
    if (state.settings.trainMode) {
      playTrainArrivalMelody();
      return;
    }
    playTone(523.25, 0.0, 0.18, 0.13); // C5
    playTone(659.25, 0.11, 0.18, 0.13); // E5
    playTone(783.99, 0.22, 0.18, 0.13); // G5
    playTone(1046.5, 0.34, 0.45, 0.16); // C6
  }

  function speakText(text) {
    if (!('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'ja-JP';
      utter.rate = 0.9;
      utter.pitch = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const jaVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ja'));
      if (jaVoice) utter.voice = jaVoice;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      // 読み上げ非対応環境では何もしない
    }
  }

  /* =========================================================
     アプリ状態 & DOM参照
     ========================================================= */
  let state = createDefaultState();
  let symbolLibrary = [];
  let bundledSymbols = [];
  let symbolPickerMode = 'symbols'; // 'symbols' | 'emojis'
  let symbolDeleteMode = false;
  let suppressCompleteScreen = false;
  let editingScheduleId = 'morning';
  let editingStepContext = null; // { scheduleId, stepId | null, image, emoji }
  let pendingConfirmCallback = null;
  let toastTimer = null;
  let pinBuffer = '';
  const spokenStepIds = new Set();

  function isStepSpeechUsed(stepId) {
    return Boolean(state.settings.speechOnceOnly) && spokenStepIds.has(stepId);
  }

  function speakStep(step) {
    if (!step || !step.text) return;
    if (isStepSpeechUsed(step.id)) return;
    spokenStepIds.add(step.id);
    speakText(step.text);
    renderApp();
  }

  function clearSpokenForSchedule(schedule) {
    if (!schedule) return;
    schedule.steps.forEach((s) => spokenStepIds.delete(s.id));
  }

  const dom = {
    scheduleTabs: document.getElementById('scheduleTabs'),
    btnModeList: document.getElementById('btnModeList'),
    btnModeSingle: document.getElementById('btnModeSingle'),
    btnUndoOne: document.getElementById('btnUndoOne'),
    btnReset: document.getElementById('btnReset'),
    btnTeacherMode: document.getElementById('btnTeacherMode'),
    holdRingProgress: document.getElementById('holdRingProgress'),
    currentScheduleTitle: document.getElementById('currentScheduleTitle'),
    progressCount: document.getElementById('progressCount'),
    progressTrack: document.getElementById('progressTrack'),
    progressFill: document.getElementById('progressFill'),
    trainRunner: document.getElementById('trainRunner'),
    stepListView: document.getElementById('stepListView'),
    singleStepView: document.getElementById('singleStepView'),
    completeView: document.getElementById('completeView'),
    completeBadge: document.getElementById('completeBadge'),
    completeHeading: document.getElementById('completeHeading'),
    completeSubText: document.getElementById('completeSubText'),
    nextActivityBox: document.getElementById('nextActivityBox'),
    nextActivityText: document.getElementById('nextActivityText'),
    toast: document.getElementById('toast'),

    // パスワードモーダル
    pinModal: document.getElementById('pinModal'),
    pinDots: document.getElementById('pinDots'),
    pinError: document.getElementById('pinError'),
    pinKeypad: document.getElementById('pinKeypad'),
    btnPinCancel: document.getElementById('btnPinCancel'),
    btnPinBackspace: document.getElementById('btnPinBackspace'),

    // 確認モーダル
    confirmModal: document.getElementById('confirmModal'),
    confirmTitle: document.getElementById('confirmTitle'),
    confirmDesc: document.getElementById('confirmDesc'),
    btnConfirmCancel: document.getElementById('btnConfirmCancel'),
    btnConfirmOk: document.getElementById('btnConfirmOk'),

    // 先生モード
    teacherModal: document.getElementById('teacherModal'),
    btnCloseTeacher: document.getElementById('btnCloseTeacher'),
    teacherTabs: Array.from(document.querySelectorAll('.teacher-tab')),
    panelSteps: document.getElementById('panelSteps'),
    panelSchedules: document.getElementById('panelSchedules'),
    panelSettings: document.getElementById('panelSettings'),
    panelBackup: document.getElementById('panelBackup'),
    editScheduleSelect: document.getElementById('editScheduleSelect'),
    btnOpenCopySteps: document.getElementById('btnOpenCopySteps'),
    btnAddStep: document.getElementById('btnAddStep'),
    copyStepsModal: document.getElementById('copyStepsModal'),
    copyStepsDesc: document.getElementById('copyStepsDesc'),
    copySourceSelect: document.getElementById('copySourceSelect'),
    copyModeSelect: document.getElementById('copyModeSelect'),
    copyReverseCheck: document.getElementById('copyReverseCheck'),
    btnCancelCopySteps: document.getElementById('btnCancelCopySteps'),
    btnDoCopySteps: document.getElementById('btnDoCopySteps'),
    metaScheduleTitle: document.getElementById('metaScheduleTitle'),
    metaScheduleIcon: document.getElementById('metaScheduleIcon'),
    metaScheduleTheme: document.getElementById('metaScheduleTheme'),
    metaNextActivity: document.getElementById('metaNextActivity'),
    editStepList: document.getElementById('editStepList'),
    btnAddSchedule: document.getElementById('btnAddSchedule'),
    scheduleManageList: document.getElementById('scheduleManageList'),

    // 設定
    settingTrainMode: document.getElementById('settingTrainMode'),
    settingTrainLine: document.getElementById('settingTrainLine'),
    settingTrainLineRow: document.getElementById('settingTrainLineRow'),
    settingTrainSoundTestRow: document.getElementById('settingTrainSoundTestRow'),
    btnTestTrainChime: document.getElementById('btnTestTrainChime'),
    btnTestTrainArrival: document.getElementById('btnTestTrainArrival'),
    settingFontSize: document.getElementById('settingFontSize'),
    settingSequential: document.getElementById('settingSequential'),
    settingLockDone: document.getElementById('settingLockDone'),
    settingSound: document.getElementById('settingSound'),
    settingSpeech: document.getElementById('settingSpeech'),
    settingSpeechOnceOnly: document.getElementById('settingSpeechOnceOnly'),
    settingAutoSpeech: document.getElementById('settingAutoSpeech'),
    settingCompactDone: document.getElementById('settingCompactDone'),
    pinStatusText: document.getElementById('pinStatusText'),
    settingPinInput: document.getElementById('settingPinInput'),
    btnSavePin: document.getElementById('btnSavePin'),
    btnClearPin: document.getElementById('btnClearPin'),

    // バックアップ
    btnExportData: document.getElementById('btnExportData'),
    inputImportData: document.getElementById('inputImportData'),
    btnPrintSchedule: document.getElementById('btnPrintSchedule'),
    btnFactoryReset: document.getElementById('btnFactoryReset'),

    // ステップ編集モーダル
    stepEditModal: document.getElementById('stepEditModal'),
    stepEditTitle: document.getElementById('stepEditTitle'),
    btnCancelStepEdit: document.getElementById('btnCancelStepEdit'),
    btnCancelStepEditFooter: document.getElementById('btnCancelStepEditFooter'),
    btnSaveStepEdit: document.getElementById('btnSaveStepEdit'),
    stepTextInput: document.getElementById('stepTextInput'),
    stepHintInput: document.getElementById('stepHintInput'),
    stepMediaPreview: document.getElementById('stepMediaPreview'),
    stepPhotoInput: document.getElementById('stepPhotoInput'),
    btnRemovePhoto: document.getElementById('btnRemovePhoto'),
    tabPickerSymbols: document.getElementById('tabPickerSymbols'),
    tabPickerEmojis: document.getElementById('tabPickerEmojis'),
    symbolPickerPanel: document.getElementById('symbolPickerPanel'),
    symbolSearchInput: document.getElementById('symbolSearchInput'),
    symbolFilesInput: document.getElementById('symbolFilesInput'),
    symbolFolderInput: document.getElementById('symbolFolderInput'),
    btnToggleSymbolDelete: document.getElementById('btnToggleSymbolDelete'),
    symbolCountText: document.getElementById('symbolCountText'),
    btnClearAllSymbols: document.getElementById('btnClearAllSymbols'),
    symbolPickerGrid: document.getElementById('symbolPickerGrid'),
    emojiPicker: document.getElementById('emojiPicker')
  };

  /* =========================================================
     ヘルパー
     ========================================================= */
  function getActiveSchedule() {
    return state.schedules.find((s) => s.id === state.activeScheduleId) || state.schedules[0];
  }

  function getScheduleById(id) {
    return state.schedules.find((s) => s.id === id) || state.schedules[0];
  }

  function showToast(message, durationMs = 2400) {
    dom.toast.textContent = message;
    dom.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      dom.toast.classList.add('hidden');
    }, durationMs);
  }

  function openConfirm(title, desc, okLabel, onOk) {
    dom.confirmTitle.textContent = title;
    dom.confirmDesc.textContent = desc;
    dom.btnConfirmOk.textContent = okLabel;
    pendingConfirmCallback = onOk;
    dom.confirmModal.classList.remove('hidden');
  }

  function closeConfirm() {
    dom.confirmModal.classList.add('hidden');
    pendingConfirmCallback = null;
  }

  function commitState() {
    saveStateToStorage(state);
    renderApp();
  }

  function createVisualNode(step, className) {
    const box = document.createElement('div');
    box.className = className;
    if (step.image) {
      const img = document.createElement('img');
      img.src = step.image;
      img.alt = step.text;
      box.appendChild(img);
    } else {
      box.textContent = step.emoji || '⭐';
    }
    return box;
  }

  function createStationBadge(index, isLarge = false) {
    const lineCode = state.settings.trainLineCode || 'JB';
    const badge = document.createElement('div');
    badge.className = `station-badge${isLarge ? ' station-badge-lg' : ''}`;

    const codeEl = document.createElement('div');
    codeEl.className = 'station-badge-code';
    codeEl.textContent = lineCode;

    const numEl = document.createElement('div');
    numEl.className = 'station-badge-num';
    numEl.textContent = String(index + 1);

    badge.append(codeEl, numEl);
    return badge;
  }

  /* =========================================================
     メイン描画
     ========================================================= */
  function applyBodyClasses(schedule) {
    document.body.className = '';
    document.body.classList.add(`theme-${schedule.theme || 'morning'}`);
    document.body.classList.add(`font-${state.settings.fontSize || 'normal'}`);
    if (state.settings.compactDone) {
      document.body.classList.add('compact-done');
    }
    if (state.settings.trainMode) {
      document.body.classList.add('train-mode');
      document.body.classList.add(`line-${state.settings.trainLineCode || 'JB'}`);
    }
    const themeColors = {
      morning: '#0284c7',
      evening: '#ea580c',
      green: '#15803d',
      purple: '#6d28d9'
    };
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', state.settings.trainMode ? '#1f2328' : (themeColors[schedule.theme] || '#0284c7'));
    }
  }

  function renderTabs() {
    dom.scheduleTabs.innerHTML = '';
    state.schedules.forEach((sch) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `schedule-tab${sch.id === state.activeScheduleId ? ' active' : ''}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(sch.id === state.activeScheduleId));

      const iconSpan = document.createElement('span');
      iconSpan.setAttribute('aria-hidden', 'true');
      iconSpan.textContent = sch.icon || '📋';

      const textSpan = document.createElement('span');
      textSpan.textContent = sch.title;

      btn.appendChild(iconSpan);
      btn.appendChild(textSpan);
      btn.addEventListener('click', () => {
        if (state.activeScheduleId !== sch.id) {
          state.activeScheduleId = sch.id;
          editingScheduleId = sch.id;
          suppressCompleteScreen = false;
          commitState();
          if (!dom.teacherModal.classList.contains('hidden')) {
            renderTeacherModal();
          }
          showToast(`「${sch.title}」に きりかえました`);
        }
      });
      dom.scheduleTabs.appendChild(btn);
    });
  }

  function renderProgress(schedule) {
    const total = schedule.steps.length;
    const doneCount = schedule.steps.filter((s) => s.done).length;
    const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);
    const isTrain = Boolean(state.settings.trainMode);
    const lineCode = state.settings.trainLineCode || 'JB';

    dom.currentScheduleTitle.textContent = isTrain
      ? `🚆 ${lineCode} ${schedule.title}`
      : `${schedule.icon || ''} ${schedule.title}`.trim();
    dom.progressCount.textContent = isTrain
      ? `${doneCount} / ${total} えき`
      : `${doneCount} / ${total} できた`;
    dom.progressTrack.setAttribute('aria-valuemax', String(total));
    dom.progressTrack.setAttribute('aria-valuenow', String(doneCount));
    dom.progressFill.style.width = `${pct}%`;

    if (isTrain) {
      dom.trainRunner.classList.remove('hidden');
      dom.trainRunner.style.left = `${pct}%`;
    } else {
      dom.trainRunner.classList.add('hidden');
    }
  }

  function toggleStepDone(schedule, stepId) {
    const step = schedule.steps.find((s) => s.id === stepId);
    if (!step) return;
    if (step.done && state.settings.lockDone) return;

    const wasAllDone = schedule.steps.length > 0 && schedule.steps.every((s) => s.done);
    step.done = !step.done;

    const isNowAllDone = schedule.steps.length > 0 && schedule.steps.every((s) => s.done);
    if (step.done) {
      if (isNowAllDone && !wasAllDone) {
        suppressCompleteScreen = false;
        playFanfareSound();
        if (state.settings.autoSpeech && state.viewMode === 'single') {
          speakText(state.settings.trainMode
            ? 'しゅうてん、とうちゃく！ぜんぶ できたね！'
            : 'ぜんぶ できたね！とても よく がんばりました。');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        playDoneSound();
        if (state.settings.autoSpeech && state.viewMode === 'single') {
          const nextStep = schedule.steps.find((s) => !s.done);
          if (nextStep) {
            setTimeout(() => speakStep(nextStep), 250);
          }
        }
      }
    } else {
      playUndoSound();
    }

    commitState();
  }

  function renderListView(schedule) {
    dom.stepListView.innerHTML = '';

    if (schedule.steps.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'complete-card';
      empty.innerHTML = '<p style="font-size:1.2rem;font-weight:700;margin:0;">てじゅんが ありません。<br>右上の「⚙️ せんせい」を 1.5びょう ながおし して追加してください。</p>';
      dom.stepListView.appendChild(empty);
      return;
    }

    const firstUndoneIndex = schedule.steps.findIndex((s) => !s.done);
    let lastDoneIndex = -1;
    for (let i = schedule.steps.length - 1; i >= 0; i--) {
      if (schedule.steps[i].done) {
        lastDoneIndex = i;
        break;
      }
    }

    schedule.steps.forEach((step, idx) => {
      const isCurrent = idx === firstUndoneIndex;
      const isFutureLocked = state.settings.sequential && !step.done && !isCurrent;
      const isDoneLocked = step.done && (Boolean(state.settings.lockDone) || (state.settings.sequential && idx !== lastDoneIndex));
      const isLocked = isFutureLocked || isDoneLocked;

      const card = document.createElement('article');
      card.className = 'step-card';
      if (step.done) card.classList.add('is-done');
      if (isCurrent) card.classList.add('is-current');
      if (isFutureLocked) card.classList.add('is-locked');

      // 番号列
      const numCol = document.createElement('div');
      numCol.className = 'step-num-col';

      if (state.settings.trainMode) {
        numCol.appendChild(createStationBadge(idx, false));
      } else {
        const numBadge = document.createElement('div');
        numBadge.className = 'step-number';
        numBadge.textContent = step.done ? '✓' : String(idx + 1);
        numCol.appendChild(numBadge);
      }

      if (isCurrent) {
        const nowPill = document.createElement('span');
        nowPill.className = 'now-pill';
        nowPill.textContent = state.settings.trainMode ? '🚃 つぎのえき' : 'いま ここ';
        numCol.appendChild(nowPill);
      }

      // 写真・イラスト
      const visual = createVisualNode(step, 'step-visual');

      // テキスト（電車モード時はJR九州の駅名標デザイン）
      const body = document.createElement('div');
      body.className = state.settings.trainMode ? 'step-body station-sign-body' : 'step-body';

      const title = document.createElement('div');
      title.className = 'step-text';
      title.textContent = step.text;
      body.appendChild(title);

      if (step.hint) {
        const hint = document.createElement('div');
        hint.className = 'step-hint';
        hint.textContent = step.hint;
        body.appendChild(hint);
      }

      if (state.settings.trainMode) {
        const bar = document.createElement('div');
        bar.className = 'station-sign-bar';
        const point = document.createElement('span');
        point.className = 'station-sign-point';
        bar.appendChild(point);
        body.appendChild(bar);

        const neighbors = document.createElement('div');
        neighbors.className = 'station-sign-neighbors';
        const prevName = idx > 0 ? schedule.steps[idx - 1].text : 'しゅっぱつ';
        const nextName = idx < schedule.steps.length - 1 ? schedule.steps[idx + 1].text : 'しゅうてん';

        const prevEl = document.createElement('span');
        prevEl.className = 'neighbor-prev';
        prevEl.textContent = `◀ ${prevName}`;

        const nextEl = document.createElement('span');
        nextEl.className = 'neighbor-next';
        nextEl.textContent = `${nextName} ▶`;

        neighbors.append(prevEl, nextEl);
        body.appendChild(neighbors);
      }

      // アクションボタン
      const actions = document.createElement('div');
      actions.className = 'step-actions';

      if (state.settings.speech) {
        const speechUsed = isStepSpeechUsed(step.id);
        const speakBtn = document.createElement('button');
        speakBtn.type = 'button';
        speakBtn.className = 'speak-btn';
        speakBtn.disabled = speechUsed;
        speakBtn.setAttribute('aria-label', speechUsed ? 'よみあげずみ' : `${step.text} を よみあげる`);
        speakBtn.textContent = speechUsed ? '🔇' : '🔊';
        speakBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          speakStep(step);
        });
        actions.appendChild(speakBtn);
      }

      const doneBtn = document.createElement('button');
      doneBtn.type = 'button';
      doneBtn.className = 'done-btn';
      doneBtn.disabled = isLocked;
      if (step.done) {
        doneBtn.innerHTML = '<span aria-hidden="true">💮</span><span>できた</span>';
      } else if (isFutureLocked) {
        doneBtn.innerHTML = '<span aria-hidden="true">🔒</span><span>まってね</span>';
      } else {
        doneBtn.innerHTML = '<span aria-hidden="true">○</span><span>できた！</span>';
      }
      doneBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isLocked) toggleStepDone(schedule, step.id);
      });
      actions.appendChild(doneBtn);

      card.appendChild(numCol);
      card.appendChild(visual);
      card.appendChild(body);
      card.appendChild(actions);

      dom.stepListView.appendChild(card);
    });
  }

  function renderSingleView(schedule) {
    dom.singleStepView.innerHTML = '';

    if (schedule.steps.length === 0) {
      dom.singleStepView.innerHTML = '<div class="complete-card"><p style="font-size:1.2rem;font-weight:700;margin:0;">てじゅんが ありません。</p></div>';
      return;
    }

    const currentIdx = schedule.steps.findIndex((s) => !s.done);
    if (currentIdx === -1) return; // 完了画面が出る

    const step = schedule.steps[currentIdx];
    const isTrain = Boolean(state.settings.trainMode);
    const lineCode = state.settings.trainLineCode || 'JB';

    // ドット進捗
    const dots = document.createElement('div');
    dots.className = 'single-dots';
    schedule.steps.forEach((s, i) => {
      const dot = document.createElement('div');
      dot.className = 'single-dot';
      if (s.done) dot.classList.add('is-done');
      if (i === currentIdx) dot.classList.add('is-current');
      dot.textContent = s.done ? '✓' : (isTrain ? `${lineCode}${i + 1}` : String(i + 1));
      dots.appendChild(dot);
    });
    dom.singleStepView.appendChild(dots);

    // メインカード
    const card = document.createElement('section');
    card.className = 'single-card';

    const topRow = document.createElement('div');
    topRow.className = 'single-top-row';

    if (isTrain) {
      const stationHead = document.createElement('div');
      stationHead.className = 'single-station-header';
      stationHead.appendChild(createStationBadge(currentIdx, true));
      const badge = document.createElement('div');
      badge.className = 'single-step-badge';
      badge.textContent = `${currentIdx + 1} えきめ（ぜんぶで ${schedule.steps.length} えき）`;
      stationHead.appendChild(badge);
      topRow.appendChild(stationHead);
    } else {
      const badge = document.createElement('div');
      badge.className = 'single-step-badge';
      badge.textContent = `${currentIdx + 1} ばんめ（ぜんぶで ${schedule.steps.length} こ）`;
      topRow.appendChild(badge);
    }

    if (state.settings.speech) {
      const speechUsed = isStepSpeechUsed(step.id);
      const speakBtn = document.createElement('button');
      speakBtn.type = 'button';
      speakBtn.className = 'speak-btn';
      speakBtn.disabled = speechUsed;
      speakBtn.setAttribute('aria-label', speechUsed ? 'よみあげずみ' : 'よみあげる');
      speakBtn.textContent = speechUsed ? '🔇' : '🔊';
      speakBtn.addEventListener('click', () => {
        speakStep(step);
      });
      topRow.appendChild(speakBtn);
    }

    const visual = createVisualNode(step, 'single-visual');

    const title = document.createElement('h1');
    title.className = 'single-text';
    title.textContent = step.text;

    card.appendChild(topRow);
    card.appendChild(visual);

    if (isTrain) {
      const signBox = document.createElement('div');
      signBox.className = 'single-station-sign';
      signBox.appendChild(title);
      if (step.hint) {
        const hint = document.createElement('p');
        hint.className = 'single-hint';
        hint.textContent = step.hint;
        signBox.appendChild(hint);
      }
      const bar = document.createElement('div');
      bar.className = 'station-sign-bar';
      const point = document.createElement('span');
      point.className = 'station-sign-point';
      bar.appendChild(point);
      signBox.appendChild(bar);

      const neighbors = document.createElement('div');
      neighbors.className = 'station-sign-neighbors';
      const prevName = currentIdx > 0 ? schedule.steps[currentIdx - 1].text : 'しゅっぱつ';
      const nextName = currentIdx < schedule.steps.length - 1 ? schedule.steps[currentIdx + 1].text : 'しゅうてん';

      const prevEl = document.createElement('span');
      prevEl.className = 'neighbor-prev';
      prevEl.textContent = `◀ ${prevName}`;

      const nextEl = document.createElement('span');
      nextEl.className = 'neighbor-next';
      nextEl.textContent = `${nextName} ▶`;

      neighbors.append(prevEl, nextEl);
      signBox.appendChild(neighbors);
      card.appendChild(signBox);
    } else {
      card.appendChild(title);
      if (step.hint) {
        const hint = document.createElement('p');
        hint.className = 'single-hint';
        hint.textContent = step.hint;
        card.appendChild(hint);
      }
    }

    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'single-done-btn';
    doneBtn.innerHTML = '<span aria-hidden="true">✓</span><span>できた！</span>';
    doneBtn.addEventListener('click', () => {
      toggleStepDone(schedule, step.id);
    });
    card.appendChild(doneBtn);

    dom.singleStepView.appendChild(card);

    // フッター（つぎの予告のみ・児童の戻し遊び防止）
    const nextStep = schedule.steps.slice(currentIdx + 1).find((s) => !s.done);
    if (nextStep) {
      const footerRow = document.createElement('div');
      footerRow.className = 'single-footer-row';
      const preview = document.createElement('div');
      preview.className = 'single-next-preview';
      const label = document.createElement('span');
      label.textContent = state.settings.trainMode ? 'つぎの えき：' : 'つぎ：';
      const thumb = createVisualNode(nextStep, 'single-next-thumb');
      const txt = document.createElement('span');
      txt.textContent = nextStep.text;
      preview.appendChild(label);
      preview.appendChild(thumb);
      preview.appendChild(txt);
      footerRow.appendChild(preview);
      dom.singleStepView.appendChild(footerRow);
    }
  }

  function renderCompleteView(schedule) {
    if (state.settings.trainMode) {
      const lineCode = state.settings.trainLineCode || 'JB';
      dom.completeBadge.innerHTML = `
        <div class="complete-station-sign"><span class="complete-station-code">${lineCode}</span><span>しゅうてん</span></div>
        <div>
          <svg viewBox="0 0 128 56" width="160" height="70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="4" y="8" width="108" height="36" rx="8" fill="#d90429" stroke="#1f2328" stroke-width="3"/>
            <path d="M96 8 H112 Q122 8 122 22 V36 Q122 44 112 44 H96 Z" fill="#1f2328"/>
            <rect x="12" y="16" width="20" height="12" rx="3" fill="#e0f2fe"/>
            <rect x="38" y="16" width="20" height="12" rx="3" fill="#e0f2fe"/>
            <rect x="64" y="16" width="20" height="12" rx="3" fill="#e0f2fe"/>
            <path d="M100 14 H112 Q117 14 117 22 V28 H100 Z" fill="#e0f2fe"/>
            <rect x="6" y="33" width="92" height="4" fill="#eab308"/>
            <circle cx="116" cy="37" r="3.5" fill="#fef08a"/>
            <circle cx="28" cy="47" r="6" fill="#1f2328"/>
            <circle cx="48" cy="47" r="6" fill="#1f2328"/>
            <circle cx="84" cy="47" r="6" fill="#1f2328"/>
            <circle cx="104" cy="47" r="6" fill="#1f2328"/>
          </svg>
        </div>`;
      dom.completeHeading.textContent = 'しゅうてん とうちゃく！';
      dom.completeSubText.textContent = `「${schedule.title}」ぜんぶ できたね！`;
    } else {
      dom.completeBadge.textContent = '💮';
      dom.completeHeading.textContent = 'ぜんぶ できたね！';
      dom.completeSubText.textContent = `「${schedule.title}」が おわりました！`;
    }
    if (schedule.nextActivity && schedule.nextActivity.trim()) {
      dom.nextActivityText.textContent = schedule.nextActivity;
      dom.nextActivityBox.classList.remove('hidden');
    } else {
      dom.nextActivityBox.classList.add('hidden');
    }
  }

  function renderApp() {
    const schedule = getActiveSchedule();
    applyBodyClasses(schedule);
    renderTabs();
    renderProgress(schedule);

    dom.btnModeList.setAttribute('aria-pressed', String(state.viewMode === 'list'));
    dom.btnModeSingle.setAttribute('aria-pressed', String(state.viewMode === 'single'));

    const allDone = schedule.steps.length > 0 && schedule.steps.every((s) => s.done);

    if (allDone && !suppressCompleteScreen) {
      dom.stepListView.classList.add('hidden');
      dom.singleStepView.classList.add('hidden');
      dom.completeView.classList.remove('hidden');
      renderCompleteView(schedule);
    } else if (state.viewMode === 'single') {
      dom.stepListView.classList.add('hidden');
      dom.completeView.classList.add('hidden');
      dom.singleStepView.classList.remove('hidden');
      renderSingleView(schedule);
    } else {
      dom.singleStepView.classList.add('hidden');
      dom.completeView.classList.add('hidden');
      dom.stepListView.classList.remove('hidden');
      renderListView(schedule);
    }
  }

  /* =========================================================
     長押し（先生モード起動）
     ========================================================= */
  function setupTeacherHoldButton() {
    let holdStart = 0;
    let rafId = null;
    let openedByHold = false;

    const resetRing = () => {
      cancelAnimationFrame(rafId);
      rafId = null;
      holdStart = 0;
      dom.btnTeacherMode.classList.remove('holding');
      dom.holdRingProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE);
    };

    const tick = (now) => {
      if (!holdStart) return;
      const elapsed = now - holdStart;
      const ratio = Math.min(1, elapsed / HOLD_DURATION_MS);
      dom.holdRingProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - ratio));
      if (ratio >= 1) {
        openedByHold = true;
        resetRing();
        tryOpenTeacherModal();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    dom.btnTeacherMode.addEventListener('pointerdown', (e) => {
      if (e.button && e.button !== 0) return;
      e.preventDefault();
      openedByHold = false;
      holdStart = performance.now();
      dom.btnTeacherMode.classList.add('holding');
      rafId = requestAnimationFrame(tick);
    });

    const cancelHold = (showHint) => {
      if (holdStart && !openedByHold && showHint) {
        showToast('せんせいモードは 1.5びょう ながおし でひらきます');
      }
      resetRing();
    };

    dom.btnTeacherMode.addEventListener('pointerup', () => cancelHold(true));
    dom.btnTeacherMode.addEventListener('pointercancel', () => cancelHold(false));
    dom.btnTeacherMode.addEventListener('pointerleave', () => cancelHold(false));
    dom.btnTeacherMode.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /* =========================================================
     4けたパスワード（PIN）認証
     ========================================================= */
  function hasTeacherPin() {
    return typeof state.settings.teacherPin === 'string' && /^\d{4}$/.test(state.settings.teacherPin);
  }

  function tryOpenTeacherModal() {
    if (hasTeacherPin()) {
      openPinModal();
    } else {
      openTeacherModal();
    }
  }

  function renderPinDots(isError = false) {
    const dots = dom.pinDots.querySelectorAll('.pin-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('filled', !isError && idx < pinBuffer.length);
      dot.classList.toggle('error', isError);
    });
  }

  function openPinModal() {
    pinBuffer = '';
    dom.pinError.textContent = '';
    dom.pinDots.classList.remove('shake');
    renderPinDots(false);
    dom.pinModal.classList.remove('hidden');
  }

  function closePinModal() {
    pinBuffer = '';
    dom.pinModal.classList.add('hidden');
  }

  function handlePinDigit(digit) {
    if (dom.pinModal.classList.contains('hidden')) return;
    if (pinBuffer.length >= 4) return;
    pinBuffer += String(digit);
    dom.pinError.textContent = '';
    renderPinDots(false);

    if (pinBuffer.length === 4) {
      if (pinBuffer === state.settings.teacherPin) {
        closePinModal();
        openTeacherModal();
      } else {
        playUndoSound();
        dom.pinError.textContent = 'パスワードが ちがいます';
        renderPinDots(true);
        dom.pinDots.classList.remove('shake');
        void dom.pinDots.offsetWidth;
        dom.pinDots.classList.add('shake');
        setTimeout(() => {
          pinBuffer = '';
          renderPinDots(false);
        }, 420);
      }
    }
  }

  function handlePinBackspace() {
    if (dom.pinModal.classList.contains('hidden')) return;
    if (pinBuffer.length === 0) return;
    pinBuffer = pinBuffer.slice(0, -1);
    dom.pinError.textContent = '';
    renderPinDots(false);
  }

  /* =========================================================
     せんせいモード（編集・設定）
     ========================================================= */
  function openTeacherModal() {
    editingScheduleId = state.activeScheduleId;
    switchTeacherTab('steps');
    renderTeacherModal();
    dom.teacherModal.classList.remove('hidden');
  }

  function closeTeacherModal() {
    dom.teacherModal.classList.add('hidden');
    commitState();
  }

  function switchTeacherTab(tabName) {
    dom.teacherTabs.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    dom.panelSteps.classList.toggle('hidden', tabName !== 'steps');
    dom.panelSchedules.classList.toggle('hidden', tabName !== 'schedules');
    dom.panelSettings.classList.toggle('hidden', tabName !== 'settings');
    dom.panelBackup.classList.toggle('hidden', tabName !== 'backup');
  }

  function renderTeacherModal() {
    // セレクトボックス
    dom.editScheduleSelect.innerHTML = '';
    state.schedules.forEach((sch) => {
      const opt = document.createElement('option');
      opt.value = sch.id;
      opt.textContent = `${sch.icon || ''} ${sch.title}`.trim();
      dom.editScheduleSelect.appendChild(opt);
    });
    if (!state.schedules.some((s) => s.id === editingScheduleId)) {
      editingScheduleId = state.schedules[0].id;
    }
    dom.editScheduleSelect.value = editingScheduleId;

    const sch = getScheduleById(editingScheduleId);
    dom.metaScheduleTitle.value = sch.title;
    dom.metaScheduleIcon.value = sch.icon;
    dom.metaScheduleTheme.value = sch.theme;
    dom.metaNextActivity.value = sch.nextActivity || '';

    renderEditStepList(sch);
    renderScheduleManageList();
    renderSettingsPanel();
  }

  function updateEditStepOrderNumbers() {
    const rows = dom.editStepList.querySelectorAll('.edit-step-row');
    rows.forEach((r, i) => {
      const badge = r.querySelector('.edit-step-order');
      if (badge) badge.textContent = String(i + 1);
    });
  }

  function attachStepReorderHandler(row, handle, schedule) {
    const scrollContainer = dom.teacherModal.querySelector('.teacher-body');
    let holdTimer = null;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let lastClientY = 0;
    let offsetY = 0;
    let ghost = null;
    let autoScrollRaf = null;
    let activePointerId = null;

    const stopAutoScroll = () => {
      if (autoScrollRaf) {
        cancelAnimationFrame(autoScrollRaf);
        autoScrollRaf = null;
      }
    };

    const repositionRowByY = (clientY) => {
      const siblings = Array.from(dom.editStepList.querySelectorAll('.edit-step-row')).filter((el) => el !== row);
      let insertBeforeEl = null;
      for (const sib of siblings) {
        const rect = sib.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (clientY < midY) {
          insertBeforeEl = sib;
          break;
        }
      }
      if (insertBeforeEl) {
        if (row.nextSibling !== insertBeforeEl) {
          dom.editStepList.insertBefore(row, insertBeforeEl);
          updateEditStepOrderNumbers();
        }
      } else if (dom.editStepList.lastElementChild !== row) {
        dom.editStepList.appendChild(row);
        updateEditStepOrderNumbers();
      }
    };

    const runAutoScroll = () => {
      if (!isDragging || !scrollContainer) return;
      const rect = scrollContainer.getBoundingClientRect();
      const edge = 64;
      let delta = 0;
      if (lastClientY < rect.top + edge) {
        delta = -Math.ceil(((rect.top + edge - lastClientY) / edge) * 12);
      } else if (lastClientY > rect.bottom - edge) {
        delta = Math.ceil(((lastClientY - (rect.bottom - edge)) / edge) * 12);
      }
      if (delta !== 0) {
        scrollContainer.scrollTop += delta;
        repositionRowByY(lastClientY);
      }
      autoScrollRaf = requestAnimationFrame(runAutoScroll);
    };

    const preventTouchScroll = (ev) => {
      if (isDragging) ev.preventDefault();
    };

    const startDrag = (clientY) => {
      isDragging = true;
      lastClientY = clientY;
      const rect = row.getBoundingClientRect();
      offsetY = clientY - rect.top;

      if (navigator.vibrate) {
        try { navigator.vibrate(18); } catch (e) {}
      }

      ghost = row.cloneNode(true);
      ghost.classList.add('drag-ghost');
      ghost.style.left = `${rect.left}px`;
      ghost.style.top = `${rect.top}px`;
      ghost.style.width = `${rect.width}px`;
      document.body.appendChild(ghost);

      row.classList.add('is-drag-placeholder');
      window.addEventListener('touchmove', preventTouchScroll, { passive: false });
      autoScrollRaf = requestAnimationFrame(runAutoScroll);
    };

    const cleanupListeners = () => {
      clearTimeout(holdTimer);
      holdTimer = null;
      stopAutoScroll();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('touchmove', preventTouchScroll);
    };

    const onPointerMove = (e) => {
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      if (!isDragging) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) {
          cleanupListeners();
        }
        return;
      }
      e.preventDefault();
      lastClientY = e.clientY;
      if (ghost) {
        ghost.style.top = `${e.clientY - offsetY}px`;
      }
      repositionRowByY(e.clientY);
    };

    const onPointerUp = (e) => {
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      const wasDragging = isDragging;
      isDragging = false;
      activePointerId = null;
      cleanupListeners();

      if (ghost) {
        ghost.remove();
        ghost = null;
      }
      row.classList.remove('is-drag-placeholder');

      if (wasDragging) {
        const newIds = Array.from(dom.editStepList.querySelectorAll('.edit-step-row')).map((el) => el.dataset.stepId);
        const stepMap = new Map(schedule.steps.map((s) => [s.id, s]));
        const reordered = newIds.map((id) => stepMap.get(id)).filter(Boolean);
        if (reordered.length === schedule.steps.length) {
          const changed = reordered.some((s, i) => s.id !== schedule.steps[i].id);
          schedule.steps = reordered;
          saveStateToStorage(state);
          renderEditStepList(schedule);
          if (changed) {
            playDoneSound();
          }
        }
      }
    };

    row.addEventListener('pointerdown', (e) => {
      if (e.button && e.button !== 0) return;
      const onHandle = Boolean(e.target.closest('.drag-handle'));
      if (!onHandle && e.target.closest('button')) return;

      activePointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      lastClientY = e.clientY;

      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);

      if (onHandle) {
        e.preventDefault();
        startDrag(e.clientY);
      } else {
        holdTimer = setTimeout(() => {
          startDrag(lastClientY);
        }, 280);
      }
    });

    row.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('button') || e.target.closest('.drag-handle')) {
        e.preventDefault();
      }
    });
  }

  function renderEditStepList(schedule) {
    dom.editStepList.innerHTML = '';
    if (schedule.steps.length === 0) {
      dom.editStepList.innerHTML = '<p class="panel-hint">手順がまだありません。「＋ 手順を追加」から作成してください。</p>';
      return;
    }

    schedule.steps.forEach((step, idx) => {
      const row = document.createElement('div');
      row.className = 'edit-step-row';
      row.dataset.stepId = step.id;

      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'drag-handle';
      handle.setAttribute('aria-label', 'ドラッグして じゅんばんを いれかえる');
      handle.title = 'ドラッグして入れ替え';
      handle.textContent = '☰';

      const order = document.createElement('div');
      order.className = 'edit-step-order';
      order.textContent = String(idx + 1);

      const thumb = createVisualNode(step, 'edit-step-thumb');

      const info = document.createElement('div');
      info.className = 'edit-step-info';
      const title = document.createElement('strong');
      title.textContent = step.text;
      info.appendChild(title);
      if (step.hint) {
        const sub = document.createElement('span');
        sub.textContent = step.hint;
        info.appendChild(sub);
      }

      const btns = document.createElement('div');
      btns.className = 'edit-row-btns';

      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'btn btn-secondary btn-sm';
      upBtn.textContent = '↑';
      upBtn.disabled = idx === 0;
      upBtn.title = 'うえへ';
      upBtn.addEventListener('click', () => {
        if (idx === 0) return;
        const tmp = schedule.steps[idx - 1];
        schedule.steps[idx - 1] = schedule.steps[idx];
        schedule.steps[idx] = tmp;
        saveStateToStorage(state);
        renderEditStepList(schedule);
      });

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'btn btn-secondary btn-sm';
      downBtn.textContent = '↓';
      downBtn.disabled = idx === schedule.steps.length - 1;
      downBtn.title = 'したへ';
      downBtn.addEventListener('click', () => {
        if (idx >= schedule.steps.length - 1) return;
        const tmp = schedule.steps[idx + 1];
        schedule.steps[idx + 1] = schedule.steps[idx];
        schedule.steps[idx] = tmp;
        saveStateToStorage(state);
        renderEditStepList(schedule);
      });

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-primary btn-sm';
      editBtn.textContent = '編集';
      editBtn.addEventListener('click', () => openStepEditModal(schedule.id, step.id));

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-ghost btn-sm';
      delBtn.textContent = '削除';
      delBtn.addEventListener('click', () => {
        schedule.steps = schedule.steps.filter((s) => s.id !== step.id);
        saveStateToStorage(state);
        renderEditStepList(schedule);
      });

      btns.append(upBtn, downBtn, editBtn, delBtn);
      row.append(handle, order, thumb, info, btns);
      attachStepReorderHandler(row, handle, schedule);
      dom.editStepList.appendChild(row);
    });
  }

  function renderScheduleManageList() {
    dom.scheduleManageList.innerHTML = '';
    state.schedules.forEach((sch, idx) => {
      const row = document.createElement('div');
      row.className = 'schedule-manage-row';

      const thumb = document.createElement('div');
      thumb.className = 'edit-step-thumb';
      thumb.textContent = sch.icon || '📋';

      const info = document.createElement('div');
      info.className = 'edit-step-info';
      const strong = document.createElement('strong');
      strong.textContent = sch.title;
      const span = document.createElement('span');
      span.textContent = `手順 ${sch.steps.length} こ`;
      info.append(strong, span);

      const btns = document.createElement('div');
      btns.className = 'edit-row-btns';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-primary btn-sm';
      editBtn.textContent = '手順を編集';
      editBtn.addEventListener('click', () => {
        editingScheduleId = sch.id;
        switchTeacherTab('steps');
        renderTeacherModal();
      });

      const dupBtn = document.createElement('button');
      dupBtn.type = 'button';
      dupBtn.className = 'btn btn-secondary btn-sm';
      dupBtn.textContent = 'コピー';
      dupBtn.addEventListener('click', () => {
        const copy = {
          ...sch,
          id: createUid('sch'),
          title: `${sch.title}（コピー）`,
          steps: sch.steps.map((st) => ({ ...st, id: createUid('st'), done: false }))
        };
        state.schedules.splice(idx + 1, 0, copy);
        saveStateToStorage(state);
        renderTeacherModal();
        showToast('手順表をコピーしました');
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-ghost btn-sm';
      delBtn.textContent = '削除';
      delBtn.disabled = state.schedules.length <= 1;
      delBtn.addEventListener('click', () => {
        if (state.schedules.length <= 1) return;
        openConfirm(
          `「${sch.title}」を削除しますか？`,
          'この手順表に登録されている手順がすべて消えます。',
          '削除する',
          () => {
            state.schedules = state.schedules.filter((s) => s.id !== sch.id);
            if (state.activeScheduleId === sch.id) {
              state.activeScheduleId = state.schedules[0].id;
            }
            if (editingScheduleId === sch.id) {
              editingScheduleId = state.schedules[0].id;
            }
            saveStateToStorage(state);
            renderTeacherModal();
          }
        );
      });

      btns.append(editBtn, dupBtn, delBtn);
      row.append(thumb, info, btns);
      dom.scheduleManageList.appendChild(row);
    });
  }

  function renderSettingsPanel() {
    dom.settingTrainMode.checked = Boolean(state.settings.trainMode);
    dom.settingTrainLine.value = state.settings.trainLineCode || 'JB';
    dom.settingTrainLineRow.classList.toggle('hidden', !state.settings.trainMode);
    dom.settingTrainSoundTestRow.classList.toggle('hidden', !state.settings.trainMode);
    dom.settingFontSize.value = state.settings.fontSize;
    dom.settingSequential.checked = Boolean(state.settings.sequential);
    dom.settingLockDone.checked = Boolean(state.settings.lockDone);
    dom.settingSound.checked = Boolean(state.settings.sound);
    dom.settingSpeech.checked = Boolean(state.settings.speech);
    dom.settingSpeechOnceOnly.checked = Boolean(state.settings.speechOnceOnly);
    dom.settingAutoSpeech.checked = Boolean(state.settings.autoSpeech);
    dom.settingCompactDone.checked = Boolean(state.settings.compactDone);

    const pinActive = hasTeacherPin();
    dom.pinStatusText.textContent = pinActive
      ? '現在：4けたパスワード設定中（変更する場合は新しい4けたを入力）'
      : '現在：設定なし（長押しだけで開きます）';
    dom.settingPinInput.value = '';
    dom.btnClearPin.classList.toggle('hidden', !pinActive);
  }

  /* =========================================================
     ステップ編集モーダル（写真リサイズ＆絵文字ピッカー）
     ========================================================= */
  function openStepEditModal(scheduleId, stepId) {
    const sch = getScheduleById(scheduleId);
    const existing = stepId ? sch.steps.find((s) => s.id === stepId) : null;

    editingStepContext = {
      scheduleId,
      stepId: existing ? existing.id : null,
      emoji: existing ? existing.emoji : '⭐',
      image: existing ? existing.image : null
    };

    dom.stepEditTitle.textContent = existing ? '手順を編集' : '手順を追加';
    dom.stepTextInput.value = existing ? existing.text : '';
    dom.stepHintInput.value = existing ? existing.hint : '';
    dom.stepPhotoInput.value = '';
    dom.symbolSearchInput.value = '';
    symbolDeleteMode = false;
    dom.btnToggleSymbolDelete.textContent = '🗑 整理';

    switchPickerTab('symbols');
    renderStepMediaPreview();
    renderSymbolPicker();
    renderEmojiPicker();
    dom.stepEditModal.classList.remove('hidden');
    setTimeout(() => dom.stepTextInput.focus(), 50);
  }

  function switchPickerTab(mode) {
    symbolPickerMode = mode === 'emojis' ? 'emojis' : 'symbols';
    dom.tabPickerSymbols.classList.toggle('active', symbolPickerMode === 'symbols');
    dom.tabPickerEmojis.classList.toggle('active', symbolPickerMode === 'emojis');
    dom.symbolPickerPanel.classList.toggle('hidden', symbolPickerMode !== 'symbols');
    dom.emojiPicker.classList.toggle('hidden', symbolPickerMode !== 'emojis');
  }

  function normalizeKanaForSearch(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
      .replace(/[\s　_-]+/g, '');
  }

  function getAllSymbols() {
    return [...bundledSymbols, ...symbolLibrary];
  }

  function renderSymbolPicker() {
    const all = getAllSymbols();
    const query = normalizeKanaForSearch(dom.symbolSearchInput.value);
    const filtered = query
      ? all.filter((item) => normalizeKanaForSearch(item.name).includes(query))
      : all;

    dom.symbolCountText.textContent = query
      ? `見つかったシンボル：${filtered.length} こ（全 ${all.length} こ）`
      : `登録シンボル：${all.length} こ`;
    dom.btnClearAllSymbols.classList.toggle('hidden', !symbolDeleteMode || symbolLibrary.length === 0);

    dom.symbolPickerGrid.innerHTML = '';

    if (all.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'symbol-empty';
      empty.innerHTML = 'まだシンボルが登録されていません。<br>上の <strong>「🖼️ まとめて追加」</strong> または <strong>「📁 フォルダ追加」</strong> から<br>DROPSのシンボル画像（PNG）を読み込んでください。';
      dom.symbolPickerGrid.appendChild(empty);
      return;
    }

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'symbol-empty';
      empty.textContent = '一致するシンボルが見つかりません。別のことばで検索してみてください。';
      dom.symbolPickerGrid.appendChild(empty);
      return;
    }

    const visible = filtered.slice(0, MAX_VISIBLE_SYMBOLS);
    visible.forEach((sym) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isSelected = editingStepContext && editingStepContext.image === sym.dataUrl;
      btn.className = `symbol-choice${isSelected ? ' selected' : ''}`;
      btn.title = sym.name;

      const img = document.createElement('img');
      img.src = sym.dataUrl;
      img.alt = sym.name;
      img.loading = 'lazy';

      const nameEl = document.createElement('span');
      nameEl.className = 'symbol-choice-name';
      nameEl.textContent = sym.name;

      btn.append(img, nameEl);

      if (symbolDeleteMode && !sym.bundled) {
        const delBadge = document.createElement('span');
        delBadge.className = 'symbol-delete-badge';
        delBadge.textContent = '×';
        btn.appendChild(delBadge);
        btn.addEventListener('click', async () => {
          symbolLibrary = symbolLibrary.filter((s) => s.id !== sym.id);
          await saveSymbolsToStorage(symbolLibrary);
          renderSymbolPicker();
        });
      } else {
        btn.addEventListener('click', () => {
          if (!editingStepContext) return;
          editingStepContext.image = sym.dataUrl;
          renderStepMediaPreview();
          renderSymbolPicker();
          renderEmojiPicker();
        });
      }

      dom.symbolPickerGrid.appendChild(btn);
    });

    if (filtered.length > MAX_VISIBLE_SYMBOLS) {
      const more = document.createElement('div');
      more.className = 'symbol-empty';
      more.textContent = `ほか ${filtered.length - MAX_VISIBLE_SYMBOLS} こあります。上の検索ボックスに名前を入れると絞り込めます。`;
      dom.symbolPickerGrid.appendChild(more);
    }
  }

  function resizeSymbolFile(file, maxEdge = 320) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('読み込み失敗'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('画像解析失敗'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxEdge || height > maxEdge) {
            if (width >= height) {
              height = Math.round((height * maxEdge) / width);
              width = maxEdge;
            } else {
              width = Math.round((width * maxEdge) / height);
              height = maxEdge;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
          resolve(isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function importSymbolFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) =>
      (f.type && f.type.startsWith('image/')) || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name)
    );
    if (files.length === 0) {
      showToast('画像ファイル（PNGなど）が見つかりませんでした');
      return;
    }

    showToast(`${files.length} まいのシンボルを読み込んでいます…`, 4000);

    const existingNames = new Map(symbolLibrary.map((s, idx) => [s.name, idx]));
    let addedCount = 0;

    for (const file of files) {
      try {
        const baseName = file.name.replace(/\.[^.]+$/, '').trim() || 'シンボル';
        const dataUrl = await resizeSymbolFile(file, 320);
        if (existingNames.has(baseName)) {
          symbolLibrary[existingNames.get(baseName)].dataUrl = dataUrl;
        } else {
          symbolLibrary.push({
            id: createUid('sym'),
            name: baseName,
            dataUrl
          });
          existingNames.set(baseName, symbolLibrary.length - 1);
        }
        addedCount++;
      } catch (e) {
        // 読めないファイルはスキップ
      }
    }

    symbolLibrary.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    await saveSymbolsToStorage(symbolLibrary);
    renderSymbolPicker();
    showToast(`${addedCount} このシンボルを登録しました！`);
  }

  function closeStepEditModal() {
    dom.stepEditModal.classList.add('hidden');
    editingStepContext = null;
  }

  function renderStepMediaPreview() {
    if (!editingStepContext) return;
    dom.stepMediaPreview.innerHTML = '';
    if (editingStepContext.image) {
      const img = document.createElement('img');
      img.src = editingStepContext.image;
      img.alt = 'プレビュー';
      dom.stepMediaPreview.appendChild(img);
      dom.btnRemovePhoto.classList.remove('hidden');
    } else {
      dom.stepMediaPreview.textContent = editingStepContext.emoji || '⭐';
      dom.btnRemovePhoto.classList.add('hidden');
    }
  }

  function renderEmojiPicker() {
    dom.emojiPicker.innerHTML = '';
    SCHOOL_EMOJIS.forEach((em) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `emoji-choice${editingStepContext && editingStepContext.emoji === em && !editingStepContext.image ? ' selected' : ''}`;
      btn.textContent = em;
      btn.addEventListener('click', () => {
        if (!editingStepContext) return;
        editingStepContext.emoji = em;
        editingStepContext.image = null;
        renderStepMediaPreview();
        renderEmojiPicker();
      });
      dom.emojiPicker.appendChild(btn);
    });
  }

  function resizeImageFile(file, maxEdge = 480) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('画像データの解析に失敗しました'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxEdge || height > maxEdge) {
            if (width >= height) {
              height = Math.round((height * maxEdge) / width);
              width = maxEdge;
            } else {
              width = Math.round((width * maxEdge) / height);
              height = maxEdge;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function saveStepEdit() {
    if (!editingStepContext) return;
    const text = dom.stepTextInput.value.trim();
    if (!text) {
      showToast('「やること」を入力してください');
      dom.stepTextInput.focus();
      return;
    }

    const sch = getScheduleById(editingStepContext.scheduleId);
    const hint = dom.stepHintInput.value.trim();

    if (editingStepContext.stepId) {
      const target = sch.steps.find((s) => s.id === editingStepContext.stepId);
      if (target) {
        target.text = text;
        target.hint = hint;
        target.emoji = editingStepContext.emoji;
        target.image = editingStepContext.image;
      }
    } else {
      sch.steps.push({
        id: createUid('st'),
        text,
        hint,
        emoji: editingStepContext.emoji,
        image: editingStepContext.image,
        done: false
      });
    }

    saveStateToStorage(state);
    renderEditStepList(sch);
    renderScheduleManageList();
    closeStepEditModal();
    showToast('手順をほぞんしました');
  }

  /* =========================================================
     エクスポート / インポート / 印刷
     ========================================================= */
  function exportBackup() {
    const payload = {
      ...state,
      customSymbols: symbolLibrary
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `tejun-schedule-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('バックアップファイルを保存しました');
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || !Array.isArray(parsed.schedules) || parsed.schedules.length === 0) {
          throw new Error('形式が正しくありません');
        }
        state = normalizeState(parsed);
        if (Array.isArray(parsed.customSymbols)) {
          symbolLibrary = parsed.customSymbols
            .filter((s) => s && typeof s.dataUrl === 'string' && s.dataUrl.startsWith('data:image/'))
            .map((s) => ({
              id: String(s.id || createUid('sym')),
              name: String(s.name || 'シンボル'),
              dataUrl: s.dataUrl
            }));
          await saveSymbolsToStorage(symbolLibrary);
        }
        editingScheduleId = state.activeScheduleId;
        suppressCompleteScreen = false;
        commitState();
        renderTeacherModal();
        showToast('データを読み込みました！');
      } catch (e) {
        showToast('ファイルの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
  }

  /* =========================================================
     イベント結線 & 初期化
     ========================================================= */
  function bindEvents() {
    // 表示モード切替（先生モード内）
    dom.btnModeList.addEventListener('click', () => {
      state.viewMode = 'list';
      commitState();
      showToast('「いちらん」ひょうじ にしました');
    });
    dom.btnModeSingle.addEventListener('click', () => {
      state.viewMode = 'single';
      suppressCompleteScreen = false;
      commitState();
      showToast('「1まいずつ」ひょうじ にしました');
    });

    // 1つもどすボタン（先生モード内）
    dom.btnUndoOne.addEventListener('click', () => {
      const sch = getActiveSchedule();
      let target = null;
      for (let i = sch.steps.length - 1; i >= 0; i--) {
        if (sch.steps[i].done) {
          target = sch.steps[i];
          break;
        }
      }
      if (!target) {
        showToast('もどせる手順がありません');
        return;
      }
      target.done = false;
      spokenStepIds.delete(target.id);
      suppressCompleteScreen = false;
      playUndoSound();
      commitState();
      showToast(`「${target.text}」を 未完了にもどしました`);
    });

    // リセットボタン（先生モード内）
    dom.btnReset.addEventListener('click', () => {
      const sch = getActiveSchedule();
      openConfirm(
        `「${sch.title}」を さいしょから やりなおしますか？`,
        'チェックした「できた」と読み上げ回数を すべて もどします。',
        'やりなおす',
        () => {
          sch.steps.forEach((s) => { s.done = false; });
          clearSpokenForSchedule(sch);
          suppressCompleteScreen = false;
          playUndoSound();
          closeTeacherModal();
          showToast('さいしょに もどしました');
        }
      );
    });

    // 確認モーダル
    dom.btnConfirmCancel.addEventListener('click', closeConfirm);
    dom.btnConfirmOk.addEventListener('click', () => {
      const cb = pendingConfirmCallback;
      closeConfirm();
      if (cb) cb();
    });

    // 先生モード長押し
    setupTeacherHoldButton();

    // PC向けショートカット（Alt+Shift+E で先生モード）＆ パスワードモーダルキーボード入力
    document.addEventListener('keydown', (e) => {
      if (!dom.pinModal.classList.contains('hidden')) {
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          handlePinDigit(e.key);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          handlePinBackspace();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closePinModal();
        }
        return;
      }
      if (e.altKey && e.shiftKey && e.code === 'KeyE') {
        e.preventDefault();
        tryOpenTeacherModal();
      }
    });

    // パスワードモーダルのテンキー操作
    dom.pinKeypad.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-digit]');
      if (!btn) return;
      handlePinDigit(btn.dataset.digit);
    });
    dom.btnPinCancel.addEventListener('click', closePinModal);
    dom.btnPinBackspace.addEventListener('click', handlePinBackspace);

    // 先生モード操作
    dom.btnCloseTeacher.addEventListener('click', closeTeacherModal);
    dom.teacherTabs.forEach((btn) => {
      btn.addEventListener('click', () => switchTeacherTab(btn.dataset.tab));
    });

    dom.editScheduleSelect.addEventListener('change', (e) => {
      editingScheduleId = e.target.value;
      renderTeacherModal();
    });

    dom.metaScheduleTitle.addEventListener('input', (e) => {
      const sch = getScheduleById(editingScheduleId);
      sch.title = e.target.value || 'てじゅんひょう';
      saveStateToStorage(state);
      renderTabs();
    });

    dom.metaScheduleIcon.addEventListener('input', (e) => {
      const sch = getScheduleById(editingScheduleId);
      sch.icon = e.target.value || '📋';
      saveStateToStorage(state);
      renderTabs();
    });

    dom.metaScheduleTheme.addEventListener('change', (e) => {
      const sch = getScheduleById(editingScheduleId);
      sch.theme = e.target.value;
      saveStateToStorage(state);
      if (sch.id === state.activeScheduleId) applyBodyClasses(sch);
    });

    dom.metaNextActivity.addEventListener('input', (e) => {
      const sch = getScheduleById(editingScheduleId);
      sch.nextActivity = e.target.value;
      saveStateToStorage(state);
    });

    dom.btnAddStep.addEventListener('click', () => {
      openStepEditModal(editingScheduleId, null);
    });

    // 別の手順表からコピー
    dom.btnOpenCopySteps.addEventListener('click', () => {
      const targetSch = getScheduleById(editingScheduleId);
      const sources = state.schedules.filter((s) => s.id !== editingScheduleId);
      if (sources.length === 0) {
        showToast('コピー元の手順表がありません');
        return;
      }
      dom.copyStepsDesc.textContent = `「${targetSch.title}」へ手順（写真・シンボル含む）をコピーします。`;
      dom.copySourceSelect.innerHTML = '';
      sources.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.icon || ''} ${s.title}（${s.steps.length} こ）`.trim();
        dom.copySourceSelect.appendChild(opt);
      });
      dom.copyModeSelect.value = 'replace';
      dom.copyReverseCheck.checked = false;
      dom.copyStepsModal.classList.remove('hidden');
    });

    dom.btnCancelCopySteps.addEventListener('click', () => {
      dom.copyStepsModal.classList.add('hidden');
    });

    dom.btnDoCopySteps.addEventListener('click', () => {
      const targetSch = getScheduleById(editingScheduleId);
      const sourceSch = state.schedules.find((s) => s.id === dom.copySourceSelect.value);
      if (!targetSch || !sourceSch) {
        dom.copyStepsModal.classList.add('hidden');
        return;
      }
      let copied = sourceSch.steps.map((st) => ({
        ...st,
        id: createUid('st'),
        done: false
      }));
      if (dom.copyReverseCheck.checked) {
        copied = copied.reverse();
      }
      if (dom.copyModeSelect.value === 'replace') {
        targetSch.steps = copied;
      } else {
        targetSch.steps.push(...copied);
      }
      clearSpokenForSchedule(targetSch);
      saveStateToStorage(state);
      renderEditStepList(targetSch);
      renderScheduleManageList();
      dom.copyStepsModal.classList.add('hidden');
      showToast(`「${sourceSch.title}」の手順（${copied.length} こ）をコピーしました！`);
    });

    dom.btnAddSchedule.addEventListener('click', () => {
      const newSch = {
        id: createUid('sch'),
        title: 'あたらしい じゅんび',
        icon: '📋',
        theme: 'green',
        nextActivity: '',
        steps: [
          { id: createUid('st'), text: 'てじゅん 1', hint: '', emoji: '⭐', image: null, done: false }
        ]
      };
      state.schedules.push(newSch);
      editingScheduleId = newSch.id;
      saveStateToStorage(state);
      switchTeacherTab('steps');
      renderTeacherModal();
      showToast('あたらしい手順表を追加しました');
    });

    // ステップ編集モーダル
    dom.btnCancelStepEdit.addEventListener('click', closeStepEditModal);
    dom.btnCancelStepEditFooter.addEventListener('click', closeStepEditModal);
    dom.btnSaveStepEdit.addEventListener('click', saveStepEdit);

    dom.stepPhotoInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file || !editingStepContext) return;
      try {
        const dataUrl = await resizeImageFile(file, 480);
        editingStepContext.image = dataUrl;
        renderStepMediaPreview();
        renderEmojiPicker();
      } catch (err) {
        showToast('写真の読み込みに失敗しました');
      }
    });

    dom.btnRemovePhoto.addEventListener('click', () => {
      if (!editingStepContext) return;
      editingStepContext.image = null;
      renderStepMediaPreview();
      renderSymbolPicker();
      renderEmojiPicker();
    });

    // DROPS / シンボル集ピッカー操作
    dom.tabPickerSymbols.addEventListener('click', () => switchPickerTab('symbols'));
    dom.tabPickerEmojis.addEventListener('click', () => switchPickerTab('emojis'));
    dom.symbolSearchInput.addEventListener('input', renderSymbolPicker);

    dom.symbolFilesInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        await importSymbolFiles(e.target.files);
      }
      e.target.value = '';
    });

    dom.symbolFolderInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        await importSymbolFiles(e.target.files);
      }
      e.target.value = '';
    });

    dom.btnToggleSymbolDelete.addEventListener('click', () => {
      symbolDeleteMode = !symbolDeleteMode;
      dom.btnToggleSymbolDelete.textContent = symbolDeleteMode ? '✓ 整理おわり' : '🗑 整理';
      renderSymbolPicker();
    });

    dom.btnClearAllSymbols.addEventListener('click', () => {
      openConfirm(
        '登録したシンボルをすべて削除しますか？',
        'シンボル集から削除されます（すでに手順へ設定済みの画像はそのまま残ります）。',
        'すべて削除',
        async () => {
          symbolLibrary = [];
          symbolDeleteMode = false;
          dom.btnToggleSymbolDelete.textContent = '🗑 整理';
          await saveSymbolsToStorage(symbolLibrary);
          renderSymbolPicker();
          showToast('シンボル集を空にしました');
        }
      );
    });

    // 設定変更
    dom.settingTrainMode.addEventListener('change', (e) => {
      state.settings.trainMode = e.target.checked;
      dom.settingTrainLineRow.classList.toggle('hidden', !state.settings.trainMode);
      dom.settingTrainSoundTestRow.classList.toggle('hidden', !state.settings.trainMode);
      commitState();
    });
    dom.settingTrainLine.addEventListener('change', (e) => {
      state.settings.trainLineCode = e.target.value;
      commitState();
    });
    dom.btnTestTrainChime.addEventListener('click', () => {
      playTrainStepChime();
    });
    dom.btnTestTrainArrival.addEventListener('click', () => {
      playTrainArrivalMelody();
    });
    dom.settingFontSize.addEventListener('change', (e) => {
      state.settings.fontSize = e.target.value;
      commitState();
    });
    dom.settingSequential.addEventListener('change', (e) => {
      state.settings.sequential = e.target.checked;
      commitState();
    });
    dom.settingLockDone.addEventListener('change', (e) => {
      state.settings.lockDone = e.target.checked;
      commitState();
    });
    dom.settingSound.addEventListener('change', (e) => {
      state.settings.sound = e.target.checked;
      commitState();
    });
    dom.settingSpeech.addEventListener('change', (e) => {
      state.settings.speech = e.target.checked;
      commitState();
    });
    dom.settingSpeechOnceOnly.addEventListener('change', (e) => {
      state.settings.speechOnceOnly = e.target.checked;
      commitState();
    });
    dom.settingAutoSpeech.addEventListener('change', (e) => {
      state.settings.autoSpeech = e.target.checked;
      commitState();
    });
    dom.settingCompactDone.addEventListener('change', (e) => {
      state.settings.compactDone = e.target.checked;
      commitState();
    });

    // 4けたパスワード設定・解除
    dom.settingPinInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    });
    dom.btnSavePin.addEventListener('click', () => {
      const val = dom.settingPinInput.value.trim();
      if (!/^\d{4}$/.test(val)) {
        showToast('数字4けた（例：1234）を入力してください');
        dom.settingPinInput.focus();
        return;
      }
      state.settings.teacherPin = val;
      commitState();
      renderSettingsPanel();
      showToast('4けたのパスワードを設定しました（忘れないようメモしてください）', 3200);
    });
    dom.btnClearPin.addEventListener('click', () => {
      state.settings.teacherPin = '';
      commitState();
      renderSettingsPanel();
      showToast('パスワードを解除しました');
    });

    // バックアップ & 印刷 & 初期化
    dom.btnExportData.addEventListener('click', exportBackup);
    dom.inputImportData.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) importBackup(file);
      e.target.value = '';
    });

    dom.btnPrintSchedule.addEventListener('click', () => {
      state.activeScheduleId = editingScheduleId;
      state.viewMode = 'list';
      suppressCompleteScreen = true;
      closeTeacherModal();
      setTimeout(() => window.print(), 200);
    });

    dom.btnFactoryReset.addEventListener('click', () => {
      openConfirm(
        'すべて初期状態にもどしますか？',
        '登録した写真や手順表はすべて消え、最初の「あさ・かえりの じゅんび」に戻ります。',
        '初期状態にもどす',
        () => {
          state = createDefaultState();
          spokenStepIds.clear();
          editingScheduleId = state.activeScheduleId;
          suppressCompleteScreen = false;
          commitState();
          renderTeacherModal();
          showToast('初期状態にもどしました');
        }
      );
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  function applyUrlParams() {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    const line = params.get('line');
    if (mode === 'train') {
      state.settings.trainMode = true;
    } else if (mode === 'normal') {
      state.settings.trainMode = false;
    }
    if (line && ['JB', 'JA', 'JC', 'JD', 'JF', 'JK'].includes(line.toUpperCase())) {
      state.settings.trainLineCode = line.toUpperCase();
    }
  }

  async function init() {
    state = await loadStateFromStorage();
    applyUrlParams();
    symbolLibrary = await loadSymbolsFromStorage();
    bundledSymbols = await loadBundledSymbols();
    saveStateToStorage(state);
    bindEvents();
    renderApp();
    registerServiceWorker();
  }

  init();
})();
