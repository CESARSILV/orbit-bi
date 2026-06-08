"use client";

import { useEffect, useRef } from "react";

export default function AuroraBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId;
    let t = 0;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      ctx.scale(ratio, ratio);
    };

    resize();
    window.addEventListener("resize", resize);

    const frame = () => {
      t += 0.0025; // Deslocamento mais calmo e sutil
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const blobs = [
        [window.innerWidth * (0.2 + Math.sin(t) * 0.04), window.innerHeight * 0.18, "#7bb7ff"],
        [window.innerWidth * 0.82, window.innerHeight * (0.16 + Math.cos(t * 1.4) * 0.05), "#ffd200"], // Amarelo de marca
        [window.innerWidth * (0.62 + Math.cos(t * 0.8) * 0.04), window.innerHeight * 0.88, "#7cf7be"],
      ];

      blobs.forEach(([x, y, color]) => {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 360);
        gradient.addColorStop(0, `${color}33`); // 33 is ~20% opacity in hex
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      });

      animationId = requestAnimationFrame(frame);
    };

    frame();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas id="aurora" ref={canvasRef} aria-hidden="true" />;
}
