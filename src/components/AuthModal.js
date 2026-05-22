"use client";

import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function AuthModal({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-overlay">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h2>Modo de Demonstração Ativo</h2>
          <p style={{ margin: "16px 0", color: "var(--muted)", fontSize: "0.95rem" }}>
            As credenciais do Supabase não estão configuradas no arquivo <code>.env.local</code>.
          </p>
          <button className="primary-btn" onClick={() => onAuthSuccess(null)}>
            Entrar no Painel Demonstrativo
          </button>
        </div>
        <style jsx>{`
          .auth-overlay {
            position: fixed;
            inset: 0;
            z-index: 100;
            display: grid;
            place-items: center;
            background: rgba(5, 7, 13, 0.86);
            backdrop-filter: blur(12px);
            padding: 20px;
          }
          .auth-card {
            width: 100%;
            max-width: 420px;
            padding: 32px;
            border: 1px solid var(--line);
            border-radius: var(--radius);
            background: var(--panel-strong);
            box-shadow: var(--shadow);
          }
        `}</style>
      </div>
    );
  }

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onAuthSuccess(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg("Cadastro realizado! Verifique seu e-mail ou faça login.");
        setIsLogin(true);
      }
    } catch (err) {
      setErrorMsg(err.message || "Ocorreu um erro na autenticação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-mark" style={{ margin: "0 auto 16px" }}>O</div>
          <h2>{isLogin ? "Acessar Orbit BI" : "Criar sua Conta"}</h2>
          <p className="eyebrow" style={{ marginTop: "6px" }}>
            Painel Executivo de Mídia Paga
          </p>
        </div>

        <form onSubmit={handleAuth} style={{ display: "grid", gap: "16px", marginTop: "24px" }}>
          <label style={{ display: "grid", gap: "6px", fontSize: "0.8rem", color: "var(--muted)" }}>
            E-mail
            <input
              type="email"
              required
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                height: "44px",
                padding: "0 12px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "var(--radius)",
                background: "rgba(5, 7, 13, 0.82)",
                color: "var(--text)",
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px", fontSize: "0.8rem", color: "var(--muted)" }}>
            Senha
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                height: "44px",
                padding: "0 12px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "var(--radius)",
                background: "rgba(5, 7, 13, 0.82)",
                color: "var(--text)",
                outline: "none",
              }}
            />
          </label>

          {errorMsg && (
            <p style={{ color: "var(--red)", fontSize: "0.85rem", marginTop: "4px" }}>
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <p style={{ color: "var(--green)", fontSize: "0.85rem", marginTop: "4px" }}>
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            className="primary-btn"
            disabled={loading}
            style={{ width: "100%", height: "46px", marginTop: "8px" }}
          >
            {loading ? "Processando..." : isLogin ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "0.86rem" }}>
          <span style={{ color: "var(--muted)" }}>
            {isLogin ? "Ainda não tem conta?" : "Já possui conta?"}{" "}
          </span>
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            style={{
              background: "none",
              border: "none",
              color: "var(--blue)",
              textDecoration: "underline",
              padding: 0,
              cursor: "pointer",
            }}
          >
            {isLogin ? "Cadastre-se" : "Entrar"}
          </button>
        </div>
      </div>
      <style jsx>{`
        .auth-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          background: rgba(5, 7, 13, 0.86);
          backdrop-filter: blur(12px);
          padding: 20px;
        }
        .auth-card {
          width: 100%;
          max-width: 420px;
          padding: 32px;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          background: var(--panel-strong);
          box-shadow: var(--shadow);
        }
        .auth-header {
          text-align: center;
        }
      `}</style>
    </div>
  );
}
