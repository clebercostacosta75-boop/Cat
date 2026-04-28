/**
 * CertificateQRCode — gera QR Code apontando para a página pública de validação.
 * Usa qrcode.react (já instalado).
 */
import React from "react";
import { QRCodeSVG } from "qrcode.react";

export function getValidationUrl(certificateCode) {
  const base = window.location.origin;
  return `${base}/CertificateValidate?code=${encodeURIComponent(certificateCode)}`;
}

export default function CertificateQRCode({ certificateCode, size = 80, showLabel = true }) {
  if (!certificateCode) return null;
  const url = getValidationUrl(certificateCode);

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <QRCodeSVG
        value={url}
        size={size}
        level="M"
        includeMargin={false}
        fgColor="#111827"
        bgColor="#ffffff"
      />
      {showLabel && (
        <p style={{ fontSize: 9, color: "#6b7280", fontFamily: "Arial, sans-serif", textAlign: "center", maxWidth: size }}>
          Escaneie para validar
        </p>
      )}
    </div>
  );
}