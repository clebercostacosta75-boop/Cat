import React from "react";
import CursosPacotesTab from "@/components/vendas/CursosPacotesTab";

// Cursos à Venda — exclusivamente criação e gestão do catálogo comercial
// (cursos-base, ofertas e pacotes). Inscrições, QR Code e reservas ficam na aba Matrículas.
export default function CursosVendaCentral() {
  return <CursosPacotesTab />;
}