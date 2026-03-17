export const MODULE_LABELS: Record<string, string> = {
  cafeDaManha: "Cafe da Manha",
  almoco: "Almoco",
  lanche: "Lanche",
  jantar: "Jantar",
  doce: "Doce",
  extra: "Extra",
};

export const MODULE_ICONS: Record<string, string> = {
  cafeDaManha: "coffee",
  almoco: "utensils",
  lanche: "apple",
  jantar: "moon",
  doce: "candy",
  extra: "plus-circle",
};

export const MODULE_ORDER = [
  "cafeDaManha",
  "almoco",
  "lanche",
  "jantar",
  "doce",
] as const;

export type ModuleKey = (typeof MODULE_ORDER)[number] | "extra";

export function formatKcal(value: number): string {
  return Math.round(value).toLocaleString("pt-BR");
}

export function formatGrams(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

export function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}
