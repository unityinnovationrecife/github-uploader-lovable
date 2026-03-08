import { useCallback, useRef } from 'react';

/**
 * Plays a cheerful "ding-dong" notification using the Web Audio API.
 * No external audio files needed.
 */
export function useOrderSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const playNotification = useCallback(() => {
    try {
      const ctx = getCtx();

      const playTone = (freq: number, startTime: number, duration: number, gain: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, startTime);

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      // Ding: two ascending notes
      playTone(880, now, 0.4, 0.5);        // A5
      playTone(1108, now + 0.18, 0.5, 0.4); // C#6
      playTone(1318, now + 0.36, 0.6, 0.35); // E6
    } catch (e) {
      // Silently fail if AudioContext is not available
    }
  }, [getCtx]);

  return { playNotification };
}
