import type { Oor } from './types';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function panValue(oor: Oor): number {
  if (oor === 'links') return -1;
  if (oor === 'rechts') return 1;
  return 0;
}

/** Speelt een pure toon af via StereoPannerNode (pan −1 = links, +1 = rechts). */
export async function playTone(frequency: number, oor: Oor, duration = 2): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const panner = ctx.createStereoPanner();

  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gainNode.gain.value = 0.3;
  panner.pan.value = panValue(oor);

  oscillator.connect(gainNode);
  gainNode.connect(panner);
  panner.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);

  return new Promise((resolve) => {
    oscillator.onended = () => resolve();
  });
}

export async function playSpeechInNoise(duration = 3): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const bufferSize = ctx.sampleRate * duration;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.15;

  const oscillator = ctx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.value = 1000;

  const toneGain = ctx.createGain();
  toneGain.gain.value = 0.08;

  noiseSource.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  oscillator.connect(toneGain);
  toneGain.connect(ctx.destination);

  noiseSource.start();
  oscillator.start();
  noiseSource.stop(ctx.currentTime + duration);
  oscillator.stop(ctx.currentTime + duration);

  return new Promise((resolve) => {
    noiseSource.onended = () => resolve();
  });
}
