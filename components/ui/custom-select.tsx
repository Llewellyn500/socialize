"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { FiCheck, FiChevronDown, FiSearch } from "react-icons/fi";
import styles from "./custom-select.module.css";

export type CustomSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type CustomSelectProps = {
  id?: string;
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  "aria-label"?: string;
  className?: string;
};

export function CustomSelect({
  id,
  value,
  options,
  onChange,
  disabled = false,
  required = false,
  placeholder = "Select an option",
  searchable = false,
  searchPlaceholder = "Search…",
  "aria-label": ariaLabel,
  className = "",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label ?? placeholder;

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const needle = query.trim().toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        option.value.toLowerCase().includes(needle),
    );
  }, [options, query, searchable]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }
    setActiveIndex(0);
    if (searchable) {
      window.requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, searchable]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const active = rootRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, filteredOptions]);

  function pick(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  }

  function moveActive(delta: number) {
    if (filteredOptions.length === 0) return;
    setActiveIndex((current) => {
      return (current + delta + filteredOptions.length) % filteredOptions.length;
    });
  }

  function onSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option && !option.disabled) pick(option.value);
    }
  }

  return (
    <div
      className={`${styles.root}${className ? ` ${className}` : ""}`}
      data-disabled={disabled ? "true" : undefined}
      data-open={open ? "true" : undefined}
      ref={rootRef}
    >
      <button
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel ?? displayLabel}
        aria-required={required || undefined}
        className={styles.trigger}
        disabled={disabled}
        id={id}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span data-placeholder={!selected ? "true" : undefined}>{displayLabel}</span>
        <FiChevronDown aria-hidden="true" className={styles.chevron} />
      </button>

      {open ? (
        <div className={styles.menuPanel}>
          {searchable ? (
            <div className={styles.search}>
              <FiSearch aria-hidden="true" />
              <input
                aria-autocomplete="list"
                aria-controls={listboxId}
                aria-label={searchPlaceholder}
                autoComplete="off"
                placeholder={searchPlaceholder}
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onSearchKeyDown}
              />
            </div>
          ) : null}
          <ul className={styles.menu} id={listboxId} role="listbox">
            {filteredOptions.length === 0 ? (
              <li className={styles.empty} role="presentation">
                No matches
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <li key={option.value || "__empty"} role="presentation">
                    <button
                      aria-selected={isSelected}
                      className={styles.option}
                      data-active={isActive ? "true" : undefined}
                      disabled={option.disabled}
                      role="option"
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => pick(option.value)}
                    >
                      <span>{option.label}</span>
                      {isSelected ? <FiCheck aria-hidden="true" /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
