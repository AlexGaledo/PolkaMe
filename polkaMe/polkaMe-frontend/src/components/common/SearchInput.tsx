interface SearchInputProps {
  placeholder?: string;
  className?: string;
}

export default function SearchInput({
  placeholder = "Search…",
  className = "",
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
        search
      </span>
      <input
        type="text"
        className="w-full bg-neutral-muted border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary placeholder:text-text-muted"
        placeholder={placeholder}
      />
    </div>
  );
}
