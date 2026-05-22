"use client";

import { useEffect, useRef, useState } from "react";

export default function LineChart({ timeline }) {
  const canvasRef = useRef(null);
  const [metric, setMetric] = useState("receita"); // "receita", "roas", "cpa"

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let resizeTimer;

    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const clientWidth = canvas.parentElement.clientWidth || 500;
      const clientHeight = 260;

      canvas.width = clientWidth * ratio;
      canvas.height = clientHeight * ratio;
      canvas.style.width = `${clientWidth}px`;
      canvas.style.height = `${clientHeight}px`;

      ctx.scale(ratio, ratio);
      ctx.clearRect(0, 0, clientWidth, clientHeight);

      const padding = 34;
      const width = clientWidth - padding * 2;
      const height = 180; // slightly smaller to give breathing room for labels
      const values = timeline.map((item) => item[metric]);
      const max = Math.max(...values) * 1.14;
      const min = metric === "cpa" ? Math.min(...values) * 0.82 : 0;

      // Draw grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = padding + (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + width, y);
        ctx.stroke();
      }

      const points = values.map((value, index) => ({
        x: padding + (width / (values.length - 1)) * index,
        y: padding + height - ((value - min) / (max - min)) * height,
        value,
      }));

      // Draw line gradient
      const gradient = ctx.createLinearGradient(0, 0, clientWidth, 0);
      gradient.addColorStop(0, "#7bb7ff");
      gradient.addColorStop(0.5, "#7cf7be");
      gradient.addColorStop(1, "#ffd481");

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();

      // Draw area fill under the line
      const fill = ctx.createLinearGradient(0, padding, 0, padding + height);
      fill.addColorStop(0, "rgba(124, 247, 190, 0.22)");
      fill.addColorStop(1, "rgba(124, 247, 190, 0)");
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding + height);
      points.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.lineTo(points[points.length - 1].x, padding + height);
      ctx.closePath();
      ctx.fill();

      // Draw points and labels
      ctx.font = "12px Inter, sans-serif";
      points.forEach((point, index) => {
        // Outer dot
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#f5f7fb";
        ctx.fill();

        // Month text
        ctx.fillStyle = "rgba(245, 247, 251, 0.72)";
        ctx.textAlign = "center";
        ctx.fillText(timeline[index].mes, point.x, padding + height + 24);
      });
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
  }, [metric, timeline]);

  return (
    <article className="chart-panel wide" id="comparacao">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Evolução histórica</p>
          <h2>Receita, investimento e ROAS</h2>
        </div>
        <div className="segmented" role="tablist">
          <button
            className={metric === "receita" ? "active" : ""}
            onClick={() => setMetric("receita")}
          >
            Receita
          </button>
          <button
            className={metric === "roas" ? "active" : ""}
            onClick={() => setMetric("roas")}
          >
            ROAS
          </button>
          <button
            className={metric === "cpa" ? "active" : ""}
            onClick={() => setMetric("cpa")}
          >
            CPA
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} height="260" />
    </article>
  );
}
