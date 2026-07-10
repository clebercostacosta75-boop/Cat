import React from "react";
import { isIndividual } from "@/lib/filaVisual";

export default function OrigemBadge({ enrollment }) {
  return isIndividual(enrollment) ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
      👤 Individual
    </span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
      🏢 Empresa
    </span>
  );
}