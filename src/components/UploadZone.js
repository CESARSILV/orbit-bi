"use client";

import { useRef, useState } from "react";
import {
  UploadCloudIcon,
  StatusSuccessIcon,
  StatusProcessingIcon,
  StatusErrorIcon
} from "./Icons";

export default function UploadZone({ files, onFilesSelected }) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const total = files.length;
  const processando = files.filter((file) => file?.status === "processando").length;
  const sucesso = files.filter((file) => file?.status === "sucesso").length;
  const erros = files.filter((file) => file?.status === "erro").length;
  const anexosIa = files.filter((file) => file?.message === "Anexo da IA").length;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <article className="upload-panel">
      <div
        className={`upload-zone ${isDragOver ? "dragover" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          id="fileInput"
          type="file"
          multiple
          accept=".csv,.xlsx,.xls"
          aria-label="Selecionar arquivos para análise"
          onChange={handleFileChange}
        />
        <div className="upload-icon-container">
          <UploadCloudIcon className="upload-icon-svg" />
        </div>
        <h2>Enviar relatórios (CSV/XLSX)</h2>
        <p>Arraste arquivos de exportação do Google Ads ou Meta Ads (CSV, XLSX ou XLS).</p>
        <button className="ghost-btn" id="btnSelectFiles" type="button" onClick={triggerFileInput}>
          Selecionar arquivos
        </button>
      </div>
      <div className="file-feed" id="fileFeed">
        {files.length === 0 ? (
          <span>Nenhum arquivo analisado ainda.</span>
        ) : (
          <div className="file-summary">
            <span>
              <strong>{total}</strong> arquivo{total === 1 ? "" : "s"} recebido{total === 1 ? "" : "s"}
            </span>
            <div className="file-summary-badges">
              {processando > 0 && (
                <span className="file-status-badge status-processando" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <StatusProcessingIcon />
                  <span>{processando} processando</span>
                </span>
              )}
              {sucesso > 0 && (
                <span className="file-status-badge status-sucesso" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <StatusSuccessIcon />
                  <span>{sucesso} sincronizado{sucesso === 1 ? "" : "s"}</span>
                </span>
              )}
              {anexosIa > 0 && (
                <span className="file-status-badge status-anexo" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <StatusSuccessIcon />
                  <span>{anexosIa} anexo{anexosIa === 1 ? "" : "s"} IA</span>
                </span>
              )}
              {erros > 0 && (
                <span className="file-status-badge status-erro" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <StatusErrorIcon />
                  <span>{erros} erro{erros === 1 ? "" : "s"}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
