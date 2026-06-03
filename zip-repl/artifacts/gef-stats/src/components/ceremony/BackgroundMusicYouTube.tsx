import { useEffect, useRef } from "react";

interface Props {
  /** YouTube video ID to use as the looping background score. */
  videoId: string;
  /** Ambient volume (0–100). Defaults to 35 — sits under voice/SFX. */
  volume?: number;
  /**
   * Volume to drop to while the ceremony announcer is speaking. The
   * `useCeremonyAudio` hook dispatches `ceremony-speech-start` and
   * `ceremony-speech-end` window events; this player listens for them
   * and ducks/restores automatically.
   */
  duckVolume?: number;
}

/**
 * Hidden looping YouTube player used as the ambient background music
 * for the Ballon d'Or pages. There is no visible UI — playback starts
 * muted (the only way browsers allow autoplay), and the player is
 * unmuted automatically the very first time the user interacts with
 * the page (any click / touch / keypress anywhere). After that it just
 * keeps looping until the component unmounts.
 *
 * While the announcer is speaking the volume ducks down so the
 * voiceover stays clearly above the music, then it ramps back up.
 */
export function BackgroundMusicYouTube({
  videoId,
  volume = 35,
  duckVolume,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const baseVolumeRef = useRef(volume);
  const duckedRef = useRef(false);
  const readyRef = useRef(false);

  // Keep the latest desired volume / duck level in refs so the
  // event listeners always read current values without being torn
  // down and rebuilt on every prop change.
  baseVolumeRef.current = volume;
  const duck = Math.max(0, Math.min(100, duckVolume ?? Math.round(volume * 0.25)));

  useEffect(() => {
    let destroyed = false;

    const ensureApi = () =>
      new Promise<void>((resolve) => {
        const w = window as any;
        if (w.YT && w.YT.Player) return resolve();
        const prev = w.onYouTubeIframeAPIReady;
        w.onYouTubeIframeAPIReady = () => {
          try { prev?.(); } catch {}
          resolve();
        };
        if (!document.querySelector('script[data-yt-iframe-api="1"]')) {
          const tag = document.createElement("script");
          tag.src = "https://www.youtube.com/iframe_api";
          tag.setAttribute("data-yt-iframe-api", "1");
          document.body.appendChild(tag);
        }
      });

    /* Once the user makes ANY gesture on the document, unmute the player
       and bring it up to volume. We attach passive one-shot listeners on
       multiple event types so the very first interaction wins, no matter
       how the user touches the page. */
    const armUnmuteOnGesture = () => {
      const unmute = () => {
        const p = playerRef.current;
        if (!p) return;
        try {
          p.unMute();
          p.setVolume(baseVolumeRef.current);
          p.playVideo();
        } catch {}
      };
      const events: Array<keyof DocumentEventMap> = [
        "pointerdown", "click", "touchstart", "keydown",
      ];
      const handler = () => {
        unmute();
        events.forEach((ev) => document.removeEventListener(ev, handler, true));
      };
      events.forEach((ev) =>
        document.addEventListener(ev, handler, { capture: true, passive: true })
      );
      // Also try once immediately in case the page already has a stored
      // user-activation token (some browsers count a previous-session
      // interaction within the BFCache). Failures are silent.
      unmute();
    };

    /* Voice-ducking: listen for global speech events from useCeremonyAudio.
       When speech starts, drop volume; when it ends, restore. */
    const onSpeechStart = () => {
      const p = playerRef.current;
      if (!p) return;
      duckedRef.current = true;
      try { p.setVolume(duck); } catch {}
    };
    const onSpeechEnd = () => {
      const p = playerRef.current;
      if (!p) return;
      duckedRef.current = false;
      try { p.setVolume(baseVolumeRef.current); } catch {}
    };
    window.addEventListener("ceremony-speech-start", onSpeechStart);
    window.addEventListener("ceremony-speech-end", onSpeechEnd);

    ensureApi().then(() => {
      if (destroyed || !containerRef.current) return;
      const w = window as any;
      playerRef.current = new w.YT.Player(containerRef.current, {
        videoId,
        width: "200",
        height: "120",
        playerVars: {
          autoplay: 1,
          loop: 1,
          playlist: videoId, // required for loop=1 on a single video
          controls: 0,
          modestbranding: 1,
          playsinline: 1,
          mute: 1,
          rel: 0,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
        },
        events: {
          onReady: (e: any) => {
            try {
              e.target.setVolume(baseVolumeRef.current);
              e.target.playVideo();
              readyRef.current = true;
              armUnmuteOnGesture();
            } catch {}
          },
          onStateChange: (e: any) => {
            // YT.PlayerState.ENDED === 0. loop=1 should restart for us
            // but older builds occasionally drop it — do it ourselves
            // for safety so the music truly never stops until unmount.
            if (e?.data === 0) {
              try { e.target.seekTo(0, true); e.target.playVideo(); } catch {}
            }
          },
        },
      });
    });

    return () => {
      destroyed = true;
      window.removeEventListener("ceremony-speech-start", onSpeechStart);
      window.removeEventListener("ceremony-speech-end", onSpeechEnd);
      try { playerRef.current?.destroy?.(); } catch {}
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Off-screen iframe holder. There is no visible UI.
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: "-10000px",
        top: "-10000px",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div ref={containerRef} />
    </div>
  );
}
