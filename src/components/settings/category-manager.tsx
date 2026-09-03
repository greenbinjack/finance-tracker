"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EditableEntityList } from "./editable-entity-list";
import {
  createSettingsCategoryAction,
  renameCategoryAction,
  deleteCategoryAction,
} from "@/app/(app)/settings/actions";

export interface CategoryItem {
  id: string;
  name: string;
  type: "expense" | "income";
}

export function CategoryManager({ categories }: { categories: CategoryItem[] }) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const filtered = categories.filter((c) => c.type === type);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "relative rounded-md py-1.5 text-sm font-medium capitalize transition-colors",
              type === t ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {type === t && (
              <motion.span
                layoutId="settings-category-type-pill"
                className="absolute inset-0 rounded-md bg-background shadow-sm"
                transition={{ duration: 0.2 }}
              />
            )}
            <span className="relative">{t}</span>
          </button>
        ))}
      </div>

      <EditableEntityList
        items={filtered.map((c) => ({ id: c.id, label: c.name }))}
        createPlaceholder={`New ${type} category`}
        onCreate={(name) => createSettingsCategoryAction(name, type)}
        onRename={renameCategoryAction}
        onDelete={deleteCategoryAction}
      />
    </div>
  );
}
