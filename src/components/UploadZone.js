"use client";

import { useRef, useState } from "react";

export default function UploadZone({ files, onFilesSelected }) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

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
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
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
          accept=".csv,.xlsx,.xls,.pdf,image/*"
          aria-label="Selecionar arquivos para análise"
          onChange={handleFileChange}
        />
        <div className="upload-icon">+</div>
        <h2>Enviar dados ou prints</h2>
        <p>Arraste CSV, XLSX, XLS, PDFs, screenshots, fotos de dashboards ou exports de anúncios.</p>
        <button className="ghost-btn" id="btnSelectFiles" type="button" onClick={triggerFileInput}>
          Selecionar arquivos
        </button>
      </div>
      <div className="file-feed" id="fileFeed">
        {files.length === 0 ? (
          <span>Nenhum arquivo analisado ainda.</span>
        ) : (
          files.map((file, index) => {
            const isObj = typeof file === "object" && file !== null;
            const name = isObj ? file.name : String(file);
            const status = isObj ? file.status : "sucesso";
            const message = isObj ? file.message : "Analisado";
            const statusClass = `status-${status}`;
            
            return (
              <div key={index} className={`file-item ${statusClass}`}>
                <span style={{ wordBreak: "break-all" }}>{name}</span>
                <span className="file-status-badge">{message}</span>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
