// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « audio ») ; typage strict progressif à venir.
/* eslint-disable */

import { nearestCannon } from './cannons';
import { smoothstep } from './core';
import { SN, SNOW, tunnels } from './pistes';
import { P } from './player';
import { sled } from './vehicles';

export let sfx, musicBeat;


export function __init_5990() {

/* ---------------- Audio ---------------- */
sfx = (() => {
  let ctx = null, wind, windF, carve, carveF, hiss, hum, master, on = true;
  let mus = null;
  function init() {
    if (ctx) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    const mk = (type, f, q) => { const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; src.connect(fl); fl.connect(g); g.connect(master); src.start(); return [g, fl]; };
    { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = 40; f.type = 'lowpass'; f.frequency.value = 600; sfx.eng = ctx.createGain(); sfx.eng.gain.value = 0; sfx.engO = o; o.connect(f); f.connect(sfx.eng); sfx.eng.connect(master); o.start(); }
    [wind, windF] = mk('lowpass', 400, 0.7); [carve, carveF] = mk('bandpass', 2000, 1.2); [hiss] = mk('highpass', 2500, 0.5);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 52; const lf = ctx.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 180; hum = ctx.createGain(); hum.gain.value = 0; o.connect(lf); lf.connect(hum); hum.connect(master); o.start();
    sfx.buf = buf;
    // tunnel music bus: dry + a long synthetic reverb, faded in near the tunnels
    const bus = ctx.createGain(); bus.gain.value = 0; bus.connect(master);
    const conv = ctx.createConvolver(), L = ctx.sampleRate * 2.4, ir = ctx.createBuffer(2, L, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < L; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 3); }
    conv.buffer = ir; const wet = ctx.createGain(); wet.gain.value = 0.45; const dry = ctx.createGain(); dry.gain.value = 0.8;
    const inp = ctx.createGain(); inp.connect(dry); inp.connect(conv); conv.connect(wet); dry.connect(bus); wet.connect(bus);
    mus = { bus, inp, next: 0, step: 0, lastKick: -10, playing: false };
  }
  function burst(freq, dur, vol, dest) {
    if (!ctx || !on) return; const s = ctx.createBufferSource(); s.buffer = sfx.buf; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; const g = ctx.createGain();
    const t = ctx.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f); f.connect(g); g.connect(dest || master); s.start(t); s.stop(t + dur + 0.05);
  }
  // a small 124 bpm loop: kick, hats, clap, bass and an arpeggio over Am–F–C–G
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], ROOT = [45, 41, 48, 43];
  function voice(type, f, t, dur, vol, cut) {
    const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter(); o.type = type; o.frequency.setValueAtTime(f, t);
    fl.type = 'lowpass'; fl.frequency.value = cut; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(mus.inp); o.start(t); o.stop(t + dur + 0.05);
  }
  function noiseHit(t, dur, vol, type, f) {
    const s = ctx.createBufferSource(); s.buffer = sfx.buf; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(fl); fl.connect(g); g.connect(mus.inp); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  function step(i, t) {
    const bar = Math.floor(i / 16) % 4, q = i % 16;
    if (q % 4 === 0) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32); o.connect(g); g.connect(mus.inp); o.start(t); o.stop(t + 0.35); mus.kicks = (mus.kicks || []).concat(t).slice(-8); }
    if (q % 4 === 2) noiseHit(t, 0.05, 0.22, 'highpass', 7500); else if (q % 2 === 1) noiseHit(t, 0.03, 0.07, 'highpass', 9000);
    if (q === 4 || q === 12) noiseHit(t, 0.16, 0.35, 'bandpass', 1500);
    if (q % 2 === 0) voice('sawtooth', midi(ROOT[bar] + (q % 8 === 6 ? 12 : 0)), t, 0.2, 0.22, 420);
    const ch = CH[bar], note = ch[[0, 1, 2, 1][q % 4]] + 12 + (q >= 8 ? 12 : 0);
    voice('square', midi(note), t, 0.12, 0.05, 2600);
  }
  return {
    init, burst,
    pop() { burst(900, 0.15, 0.25); },
    chime(k) {   // small bell for medals, missions and levels: 1 to 3 notes
      if (!ctx || !on) return; const t = ctx.currentTime;
      [0, 1, 2].slice(0, (k || 0) + 1).forEach(i => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = [880, 1175, 1568][i];
        g.gain.setValueAtTime(0.0001, t + i * 0.11); g.gain.exponentialRampToValueAtTime(0.18, t + i * 0.11 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.11 + 0.9);
        o.connect(g); g.connect(master); o.start(t + i * 0.11); o.stop(t + i * 0.11 + 1); });
    },
    land(k) { burst(260, 0.3, 0.25 + k * 0.5); },
    toggle() { on = !on; if (master) master.gain.value = on ? 0.9 : 0; return on; },
    beat() { if (!mus || !mus.kicks) return 0; const now = ctx.currentTime; let b = 0; for (const k of mus.kicks) if (k <= now) b = Math.max(b, Math.exp(-(now - k) * 7)); return mus.playing ? b : 0; },
    update() {
      if (!ctx) return; const t = ctx.currentTime, sp = P.vel.length(), st = P.snow;
      const air = P.state === 'air';
      wind.gain.setTargetAtTime(Math.min(0.5, Math.pow(sp / 30, 2) * 0.45 + (air ? 0.05 : 0)), t, 0.1);
      windF.frequency.setTargetAtTime(250 + sp * 35, t, 0.1);
      // glide sound per snow type: hard scrape on ice, soft hush in powder, chatter in crud
      const S = SNOW[st] || SNOW[0];
      const base = st === SN.GLACEE ? 0.25 : st === SN.POUDREUSE ? 0.2 : st === SN.TRAFOLLE ? 0.22 : st === SN.BOSSES ? 0.12 : 0.05;
      let c = P.state === 'sled' ? 0 : P.state === 'ski' ? Math.min(0.36, sp / 28 * (Math.abs(P.edge) * 0.35 + P.brake * 0.8 + P.skid * 0.4 + base)) : P.state === 'rail' ? 0.18 : 0;
      if (st === SN.TRAFOLLE) c *= 0.7 + 0.6 * Math.abs(P.jolt);
      carve.gain.setTargetAtTime(c, t, 0.05);
      carveF.frequency.setTargetAtTime(P.state === 'rail' ? 3200 : st === SN.GLACEE ? 3600 : st === SN.POUDREUSE ? 520 : st === SN.TRAFOLLE ? 900 : P.brake > 0.5 ? 1100 : 2200, t, 0.1);
      hum.gain.setTargetAtTime(P.state === 'lift' ? 0.05 : 0, t, 0.3);
      sfx.eng.gain.setTargetAtTime(P.state === 'sled' ? 0.07 + sled.engine * 0.06 : 0, t, 0.15); sfx.engO.frequency.setTargetAtTime(38 + sp * 4 + sled.engine * 34, t, 0.1);
      const dc = nearestCannon(P.pos.x, P.pos.z);
      hiss.gain.setTargetAtTime(0.16 * smoothstep(90, 8, dc), t, 0.3);
      // tunnel music: on inside, fading with distance to the nearest portal
      let mix = P.tunnel ? 1 : 0;
      for (const T of tunnels) for (const i of [T.i0, T.i1]) { const q = T.S[i]; mix = Math.max(mix, smoothstep(80, 12, Math.hypot(q.x - P.pos.x, q.z - P.pos.z))); }
      mus.bus.gain.setTargetAtTime(mix * 0.5, t, 0.25);
      if (mix > 0.01) {
        if (!mus.playing || mus.next < t - 0.2) { mus.playing = true; mus.next = t + 0.05; }   // never replay missed steps after a pause
        const spb = 60 / 124 / 4;
        while (mus.next < t + 0.15) { step(mus.step, mus.next); mus.next += spb; mus.step = (mus.step + 1) % 64; }
      } else mus.playing = false;
    }
  };
})();
musicBeat = () => sfx.beat();
}
