// HIGHWATER — seeded random numbers (mulberry32). Every random choice in
// the game goes through this, so a run with a fixed seed replays exactly.
export function createRng(seed) {
  let a = seed >>> 0;
  return {
    seed,
    next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(min, max) {
      return min + this.next() * (max - min);
    },
    int(min, max) {
      return Math.floor(this.range(min, max + 1));
    },
    pick(arr) {
      return arr[Math.floor(this.next() * arr.length)];
    },
    angle() {
      return this.next() * Math.PI * 2;
    },
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
      return out;
    },
  };
}
