export const DEFAULT_CATEGORIES = [
  { name: "Rent", icon: "home", kind: "committed" },
  { name: "Electricity", icon: "zap", kind: "committed" },
  { name: "Water", icon: "droplet", kind: "committed" },
  { name: "Internet", icon: "wifi", kind: "committed" },
  { name: "Loan", icon: "landmark", kind: "committed" },
  { name: "PayLater", icon: "credit-card", kind: "committed" },
  { name: "Credit Card", icon: "credit-card", kind: "committed" },
  { name: "Subscriptions", icon: "repeat", kind: "committed" },
  { name: "Insurance", icon: "shield", kind: "committed" },
  { name: "Gas", icon: "fuel", kind: "actual" },
  { name: "Transportation", icon: "bus", kind: "actual" },
  { name: "Food", icon: "utensils", kind: "actual" },
  { name: "Shopping", icon: "shopping-bag", kind: "actual" },
  { name: "Entertainment", icon: "clapperboard", kind: "actual" },
  { name: "Health", icon: "heart-pulse", kind: "actual" },
  { name: "Personal", icon: "user", kind: "actual" },
  { name: "Miscellaneous", icon: "circle-ellipsis", kind: "actual" }
];

export function iconForCategory(name) {
  const match = DEFAULT_CATEGORIES.find((c) => c.name === name);
  return match ? match.icon : "circle";
}

export function kindForCategory(name) {
  const match = DEFAULT_CATEGORIES.find((c) => c.name === name);
  return match ? match.kind : "actual";
}
