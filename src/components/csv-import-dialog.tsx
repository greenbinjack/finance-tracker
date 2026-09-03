"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { previewCsvImportAction, commitCsvImportAction } from "@/app/(app)/transactions/actions";
import type { CsvImportRow, CsvImportError } from "@/lib/domain/csv-import";

type Stage = "pick" | "preview" | "done";

export function CsvImportDialog() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("pick");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<CsvImportRow[]>([]);
  const [errors, setErrors] = useState<CsvImportError[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStage("pick");
    setFileName("");
    setRows([]);
    setErrors([]);
    setImportedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    setIsPending(true);
    try {
      const text = await file.text();
      const result = await previewCsvImportAction(text);
      setRows(result.rows);
      setErrors(result.errors);
      setStage("preview");
    } catch {
      toast.error("Couldn't read that file. Please make sure it's a CSV.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setIsPending(true);
    try {
      const count = await commitCsvImportAction(rows);
      setImportedCount(count);
      setStage("done");
      toast.success(`Imported ${count} transaction${count === 1 ? "" : "s"}`);
    } catch {
      toast.error("Couldn't import those transactions. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger className="inline-flex">
        <Button type="button" variant="outline" nativeButton={false} render={<span><Upload className="h-4 w-4" />Import transactions (CSV)</span>} />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import transactions</DialogTitle>
        </DialogHeader>

        {stage === "pick" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              A CSV with columns <code className="text-xs">Date, Type, Amount</code> (and optionally{" "}
              <code className="text-xs">Category, Account, Note</code>) — the same shape as &quot;Export
              transactions (CSV)&quot; produces. Dates must be YYYY-MM-DD. Transfers aren&apos;t supported.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
              className="text-sm"
            />
          </div>
        )}

        {stage === "preview" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              <span className="font-medium">{fileName}</span> — {rows.length} row{rows.length === 1 ? "" : "s"} ready
              to import{errors.length > 0 ? `, ${errors.length} skipped` : ""}.
            </p>
            {errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-2">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Skipped rows:</p>
                <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  {errors.map((e, i) => (
                    <li key={i}>
                      Line {e.line}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {stage === "done" && (
          <p className="text-sm text-muted-foreground">
            Imported {importedCount} transaction{importedCount === 1 ? "" : "s"}. You can close this and check your
            history.
          </p>
        )}

        <DialogFooter>
          {stage === "preview" && (
            <>
              <Button type="button" variant="ghost" onClick={reset} disabled={isPending}>
                Choose a different file
              </Button>
              <Button type="button" disabled={rows.length === 0 || isPending} onClick={handleImport}>
                {isPending ? "Importing..." : `Import ${rows.length} transaction${rows.length === 1 ? "" : "s"}`}
              </Button>
            </>
          )}
          {stage === "done" && (
            <Button type="button" onClick={() => setOpen(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
