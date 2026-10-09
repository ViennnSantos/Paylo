const SYMBOLS = { PHP: "₱", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };

let activeCurrency = "PHP";

export function setActiveCurrency(code) {
  activeCurrency = code || "PHP";
}

export function getCurrencySymbol(code = activeCurrency) {
  return SYMBOLS[code] || code;
}

export function formatCurrency(amount, code = activeCurrency) {
  const num = Number(amount) || 0;
  const symbol = getCurrencySymbol(code);
  return symbol + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const CURRENCY_OPTIONS = [
  { code: "PHP", label: "Philippine Peso (₱)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "JPY", label: "Japanese Yen (¥)" }
];
