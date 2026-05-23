"use client";

import { useEffect, useRef, useState } from "react";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function DonutChart({ campaigns }) {
  const canvasRef = useRef(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const timerStart = setTimeout(() => setIsUpdating(true), 0);
    const timerEnd = setTimeout(() => setIsUpdating(false), 250);
    return () => {
      clearTimeout(timerStart);
      clearTimeout(timerEnd);
    };
  }, [campaigns]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let resizeTimer;

    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const clientWidth = canvas.parentElement.clientWidth || 320;
      const clientHeight = 240;

      canvas.width = clientWidth * ratio;
      canvas.height = clientHeight * ratio;
      canvas.style.width = `${clientWidth}px`;
      canvas.style.height = `${clientHeight}px`;

      ctx.scale(ratio, ratio);
      ctx.clearRect(0, 0, clientWidth, clientHeight);

      const google = campaigns.filter((item) => item.tipo === "google").reduce((sum, item) => sum + item.investimento, 0);
      const meta = campaigns.filter((item) => item.tipo === "meta").reduce((sum, item) => sum + item.investimento, 0);
      const totalInvest = google + meta;
      const total = totalInvest || 1; // prevent division by zero

      const centerX = clientWidth / 2;
      const centerY = 102;
      const radius = 72;
      let start = -Math.PI / 2;

      const slices = [
        { label: "Google Ads", value: google, color: "#7bb7ff" },
        { label: "Meta Ads", value: meta, color: "#7cf7be" },
      ];

      slices.forEach((slice) => {
        const end = start + (slice.value / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, start, end);
        ctx.lineWidth = 22;
        ctx.strokeStyle = slice.color;
        ctx.stroke();
        start = end;
      });

      // Central Text
      ctx.fillStyle = "#f5f7fb";
      ctx.font = "800 22px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(brl.format(totalInvest), centerX, centerY - 5);

      ctx.fillStyle = "rgba(245, 247, 251, 0.62)";
      ctx.font = "12px Inter, sans-serif";
      ctx.fillText("investimento total", centerX, centerY + 15);

      // Legend
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";

      // Google legend
      const googlePercent = Math.round((google / total) * 100);
      ctx.fillStyle = "#7bb7ff";
      ctx.fillRect(24, 206, 10, 10);
      ctx.fillStyle = "#c8d2df";
      ctx.font = "12px Inter, sans-serif";
      ctx.fillText(`Google Ads ${googlePercent}%`, 42, 215);

      // Meta legend
      const metaPercent = Math.round((meta / total) * 100);
      ctx.fillStyle = "#7cf7be";
      ctx.fillRect(174, 206, 10, 10);
      ctx.fillStyle = "#c8d2df";
      ctx.fillText(`Meta Ads ${metaPercent}%`, 192, 215);
    };

    draw();

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(draw, 100);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, [campaigns]);

  return (
    <article className={`chart-panel ${isUpdating ? "is-updating" : ""}`}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Distribuição</p>
          <h2>Investimento por plataforma</h2>
        </div>
      </div>
      <canvas ref={canvasRef} height="240" />
    </article>
  );
}
