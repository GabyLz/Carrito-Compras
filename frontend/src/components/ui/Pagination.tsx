export const Pagination = ({ current, total, onChange }: { current: number, total: number, onChange: (page: number) => void }) => {
  const totalPages = Math.ceil(total / 12);
  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
      >
        Anterior
      </button>
      <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
        Pagina {current} de {totalPages || 1}
      </span>
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === totalPages || totalPages === 0}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  );
};
