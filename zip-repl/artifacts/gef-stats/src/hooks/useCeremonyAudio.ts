import { useEffect, useRef, useState, useCallback } from "react";

/* ─── Speech text humanization ─────────────────────────────────
   Browser SpeechSynthesis tends to spell out ALL-CAPS words
   letter-by-letter ("RAHUL" → "R-A-H-U-L") and mangles unfamiliar
   names. This helper title-cases shouted words, expands troublesome
   consonant clusters into hint-syllables, and adds gentle pauses so
   the engine treats each name as a word, not a code. */

// Common Indian-name phonetic hints — keys are lowercase, values are
// re-spellings that nudge the TTS engine toward correct pronunciation.
const PHONETIC_HINTS: Record<string, string> = {
  rahul: "Rahool",
  raghav: "Rag-uv",
  rishabh: "Rishab",
  priya: "Pree-ya",
  aakash: "Aakaash",
  akash: "Akaash",
  arjun: "Ar-jun",
  rohit: "Roh-it",
  virat: "Vee-rat",
  kohli: "Kohlee",
  dhoni: "Doh-nee",
  pant: "Punt",
  jadeja: "Ja-day-ja",
  shubman: "Shub-mun",
  shreyas: "Shray-us",
  ishan: "Ee-shan",
  ravichandran: "Ravi-chun-drun",
  ravindra: "Rav-een-dra",
  ashwin: "Ush-win",
  yuvraj: "Yoov-raj",
  bumrah: "Boom-rah",
  hardik: "Har-dik",
  pandya: "Pun-dya",
  surya: "Soor-ya",
  suryakumar: "Soor-ya-koomar",
  yadav: "Ya-duv",
  sanju: "Sun-joo",
  samson: "Sam-sun",
  axar: "Uk-sar",
  patel: "Pa-tel",
  klrahul: "K L Rahool",
  kuldeep: "Kool-deep",
  chahal: "Cha-hul",
  shami: "Sha-mee",
  siraj: "See-raj",
  gill: "Gill",
};

export function humanizeForSpeech(text: string): string {
  if (!text) return text;
  return text
    .split(/(\s+|[.,!?;:…]+)/)
    .map(token => {
      if (!token || /^\s+$/.test(token) || /^[.,!?;:…]+$/.test(token)) return token;
      // Title-case any token that's all uppercase letters of length 4+
      // (TTS spells these otherwise: "RAGHAV" → "R-A-G-H-A-V").
      if (token.length >= 4 && /^[A-Z]+$/.test(token)) {
        token = token.charAt(0) + token.slice(1).toLowerCase();
      }
      // Apply phonetic hint if we have one for the lower-cased name.
      const lower = token.toLowerCase();
      if (PHONETIC_HINTS[lower]) return PHONETIC_HINTS[lower];
      return token;
    })
    .join("");
}

/* ─── Slow ambient orchestral chord progression ────────────────
   Uses Web Audio API to synthesize a warm, slow pad with chord
   progression — a substitute for licensed orchestral music.
   Plays continuously while enabled, low volume so narration cuts
   through. */

type ChordSet = number[][]; // each chord is array of frequencies (Hz)

// Simple I-vi-IV-V-ish slow progression in C, voiced as triads + 7ths
const CHORDS_AWARDS: ChordSet = [
  [130.81, 196.0, 261.63, 329.63, 392.0],   // Cmaj7
  [110.0, 164.81, 220.0, 261.63, 329.63],   // Am7
  [174.61, 261.63, 349.23, 440.0, 523.25],  // Fmaj7
  [196.0, 246.94, 293.66, 392.0, 493.88],   // G7
];

const CHORDS_RANKINGS: ChordSet = [
  [98.0, 146.83, 196.0, 246.94, 293.66],    // G low
  [110.0, 164.81, 220.0, 277.18, 329.63],   // Am
  [130.81, 174.61, 220.0, 261.63, 349.23],  // F/C
  [146.83, 220.0, 293.66, 369.99, 440.0],   // D-ish suspense
];

const CHORDS_WINNER: ChordSet = [
  [130.81, 196.0, 261.63, 329.63, 392.0, 523.25], // Cmaj triumphant
  [146.83, 220.0, 293.66, 369.99, 440.0, 587.33], // D7
  [164.81, 246.94, 329.63, 392.0, 493.88, 659.25],// E7
  [174.61, 261.63, 349.23, 440.0, 523.25, 698.46],// Fmaj
];

