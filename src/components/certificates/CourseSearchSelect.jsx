import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, Check } from "lucide-react";

const normalize = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Extrai a carga horária do nome do curso (ex: "... 40H", "(FORMAÇÃO – 08 H)") → "40h"
export const extractDuration = (courseName) => {
  const match = (courseName || "").match(/(\d{1,3})\s*h(?:oras)?\b/i);
  return match ? `${match[1]}h` : "";
};

export default function CourseSearchSelect({ courses = [], value, onSelect }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = normalize(query);
  const filtered = q
    ? courses.filter((c) => normalize(c.name).includes(q))
    : courses;

  const handlePick = (course) => {
    setQuery(course.name);
    setOpen(false);
    onSelect(course);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          className="pl-8"
          value={query}
          placeholder="Digite as iniciais ou o nome do curso..."
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-gray-400">Nenhum curso encontrado.</p>
          ) : (
            filtered.slice(0, 50).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handlePick(c)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 flex items-start gap-2"
              >
                {value === c.name && <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />}
                <span className="leading-snug">{c.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}