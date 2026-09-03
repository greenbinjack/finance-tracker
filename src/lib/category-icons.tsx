import {
  Utensils,
  Car,
  ShoppingCart,
  Receipt,
  ShoppingBag,
  HeartPulse,
  Film,
  BookOpen,
  Home,
  MoreHorizontal,
  Wallet,
  Briefcase,
  Gift,
  PlusCircle,
  Tag,
  type LucideIcon,
} from "lucide-react";

/**
 * Categories store an icon name (seeded as kebab-case, e.g. "shopping-cart")
 * but nothing rendered it until now — every transaction row showed the same
 * generic direction arrow regardless of category. This maps the stored name
 * to an actual icon, with a sane fallback for user-created custom categories
 * (which don't get an icon assigned at creation time).
 */
const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  "shopping-cart": ShoppingCart,
  receipt: Receipt,
  "shopping-bag": ShoppingBag,
  "heart-pulse": HeartPulse,
  film: Film,
  "book-open": BookOpen,
  home: Home,
  "more-horizontal": MoreHorizontal,
  wallet: Wallet,
  briefcase: Briefcase,
  gift: Gift,
  "plus-circle": PlusCircle,
};

function resolveCategoryIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return Tag;
  return ICON_MAP[iconName] ?? Tag;
}

/**
 * Renders the icon element directly (rather than returning a component
 * reference for the caller to use as a JSX tag) so call sites don't trip
 * react-hooks/static-components — the icon set is a fixed, module-level
 * lookup, but the lint rule can't tell that from a returned component type.
 */
export function renderCategoryIcon(iconName: string | null | undefined, className?: string) {
  const Icon = resolveCategoryIcon(iconName);
  return <Icon className={className} />;
}
