// HIGHWATER — tiny synthesized sound effects (WebAudio, no assets).
// Everything is guarded: if audio is unavailable the game plays on silent.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted || !ctx) return;
    try {
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      gain.gain.setValueAtTime(vol || 0.08, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      // Sound must never break the game.
    }
  }

  const api = {
    ensure,
    get muted() {
      return muted;
    },
    setMuted(m) {
      muted = !!m;
      if (muted) api.stopMusic();
    },
    toggleMuted() {
      api.setMuted(!muted);
      return muted;
    },
    shoot() {
      tone(620, 0.06, 'square', 0.025, 380);
    },
    cannon() {
      tone(140, 0.18, 'triangle', 0.09, 55);
    },
    zap() {
      tone(920, 0.09, 'sawtooth', 0.04, 180);
    },
    kill() {
      tone(320, 0.1, 'sine', 0.06, 90);
    },
    coin() {
      tone(880, 0.09, 'sine', 0.05, 1320);
    },
    leak() {
      tone(180, 0.3, 'sawtooth', 0.09, 60);
    },
    wave() {
      tone(220, 0.25, 'triangle', 0.07, 440);
      setTimeout(() => tone(330, 0.25, 'triangle', 0.06, 550), 120);
    },
    boon() {
      tone(523, 0.15, 'sine', 0.07);
      setTimeout(() => tone(659, 0.15, 'sine', 0.07), 110);
      setTimeout(() => tone(784, 0.25, 'sine', 0.07), 220);
    },
    boss() {
      tone(98, 0.7, 'sawtooth', 0.12, 49);
      setTimeout(() => tone(147, 0.6, 'sawtooth', 0.09, 73), 200);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sine', 0.08), i * 140));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'triangle', 0.08), i * 160));
    },
    click() {
      tone(700, 0.05, 'sine', 0.04);
    },
    build() {
      tone(240, 0.12, 'triangle', 0.08, 480);
    },
    startMusic() {
      if (!ctx || muted || musicTimer) return;
      const bass = [55, 55, 65.4, 49];
      musicTimer = setInterval(() => {
        if (muted) return;
        const f = bass[musicStep % bass.length];
        tone(f, 0.9, 'triangle', 0.045, f);
        if (musicStep % 2 === 0) tone(f * 3, 0.4, 'sine', 0.02);
        musicStep++;
      }, 950);
    },
    stopMusic() {
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
    },
  };
  return api;
}
