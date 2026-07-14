import React from "react";

export default function AccessDiagnosticCard({ title, value, ok }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className={`mt-1 break-words text-sm font-medium ${ok === true ? "text-green-700" : ok === false ? "text-red-700" : "text-foreground"}`}>
        {Array.isArray(value) ? (value.length ? value.join(", ") : "Nenhum") : String(value ?? "Não disponível")}
      </p>
    </div>
  );
}