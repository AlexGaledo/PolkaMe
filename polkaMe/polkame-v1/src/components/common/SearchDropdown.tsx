import { useState, useRef, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { searchUser } from "../../api";
import type { Identity } from "../../types";

interface SearchDropdownProps {
  placeholder?: string;
  className?: string;
}

export default function SearchDropdown({
  placeholder = "Search by name or 0x address…",
  className = "",
}: SearchDropdownProps) {
  const activeAccount = useActiveAccount();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(Identity & { isYou?: boolean })[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setShowDropdown(true);
    setSearched(true);
    const res = await searchUser(q);
    if (res.success && res.data) {
      const mapped = res.data.map((user) => ({
        ...user,
        isYou:
          activeAccount?.address?.toLowerCase() === user.walletAddress.toLowerCase(),
      }));
      setResults(mapped);
    } else {
      setResults([]);
    }
    setSearching(false);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setSearched(false);
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          onFocus={() => searched && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full bg-neutral-muted border-none rounded-lg py-2 pl-10 pr-8 text-sm focus:ring-1 focus:ring-primary placeholder:text-text-muted"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full mt-2 w-full min-w-[340px] bg-background-dark border border-neutral-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {searching ? (
            <div className="p-4 text-center">
              <div className="animate-spin size-5 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-xs text-text-muted mt-2">Searching…</p>
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-neutral-border">
              {results.map((r) => (
                <div
                  key={r.walletAddress}
                  className="p-4 hover:bg-neutral-muted/50 transition-colors cursor-pointer flex items-center gap-3"
                >
                  <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {r.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm truncate">
                        {r.displayName}
                      </p>
                      {r.isYou && (
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted font-mono truncate">
                      {r.walletAddress}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{r.score}</p>
                    <p className="text-[10px] text-text-muted">Score</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-text-muted">
              <span className="material-symbols-outlined text-3xl mb-2 block opacity-40">
                person_off
              </span>
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
