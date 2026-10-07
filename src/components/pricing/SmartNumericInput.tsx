import React, { useState, useEffect, useRef } from "react";
import { X, Plus, Minus, RotateCcw } from "lucide-react";

export interface SmartNumericInputProps {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  step?: number;
  min?: number;
  max?: number;
  prefix?: string | React.ReactNode;
  suffix?: string | React.ReactNode;
  allowDecimals?: boolean;
  allowZero?: boolean;
  clearable?: boolean;
  showSteppers?: boolean;
  id?: string;
  name?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  quickStep?: number;
  ariaLabel?: string;
}

export function parseFlexibleNumber(raw: string | number | undefined | null): number {
  if (raw === undefined || raw === null || raw === "") return 0;
  if (typeof raw === "number") return isNaN(raw) ? 0 : raw;
  const str = String(raw).trim();
  if (!str) return 0;

  // Handle Brazilian Portuguese comma decimal separator
  if (str.includes(",")) {
    const clean = str.replace(/\./g, "").replace(",", ".");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Handle dot as decimal separator
  const dotCount = (str.match(/\./g) || []).length;
  if (dotCount === 1) {
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  } else if (dotCount > 1) {
    // Thousands separator e.g. 1.000.000
    const clean = str.replace(/\./g, "");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatSmartDisplay(val: number, allowDecimals = true): string {
  if (val === 0) return "0";
  if (!allowDecimals) return String(Math.round(val));
  // If integer, return without decimals
  if (Number.isInteger(val)) return String(val);
  // Max 2 decimals, replace dot with comma for natural PT-BR editing or keep readable
  const formatted = val % 1 === 0 ? String(val) : String(Number(val.toFixed(2)));
  return formatted.replace(".", ",");
}

export const SmartNumericInput: React.FC<SmartNumericInputProps> = ({
  value,
  onChange,
  placeholder = "0",
  className = "",
  step = 1,
  min = 0,
  max,
  prefix,
  suffix,
  allowDecimals = true,
  allowZero = true,
  clearable = true,
  showSteppers = false,
  id,
  name,
  autoFocus = false,
  disabled = false,
  onFocus,
  onBlur,
  quickStep,
  ariaLabel
}) => {
  const isEditingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize display string
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value === 0 && !allowZero) return "";
    return formatSmartDisplay(value, allowDecimals);
  });

  // Sync with external value changes ONLY when the user is not actively typing in this input
  useEffect(() => {
    if (!isEditingRef.current) {
      if (value === 0 && !allowZero) {
        setDisplayValue("");
      } else {
        setDisplayValue(formatSmartDisplay(value, allowDecimals));
      }
    }
  }, [value, allowDecimals, allowZero]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // Allow typing only numbers, commas, and dots
    raw = raw.replace(/[^0-9.,]/g, "");

    // Avoid multiple decimal points or commas
    const commas = (raw.match(/,/g) || []).length;
    const dots = (raw.match(/\./g) || []).length;
    if (commas + dots > 1) {
      // Keep only first separator
      let foundSeparator = false;
      raw = raw
        .split("")
        .filter((char) => {
          if (char === "," || char === ".") {
            if (!foundSeparator) {
              foundSeparator = true;
              return true;
            }
            return false;
          }
          return true;
        })
        .join("");
    }

    // If user starts typing a number and it starts with "0" followed by a non-separator digit, remove leading "0"
    // e.g. "05" becomes "5", "035" becomes "35"
    if (/^0[0-9]/.test(raw)) {
      raw = raw.replace(/^0+/, "");
      if (raw === "") raw = "0";
    }

    setDisplayValue(raw);

    // If empty, notify parent as 0 (or empty state) but KEEP display empty so user can freely type!
    if (raw === "" || raw === "," || raw === ".") {
      onChange(0);
      return;
    }

    const num = parseFlexibleNumber(raw);
    if (!isNaN(num)) {
      let finalNum = num;
      if (min !== undefined && finalNum < min) finalNum = min;
      if (max !== undefined && finalNum > max) finalNum = max;
      onChange(finalNum);
    }
  };

  const handleFocusInternal = (e: React.FocusEvent<HTMLInputElement>) => {
    isEditingRef.current = true;
    // Auto-select text on focus so user can immediately type a replacement number
    e.target.select();
    if (onFocus) onFocus(e);
  };

  const handleBlurInternal = (e: React.FocusEvent<HTMLInputElement>) => {
    isEditingRef.current = false;
    let finalStr = displayValue.trim();

    if (finalStr === "" || finalStr === "," || finalStr === ".") {
      if (allowZero) {
        setDisplayValue("0");
        onChange(0);
      } else {
        setDisplayValue(String(min || 0));
        onChange(min || 0);
      }
    } else {
      const parsed = parseFlexibleNumber(finalStr);
      let sanitized = isNaN(parsed) ? 0 : parsed;
      if (min !== undefined && sanitized < min) sanitized = min;
      if (max !== undefined && sanitized > max) sanitized = max;

      setDisplayValue(formatSmartDisplay(sanitized, allowDecimals));
      onChange(sanitized);
    }

    if (onBlur) onBlur(e);
  };

  // One-click zero/clear handler
  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDisplayValue("");
    onChange(0);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Step increment/decrement handlers
  const handleStep = (delta: number) => {
    const current = parseFlexibleNumber(displayValue) || 0;
    let next = current + delta;
    if (!allowDecimals) next = Math.round(next);
    else next = Number(next.toFixed(2));
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;
    setDisplayValue(formatSmartDisplay(next, allowDecimals));
    onChange(next);
  };

  const hasValue = displayValue !== "" && displayValue !== "0";

  return (
    <div className="relative flex items-center w-full">
      {prefix && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold select-none text-xs sm:text-sm">
          {prefix}
        </div>
      )}

      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode={allowDecimals ? "decimal" : "numeric"}
        autoComplete="off"
        disabled={disabled}
        autoFocus={autoFocus}
        value={displayValue}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={handleFocusInternal}
        onBlur={handleBlurInternal}
        aria-label={ariaLabel}
        className={`w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none transition-all placeholder:text-slate-600 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 ${
          prefix ? "pl-9" : ""
        } ${suffix || clearable || showSteppers ? "pr-14" : ""} ${className}`}
      />

      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {/* Clear / Zerar button if field has content */}
        {clearable && hasValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            title="Zerar / Apagar campo"
            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Stepper buttons if enabled */}
        {showSteppers && !disabled && (
          <div className="flex items-center border-l border-white/10 pl-1 gap-0.5">
            <button
              type="button"
              onClick={() => handleStep(-(quickStep || step))}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              title={`Diminuir ${quickStep || step}`}
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleStep(quickStep || step)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              title={`Aumentar ${quickStep || step}`}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Suffix label (e.g. "g", "kg", "%", "un") */}
        {suffix && (
          <div className="text-slate-400 font-bold select-none text-xs sm:text-sm pl-1 pr-1 pointer-events-none">
            {suffix}
          </div>
        )}
      </div>
    </div>
  );
};
