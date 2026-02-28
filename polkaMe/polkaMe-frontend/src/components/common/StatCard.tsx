interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  className?: string;
}

export default function StatCard({
  label,
  value,
  subtext,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`
        flex-1 min-w-[280px] p-8 rounded-2xl
        bg-white/5 border border-white/10
        flex flex-col gap-3
        hover-lift hover-glow
        animate-fade-in-up
        ${className}
      `}
    >
      <span className="text-primary font-bold text-sm tracking-widest uppercase">
        {label}
      </span>
      <p className="text-4xl font-black text-white">{value}</p>
      {subtext && <p className="text-slate-500 text-sm">{subtext}</p>}
    </div>
  );
}
