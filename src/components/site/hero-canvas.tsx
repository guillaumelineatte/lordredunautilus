"use client";

import { useEffect, useState, type ComponentType } from "react";

// three.js pèse ~250 Ko gzip : on ne le charge qu'après l'intro du hero, et pas
// du tout si les animations sont réduites. import() à la main parce que
// next/dynamic précharge le module quoi qu'il arrive.

// Seulement avec un vrai GPU. En rendu logiciel (SwiftShader, llvmpipe) ou sur
// un petit appareil, chaque frame bloquerait la page des centaines de ms.
function capableDevice(): boolean {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 8) < 4 || (nav.deviceMemory ?? 8) < 2) return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ??
      canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !/swiftshader|llvmpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}

const INTERACTIONS = [
  "pointermove",
  "pointerdown",
  "touchstart",
  "wheel",
  "scroll",
  "keydown",
] as const;

export function HeroCanvas() {
  const [Scene, setScene] = useState<ComponentType | null>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !capableDevice()) return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      cleanup();
      void import("./hero-scene").then((m) => setScene(() => m.default));
    };
    // chargé à la première interaction (sur ordi la souris bouge quasi tout de suite),
    // sinon au bout de 4 s sur ordi
    const timer = window.matchMedia("(pointer: fine)").matches
      ? window.setTimeout(start, 4000)
      : undefined;
    const cleanup = () => {
      window.clearTimeout(timer);
      INTERACTIONS.forEach((type) => window.removeEventListener(type, start));
    };
    INTERACTIONS.forEach((type) =>
      window.addEventListener(type, start, { passive: true, once: true }),
    );
    return cleanup;
  }, []);
  return Scene ? <Scene /> : null;
}
