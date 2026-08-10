"use client";

import { useEffect, useId, useRef, useState } from "react";

function readField(source, keys) {
  if (!source || typeof source !== "object") return "";

  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  const normalizedMap = Object.fromEntries(
    Object.entries(source).map(([k, v]) => [
      k.toLowerCase().replace(/[_\s]/g, ""),
      v,
    ]),
  );

  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[_\s]/g, "");
    const value = normalizedMap[normalizedKey];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return "";
}

function formatDriverName(record) {
  const attrs = record?.attributes ?? {};
  const firstName = String(
    readField(attrs, ["first_name", "firstName"]) ||
      readField(record, ["first_name", "firstName"]) ||
      "",
  ).trim();
  const lastName = String(
    readField(attrs, ["last_name", "lastName"]) ||
      readField(record, ["last_name", "lastName"]) ||
      "",
  ).trim();

  return [firstName, lastName].filter(Boolean).join(" ");
}

function normalizeDriverNames(payload) {
  const raw = payload?.data ?? payload?.drivers ?? payload?.items ?? payload;
  const list = Array.isArray(raw) ? raw : [];

  const names = list
    .map((record) => formatDriverName(record))
    .filter(Boolean);

  return [...new Set(names)];
}

export default function DriverAutocomplete({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  autoFocus = false,
  placeholder = "Start typing a driver name",
  className = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100",
}) {
  const listboxId = useId();
  const rootRef = useRef(null);
  const [driverNames, setDriverNames] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const hasLoadedRef = useRef(false);

  const query = String(value || "").trim().toLowerCase();
  const filteredNames = driverNames.filter((name) => {
    if (!query) return true;
    return name.toLowerCase().includes(query);
  });

  const loadDrivers = async () => {
    if (hasLoadedRef.current || isLoading) return;

    setIsLoading(true);
    setLoadError("");

    try {
      const authToken =
        typeof window !== "undefined"
          ? localStorage.getItem("auth_token")
          : null;
      const response = await fetch("/api/v1/drivers/names", {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setLoadError(
          data?.error || data?.message || "Failed to load driver names.",
        );
        return;
      }

      setDriverNames(normalizeDriverNames(data));
      hasLoadedRef.current = true;
    } catch {
      setLoadError("Could not load driver names.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const openSuggestions = () => {
    if (disabled) return;
    setIsOpen(true);
    void loadDrivers();
  };

  const selectName = (name) => {
    onChange(name);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      openSuggestions();
      return;
    }

    if (!isOpen) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((current) =>
        filteredNames.length === 0
          ? -1
          : Math.min(current + 1, filteredNames.length - 1),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((current) =>
        filteredNames.length === 0 ? -1 : Math.max(current - 1, 0),
      );
      return;
    }

    if (event.key === "Enter" && highlightIndex >= 0) {
      event.preventDefault();
      selectName(filteredNames[highlightIndex]);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          highlightIndex >= 0
            ? `${listboxId}-option-${highlightIndex}`
            : undefined
        }
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
          setHighlightIndex(-1);
          void loadDrivers();
        }}
        onFocus={openSuggestions}
        onClick={openSuggestions}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        maxLength={255}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />

      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-[60] mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {isLoading ? (
            <p className="px-3 py-2 text-sm text-zinc-500">Loading drivers…</p>
          ) : loadError ? (
            <p className="px-3 py-2 text-sm text-red-600">{loadError}</p>
          ) : filteredNames.length === 0 ? (
            <p className="px-3 py-2 text-sm text-zinc-500">No drivers found</p>
          ) : (
            filteredNames.map((name, index) => {
              const isActive = index === highlightIndex;
              return (
                <button
                  key={name}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectName(name)}
                  onMouseEnter={() => setHighlightIndex(index)}
                  className={`block w-full px-3 py-2 text-left text-sm transition ${
                    isActive
                      ? "bg-red-50 text-red-900"
                      : "text-zinc-800 hover:bg-zinc-50"
                  }`}
                >
                  {name}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