type Mode = "off" | "awards" | "rankings" | "winner";

interface AudioController {
  ctx: AudioContext;
  masterGain: GainNode;
  voices: { osc: OscillatorNode; gain: GainNode }[];
  filter: BiquadFilterNode;
  scheduler: number | null;
  chordIdx: number;
}

export function useCeremonyAudio() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem("ceremony_audio") !== "off";
    } catch {
      return true;
    }
  });
  const [mode, setMode] = useState<Mode>("off");
  const ctrlRef = useRef<AudioController | null>(null);
  const modeRef = useRef<Mode>("off");
  const enabledRef = useRef(enabled);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Lazy init of AudioContext on first user gesture
  const ensureCtx = useCallback(() => {
    if (ctrlRef.current) return ctrlRef.current;
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const ctx = new Ctx();
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1200;
      filter.Q.value = 0.6;
      filter.connect(masterGain);
      masterGain.connect(ctx.destination);
      const ctrl: AudioController = { ctx, masterGain, voices: [], filter, scheduler: null, chordIdx: 0 };
      ctrlRef.current = ctrl;
      return ctrl;
    } catch {
      return null;
    }
  }, []);

  const stopVoices = useCallback(() => {
    const ctrl = ctrlRef.current;
    if (!ctrl) return;
    const t = ctrl.ctx.currentTime;
    for (const v of ctrl.voices) {
      try {
        v.gain.gain.cancelScheduledValues(t);
        v.gain.gain.setValueAtTime(v.gain.gain.value, t);
        v.gain.gain.linearRampToValueAtTime(0, t + 1.5);
        v.osc.stop(t + 1.6);
      } catch { /* ignore */ }
    }
    ctrl.voices = [];
  }, []);

  const playChord = useCallback((freqs: number[]) => {
    const ctrl = ctrlRef.current;
    if (!ctrl) return;
    stopVoices();
    const t = ctrl.ctx.currentTime;
    const attack = 1.8;
    const sustainLevel = 0.18;
    freqs.forEach((f, i) => {
      // Two oscillators per note for warmth: sine + slightly detuned triangle
      [
        { type: "sine" as OscillatorType, detune: 0 },
        { type: "triangle" as OscillatorType, detune: i % 2 === 0 ? 6 : -6 },
      ].forEach(({ type, detune }) => {
        const osc = ctrl.ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = f;
        osc.detune.value = detune;
        const g = ctrl.ctx.createGain();
        g.gain.value = 0;
        const target = (sustainLevel / freqs.length) * (type === "sine" ? 1 : 0.5);
        g.gain.linearRampToValueAtTime(target, t + attack);
        osc.connect(g);
        g.connect(ctrl.filter);
        osc.start(t);
        ctrl.voices.push({ osc, gain: g });
      });
    });
  }, [stopVoices]);

  const startProgression = useCallback((m: Mode) => {
    const ctrl = ensureCtx();
    if (!ctrl) return;
    if (ctrl.scheduler != null) {
      window.clearInterval(ctrl.scheduler);
      ctrl.scheduler = null;
    }
    ctrl.chordIdx = 0;
    const chords =
      m === "winner" ? CHORDS_WINNER :
      m === "rankings" ? CHORDS_RANKINGS :
      CHORDS_AWARDS;
    // Each chord ≈ 6s (slow). Winner mode slightly slower & richer.
    const intervalMs = m === "winner" ? 7000 : 6000;
    playChord(chords[0]);
    ctrl.scheduler = window.setInterval(() => {
      const c = ctrlRef.current;
      if (!c) return;
      c.chordIdx = (c.chordIdx + 1) % chords.length;
      playChord(chords[c.chordIdx]);
    }, intervalMs);
    // Fade master in
    const t = ctrl.ctx.currentTime;
    ctrl.masterGain.gain.cancelScheduledValues(t);
    ctrl.masterGain.gain.setValueAtTime(ctrl.masterGain.gain.value, t);
    ctrl.masterGain.gain.linearRampToValueAtTime(m === "winner" ? 0.42 : 0.28, t + 2.0);
  }, [ensureCtx, playChord]);

  const stopProgression = useCallback(() => {
    const ctrl = ctrlRef.current;
    if (!ctrl) return;
    if (ctrl.scheduler != null) {
      window.clearInterval(ctrl.scheduler);
      ctrl.scheduler = null;
    }
    const t = ctrl.ctx.currentTime;
    ctrl.masterGain.gain.cancelScheduledValues(t);
    ctrl.masterGain.gain.setValueAtTime(ctrl.masterGain.gain.value, t);
    ctrl.masterGain.gain.linearRampToValueAtTime(0, t + 1.5);
    window.setTimeout(() => stopVoices(), 1700);
  }, [stopVoices]);

  // Public: change mode
  const setMusicMode = useCallback((m: Mode) => {
    if (!enabledRef.current) {
      setMode(m); // remember intent
      return;
    }
    if (modeRef.current === m) return;
    setMode(m);
    if (m === "off") {
      stopProgression();
    } else {
      const ctrl = ensureCtx();
      if (ctrl?.ctx.state === "suspended") ctrl.ctx.resume().catch(() => {});
      startProgression(m);
    }
  }, [ensureCtx, startProgression, stopProgression]);

  /* ─── Speech narration ───────────────────────────────── */
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const speakingRef = useRef(false);
  const spokenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      // Drury-style British male announcer first. Browser TTS cannot
      // actually impersonate Peter Drury (real-person voice cloning needs
      // a paid service like ElevenLabs), but UK English male neural voices
      // get us the closest broadcast feel available locally.
      const priorities = [
        // British neural voices — Ryan/Thomas are the most "broadcast"
        /Microsoft.*Ryan.*Natural/i, /Microsoft.*Thomas.*Natural/i,
        /Microsoft.*Alfie.*Natural/i, /Microsoft.*Elliot.*Natural/i,
        /Microsoft.*Noah.*Natural/i,
        // Google UK male
        /Google.*UK.*English.*Male/i,
        // Apple — Daniel is the classic British male voice
        /Daniel.*Enhanced/i, /Daniel.*\(Enhanced\)/i, /Daniel/i,
        /Oliver/i, /Arthur/i,
        // Microsoft UK basic
        /Microsoft.*George/i, /Microsoft.*Hazel/i,
        // US neural fallbacks
        /Microsoft.*Guy.*Natural/i, /Microsoft.*Davis.*Natural/i,
        /Microsoft.*Brian.*Natural/i, /Microsoft.*Andrew.*Natural/i,
        /Microsoft.*Tony.*Natural/i,
        /Google.*US.*English/i,
        // Indian English voices (best for Indian names)
        /Microsoft.*Prabhat/i, /Microsoft.*Ravi/i, /en-IN.*Male/i, /Rishi/i,
        // Apple US male
        /Aaron.*Enhanced/i, /Alex.*Enhanced/i, /Aaron/i, /Alex/i, /Fred/i, /Tom/i,
        // Microsoft basic
        /Microsoft.*Guy/i, /Microsoft.*Mark/i, /Microsoft.*Brian/i, /Microsoft.*David/i,
        // Generic male fallback — strongly prefer GB
        /en-GB.*Male/i, /en-GB/i, /en-US.*Male/i, /en.*Male/i,
      ];
      for (const re of priorities) {
        const v = voices.find(v => re.test(v.name) || re.test(`${v.lang} ${v.name}`));
        if (v) { voiceRef.current = v; return; }
      }
      voiceRef.current = voices.find(v => v.lang.startsWith("en")) || voices[0] || null;
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }, []);

  const speak = useCallback((text: string, options?: { rate?: number; pitch?: number; force?: boolean; id?: string }) => {
    if (!enabledRef.current) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (options?.id) {
      if (spokenIdsRef.current.has(options.id)) return;
      spokenIdsRef.current.add(options.id);
    }
    try {
      if (options?.force) window.speechSynthesis.cancel();
      // Pre-process the text so the TTS engine reads names as words, not
      // as sequences of letters.
      const processed = humanizeForSpeech(text);
      const utter = new SpeechSynthesisUtterance(processed);
      if (voiceRef.current) utter.voice = voiceRef.current;
      // Drury-style delivery: slightly slower with a deeper, weightier
      // pitch — gives a more dramatic broadcaster feel than the default.
      utter.rate = options?.rate ?? 0.94;
      utter.pitch = options?.pitch ?? 0.92;
      utter.volume = 1.0;
      // Dispatch global events so the looping background music
      // (BackgroundMusicYouTube) can duck under the announcer's voice.
      const fireEnd = () => {
        speakingRef.current = false;
        try { window.dispatchEvent(new Event("ceremony-speech-end")); } catch {}
      };
      utter.onstart = () => {
        speakingRef.current = true;
        try { window.dispatchEvent(new Event("ceremony-speech-start")); } catch {}
      };
      utter.onend = fireEnd;
      utter.onerror = fireEnd;
      window.speechSynthesis.speak(utter);
    } catch { /* ignore */ }
  }, []);

  const cancelSpeech = useCallback(() => {
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    speakingRef.current = false;
    try { window.dispatchEvent(new Event("ceremony-speech-end")); } catch {}
  }, []);

  // Toggle audio system on/off
  const toggleEnabled = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem("ceremony_audio", next ? "on" : "off"); } catch {}
      enabledRef.current = next;
      if (!next) {
        stopProgression();
        cancelSpeech();
      } else {
        const ctrl = ensureCtx();
        if (ctrl?.ctx.state === "suspended") ctrl.ctx.resume().catch(() => {});
        if (modeRef.current !== "off") startProgression(modeRef.current);
      }
      return next;
    });
  }, [stopProgression, cancelSpeech, ensureCtx, startProgression]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelSpeech();
      stopProgression();
      try { ctrlRef.current?.ctx.close(); } catch {}
      ctrlRef.current = null;
    };
  }, [cancelSpeech, stopProgression]);

  // Reset spoken cache when explicitly requested via `forgetSpoken`
  const forgetSpoken = useCallback((prefix?: string) => {
    if (!prefix) { spokenIdsRef.current.clear(); return; }
    for (const id of Array.from(spokenIdsRef.current)) {
      if (id.startsWith(prefix)) spokenIdsRef.current.delete(id);
    }
  }, []);

  /* ─── Dramatic 7-8 s awards-ceremony intro fanfare ─────────
     Synthesised entirely with the Web Audio API so we don't need
     any licensed audio files. Sequence:

       0.0-1.4  s : deep bass rumble + cymbal swell (anticipation)
       1.4-1.6  s : huge orchestral hit (timpani + cymbal crash)
       1.6-3.6  s : brass horn fanfare arpeggio rising into a chord
       3.6-5.0  s : sustained majestic chord with choir-like pad
       5.0-6.2  s : drum-roll crescendo into final climax
       6.2-7.8  s : final triumphant chord with cymbal + reverb tail
  */
  const introScheduledRef = useRef(false);
  const playIntroFanfare = useCallback(() => {
    if (!enabledRef.current) return;
    if (introScheduledRef.current) return;
    const ctrl = ensureCtx();
    if (!ctrl) return;
    if (ctrl.ctx.state === "suspended") ctrl.ctx.resume().catch(() => {});

    /* Temporarily duck the ambient music so the fanfare cuts through. */
    const masterT = ctrl.ctx.currentTime;
    const prevGain = ctrl.masterGain.gain.value;
    ctrl.masterGain.gain.cancelScheduledValues(masterT);
    ctrl.masterGain.gain.setValueAtTime(prevGain, masterT);
    ctrl.masterGain.gain.linearRampToValueAtTime(0.05, masterT + 0.3);
    ctrl.masterGain.gain.setValueAtTime(0.05, masterT + 7.2);
    ctrl.masterGain.gain.linearRampToValueAtTime(prevGain, masterT + 8.0);

    introScheduledRef.current = true;
    window.setTimeout(() => { introScheduledRef.current = false; }, 8200);

    const ctx = ctrl.ctx;
    const t0 = ctx.currentTime + 0.05;

    /* Master fanfare bus with light "concert hall" feel via a delay tap. */
    const fanBus = ctx.createGain();
    fanBus.gain.value = 0.85;
    const delay = ctx.createDelay(0.6);
    delay.delayTime.value = 0.18;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.22;
    fanBus.connect(ctx.destination);
    fanBus.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(ctx.destination);

    /* ---- helpers ---- */
    const note = (
      freq: number,
      start: number,
      dur: number,
      opts: { type?: OscillatorType; vol?: number; detune?: number; attack?: number; release?: number } = {},
    ) => {
      const osc = ctx.createOscillator();
      osc.type = opts.type ?? "sawtooth";
      osc.frequency.value = freq;
      osc.detune.value = opts.detune ?? 0;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(opts.vol ?? 0.18, start + (opts.attack ?? 0.05));
      g.gain.setValueAtTime(opts.vol ?? 0.18, start + dur - (opts.release ?? 0.2));
      g.gain.linearRampToValueAtTime(0, start + dur);
      osc.connect(g); g.connect(fanBus);
      osc.start(start); osc.stop(start + dur + 0.05);
    };

    /* Brass-like voice: detuned saw + square through a low-pass filter. */
    const brass = (freq: number, start: number, dur: number, vol = 0.22) => {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, start);
      filter.frequency.linearRampToValueAtTime(2400, start + 0.25);
      filter.frequency.linearRampToValueAtTime(1500, start + dur);
      filter.Q.value = 6;
      filter.connect(fanBus);
      [
        { type: "sawtooth" as OscillatorType, det: -8, gain: vol },
        { type: "sawtooth" as OscillatorType, det: 8,  gain: vol * 0.85 },
        { type: "square"   as OscillatorType, det: 0,  gain: vol * 0.45 },
      ].forEach(({ type, det, gain }) => {
        const o = ctx.createOscillator();
        o.type = type; o.frequency.value = freq; o.detune.value = det;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(gain, start + 0.06);
        g.gain.setValueAtTime(gain, start + dur - 0.18);
        g.gain.linearRampToValueAtTime(0, start + dur);
        o.connect(g); g.connect(filter);
        o.start(start); o.stop(start + dur + 0.05);
      });
    };

    /* Choir-like sustained pad: sine + triangle, slow attack + vibrato. */
    const choirPad = (freqs: number[], start: number, dur: number, vol = 0.16) => {
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = i % 2 === 0 ? "sine" : "triangle";
        osc.frequency.value = f;
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 4.5 + i * 0.4;
        lfoGain.gain.value = 2.5;
        lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(vol / freqs.length, start + 0.7);
        g.gain.setValueAtTime(vol / freqs.length, start + dur - 0.6);
        g.gain.linearRampToValueAtTime(0, start + dur);
        osc.connect(g); g.connect(fanBus);
        osc.start(start); osc.stop(start + dur + 0.05);
        lfo.start(start); lfo.stop(start + dur + 0.05);
      });
    };

    /* Timpani / kick drum: short, low pitch sweep. */
    const drum = (start: number, vol = 0.55, baseFreq = 90) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq * 2.2, start);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, start + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
      osc.connect(g); g.connect(fanBus);
      osc.start(start); osc.stop(start + 0.6);
      // Click / thump
      const noiseLen = 0.02;
      const buf = ctx.createBuffer(1, ctx.sampleRate * noiseLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const ng = ctx.createGain(); ng.gain.value = vol * 0.6;
      src.connect(ng); ng.connect(fanBus);
      src.start(start);
    };

    /* Cymbal crash: filtered noise burst, sharp decay. */
    const cymbal = (start: number, vol = 0.4, dur = 1.2) => {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const env = Math.pow(1 - i / len, 1.6);
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 5000;
      const g = ctx.createGain(); g.gain.value = vol;
      src.connect(hp); hp.connect(g); g.connect(fanBus);
      src.start(start);
    };

    /* Drum roll: rapid timpani hits ramping up in volume. */
    const drumRoll = (start: number, dur: number) => {
      const hits = 24;
      for (let i = 0; i < hits; i++) {
        const t = start + (i * dur) / hits;
        const v = 0.18 + (i / hits) * 0.45;
        drum(t, v, 70 + (i / hits) * 30);
      }
    };

    /* ────────── 0.0–1.4 s : anticipation rumble + rising swell ─ */
    note(55,  t0,        1.4, { type: "sawtooth", vol: 0.20, attack: 0.5, release: 0.4, detune: -7 });
    note(82,  t0,        1.4, { type: "sawtooth", vol: 0.15, attack: 0.6, release: 0.4, detune: 7  });
    cymbal(t0 + 0.2, 0.22, 1.6);

    /* ────────── 1.4–1.6 s : massive impact ─ */
    drum(t0 + 1.40, 0.85, 60);
    drum(t0 + 1.42, 0.55, 90);
    cymbal(t0 + 1.40, 0.65, 2.0);

    /* ────────── 1.6–3.6 s : brass fanfare arpeggio rising into chord
       Notes (Hz): C4 261.63, E4 329.63, G4 392.0, C5 523.25, G4 392.0, C5 523.25  */
    brass(261.63, t0 + 1.65, 0.30, 0.22);
    brass(329.63, t0 + 1.95, 0.30, 0.22);
    brass(392.00, t0 + 2.25, 0.30, 0.22);
    brass(523.25, t0 + 2.55, 0.55, 0.26);
    /* Held brass triad chord */
    brass(261.63, t0 + 3.10, 0.55, 0.18);
    brass(329.63, t0 + 3.10, 0.55, 0.18);
    brass(392.00, t0 + 3.10, 0.55, 0.18);
    brass(523.25, t0 + 3.10, 0.55, 0.20);

    /* ────────── 3.6–5.0 s : sustained majestic chord + choir pad
       Cmaj9 voicing: C E G B D  */
    choirPad([130.81, 164.81, 196.00, 246.94, 293.66], t0 + 3.55, 1.6, 0.22);
    brass(523.25, t0 + 3.65, 1.4, 0.16);
    brass(659.25, t0 + 3.65, 1.4, 0.13);

    /* ────────── 5.0–6.2 s : drum roll crescendo ─ */
    drumRoll(t0 + 5.00, 1.20);
    cymbal(t0 + 6.10, 0.35, 1.2);

    /* ────────── 6.2–7.8 s : final triumphant chord ─
       Big Cmaj voicing across octaves with brass + choir + impact */
    drum(t0 + 6.20, 0.95, 55);
    drum(t0 + 6.22, 0.65, 82);
    cymbal(t0 + 6.20, 0.80, 2.5);
    brass(130.81, t0 + 6.20, 1.55, 0.22);
    brass(196.00, t0 + 6.20, 1.55, 0.22);
    brass(261.63, t0 + 6.20, 1.55, 0.24);
    brass(329.63, t0 + 6.20, 1.55, 0.22);
    brass(392.00, t0 + 6.20, 1.55, 0.22);
    brass(523.25, t0 + 6.20, 1.55, 0.20);
    brass(784.00, t0 + 6.20, 1.55, 0.16);
    choirPad([261.63, 329.63, 392.00, 523.25, 659.25, 784.00], t0 + 6.20, 1.6, 0.28);
  }, [ensureCtx]);

  /* ─────────────────────────────────────────────────────────────────
     Custom intro music — plays a real audio file (URL) instead of the
     synthesised fanfare. The default URL is `/intro-music.mp3` (resolved
     against the artifact base path), but a different URL can be passed.
     The ambient music is ducked while the track plays. If loading the
     URL fails (e.g. file missing, CORS), this gracefully falls back to
     the synthesised fanfare so the intro is never silent.
     ─────────────────────────────────────────────────────────────── */
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const playIntroMusic = useCallback(
    (url?: string) => {
      if (!enabledRef.current) return;
      const base = (import.meta as any).env?.BASE_URL || "/";
      const src = url || `${base}intro-music.mp3`;

      // Stop any previous instance
      if (introAudioRef.current) {
        try { introAudioRef.current.pause(); } catch {}
        introAudioRef.current = null;
      }

      const a = new Audio(src);
      a.preload = "auto";
      a.crossOrigin = "anonymous";
      a.volume = 0.85;
      introAudioRef.current = a;

      // Duck ambient music while the track plays
      const ctrl = ensureCtx();
      let restoreGain: number | null = null;
      if (ctrl) {
        const t = ctrl.ctx.currentTime;
        restoreGain = ctrl.masterGain.gain.value;
        ctrl.masterGain.gain.cancelScheduledValues(t);
        ctrl.masterGain.gain.setValueAtTime(restoreGain, t);
        ctrl.masterGain.gain.linearRampToValueAtTime(0.05, t + 0.3);
      }
      const restore = () => {
        if (ctrl && restoreGain != null) {
          const t2 = ctrl.ctx.currentTime;
          ctrl.masterGain.gain.cancelScheduledValues(t2);
          ctrl.masterGain.gain.setValueAtTime(ctrl.masterGain.gain.value, t2);
          ctrl.masterGain.gain.linearRampToValueAtTime(restoreGain, t2 + 0.6);
        }
      };
      a.addEventListener("ended", restore);
      a.addEventListener("pause", restore);
      a.addEventListener("error", () => {
        restore();
        // Fall back to the synthesised fanfare so the intro isn't silent
        playIntroFanfare();
      });

      a.play().catch(() => {
        restore();
        playIntroFanfare();
      });
    },
    [ensureCtx, playIntroFanfare]
  );

  /** Stops any currently playing custom intro music. */
  const stopIntroMusic = useCallback(() => {
    if (introAudioRef.current) {
      try { introAudioRef.current.pause(); } catch {}
      introAudioRef.current = null;
    }
    if (introYtRef.current) {
      try { introYtRef.current.remove(); } catch {}
      introYtRef.current = null;
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     YouTube intro music — drops a hidden iframe pointing at the
     YouTube embed URL with autoplay enabled. The iframe is placed
     off-screen so only the audio is heard. The "Start Ceremony"
     button click satisfies the browser's autoplay-with-sound gesture
     requirement. The ambient music is ducked while it plays.
     ─────────────────────────────────────────────────────────────── */
  const introYtRef = useRef<HTMLIFrameElement | null>(null);
  const playIntroYouTube = useCallback(
    (videoId: string, startSec = 0) => {
      if (!enabledRef.current) return;
      // Tear down any previous intro audio (file or YT)
      if (introAudioRef.current) {
        try { introAudioRef.current.pause(); } catch {}
        introAudioRef.current = null;
      }
      if (introYtRef.current) {
        try { introYtRef.current.remove(); } catch {}
        introYtRef.current = null;
      }

      // Duck the ambient bed
      const ctrl = ensureCtx();
      let restoreGain: number | null = null;
      if (ctrl) {
        const t = ctrl.ctx.currentTime;
        restoreGain = ctrl.masterGain.gain.value;
        ctrl.masterGain.gain.cancelScheduledValues(t);
        ctrl.masterGain.gain.setValueAtTime(restoreGain, t);
        ctrl.masterGain.gain.linearRampToValueAtTime(0.05, t + 0.3);
      }

      // Build the hidden iframe
      const iframe = document.createElement("iframe");
      iframe.setAttribute(
        "allow",
        "autoplay; encrypted-media; accelerometer; gyroscope; picture-in-picture"
      );
      iframe.setAttribute("title", "Ceremony intro music");
      // Off-screen but functional — display:none would suspend audio.
      iframe.style.cssText =
        "position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;border:0;opacity:0;pointer-events:none;";
      const params = new URLSearchParams({
        autoplay: "1",
        controls: "0",
        modestbranding: "1",
        playsinline: "1",
        rel: "0",
        iv_load_policy: "3",
        fs: "0",
        disablekb: "1",
        start: String(Math.max(0, Math.floor(startSec))),
      });
      iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
      document.body.appendChild(iframe);
      introYtRef.current = iframe;

      // Auto-stop after ~8s so the YouTube player doesn't keep going
      // past the end of the visual intro sequence (intro is ~7.5s).
      const stopTimer = window.setTimeout(() => {
        if (introYtRef.current === iframe) {
          try { iframe.remove(); } catch {}
          introYtRef.current = null;
        }
        if (ctrl && restoreGain != null) {
          const t2 = ctrl.ctx.currentTime;
          ctrl.masterGain.gain.cancelScheduledValues(t2);
          ctrl.masterGain.gain.setValueAtTime(ctrl.masterGain.gain.value, t2);
          ctrl.masterGain.gain.linearRampToValueAtTime(restoreGain, t2 + 0.8);
        }
      }, 8200);

      // If the page unloads, clear the timer to avoid a leak.
      const onUnload = () => window.clearTimeout(stopTimer);
      window.addEventListener("pagehide", onUnload, { once: true });
    },
    [ensureCtx]
  );

  return {
    enabled,
    toggleEnabled,
    setMusicMode,
    speak,
    cancelSpeech,
    forgetSpoken,
    playIntroFanfare,
    playIntroMusic,
    playIntroYouTube,
    stopIntroMusic,
  };
}
