"use client";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { Camera, FileText, Trash2, Upload, Eye } from "lucide-react";
import { useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { DateInput } from "./ui";

export type AttachmentKind =
  | "photo"
  | "letter"
  | "medical-report"
  | "test-result"
  | "scan"
  | "prescription"
  | "other";

const ATTACHMENT_KIND_OPTIONS: { value: AttachmentKind; label: string }[] = [
  { value: "photo", label: "Photo" },
  { value: "letter", label: "Letter" },
  { value: "medical-report", label: "Medical report" },
  { value: "test-result", label: "Test result" },
  { value: "scan", label: "Scan / imaging" },
  { value: "prescription", label: "Prescription" },
  { value: "other", label: "Other" },
];

export type Attachment = {
  id: string;
  name: string;
  url: string;
  storagePath?: string;
  /** Mime-derived bucket — image / pdf / other. Drives the thumbnail. */
  type: string;
  /** Stamp set by the upload flow. ISO string. */
  uploadedAt: string;
  /** What kind of document this is (photo / letter / medical report …).
   *  Set by the user after upload via the inline picker; legacy
   *  attachments without a kind render an empty picker prompting the
   *  user to set one. */
  kind?: AttachmentKind;
  /** The date the document is from (e.g. the date a letter was
   *  written, the day a scan was performed). Distinct from
   *  uploadedAt. yyyy-MM-dd. */
  documentDate?: string;
};

const KIND_LABEL: Record<AttachmentKind, string> = Object.fromEntries(
  ATTACHMENT_KIND_OPTIONS.map((o) => [o.value, o.label]),
) as Record<AttachmentKind, string>;

export function FileUpload({
  attachments,
  onChange,
  label = "Attachments",
}: {
  attachments: Attachment[];
  onChange: (files: Attachment[]) => void;
  label?: string;
}) {
  const { activePatientId } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const sb = supabase();
    if (!sb || !activePatientId) return;

    setUploading(true);
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${activePatientId}/${crypto.randomUUID()}.${ext}`;

      const { error } = await sb.storage.from("attachments").upload(path, file);
      if (error) {
        console.error("Upload failed:", error);
        continue;
      }

      const { data: urlData } = await sb.storage.from("attachments").createSignedUrl(path, 31536000);

      const type = file.type.startsWith("image/") ? "image"
        : file.type === "application/pdf" ? "pdf"
        : "other";

      // Default kind: photos guess "photo", everything else stays
      // unset so the user is prompted to pick. Document date defaults
      // to today — almost always close enough for photos taken now,
      // and trivially editable when the doc is older.
      const defaultKind: AttachmentKind | undefined = type === "image" ? "photo" : undefined;

      newAttachments.push({
        id: crypto.randomUUID(),
        name: file.name,
        url: urlData?.signedUrl ?? "",
        storagePath: path,
        type,
        uploadedAt: new Date().toISOString(),
        kind: defaultKind,
        documentDate: format(new Date(), "yyyy-MM-dd"),
      });
    }

    onChange([...attachments, ...newAttachments]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const updateAttachment = (id: string, patch: Partial<Attachment>) => {
    onChange(attachments.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const remove = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  return (
    <div>
      <div className="text-sm font-medium mb-2">{label}</div>

      {attachments.length > 0 && (
        <div className="space-y-2 mb-3">
          {attachments.map((a) => (
            <div key={a.id} className="rounded-xl border border-[var(--border)] p-2 space-y-2">
              <div className="flex items-center gap-2">
                {a.type === "image" ? (
                  <img src={a.url} alt={a.name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-[var(--surface-soft)] flex items-center justify-center shrink-0">
                    <FileText size={20} className="text-[var(--ink-soft)]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.name}</div>
                  <div className="text-[10px] text-[var(--ink-soft)]">
                    Uploaded {format(parseISO(a.uploadedAt), "d MMM yyyy · h:mm a")}
                  </div>
                </div>
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-[var(--primary)]">
                  <Eye size={16} />
                </a>
                <button type="button" onClick={() => remove(a.id)} className="p-1.5 text-[var(--ink-soft)]">
                  <Trash2 size={16} />
                </button>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-0.5">
                  Document type
                </div>
                <div className="flex flex-wrap gap-1">
                  {ATTACHMENT_KIND_OPTIONS.map((opt) => {
                    const on = a.kind === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateAttachment(a.id, { kind: on ? undefined : opt.value })}
                        className={
                          on
                            ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2 py-0.5 text-[11px] font-medium text-white"
                            : "rounded-lg border border-dashed border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--ink-soft)]"
                        }
                      >
                        {on ? "✓" : "+"} {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-0.5">
                  Document date
                </div>
                <DateInput
                  value={a.documentDate ?? ""}
                  onChange={(e) => updateAttachment(a.id, { documentDate: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-3 text-sm text-[var(--ink-soft)]"
        >
          <Upload size={16} /> {uploading ? "Uploading..." : "Upload file"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (fileRef.current) {
              fileRef.current.accept = "image/*";
              fileRef.current.capture = "environment";
              fileRef.current.click();
              setTimeout(() => { if (fileRef.current) { fileRef.current.accept = "image/*,.pdf,.jpg,.jpeg,.png,.heic"; fileRef.current.removeAttribute("capture"); } }, 100);
            }
          }}
          disabled={uploading}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-4 py-3 text-sm text-[var(--ink-soft)]"
        >
          <Camera size={16} />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf,.jpg,.jpeg,.png,.heic"
        multiple
        className="hidden"
        onChange={(e) => upload(e.target.files)}
      />
    </div>
  );
}

/** Display attachments in read-only mode (for export) */
export function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="mt-2">
      <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Attachments</div>
      <div className="flex flex-wrap gap-2">
        {attachments.map((a) => (
          <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="block">
            {a.type === "image" ? (
              <div className="space-y-1">
                <img src={a.url} alt={a.name} className="h-20 w-auto rounded-lg border border-[var(--border)] object-cover" />
                <AttachmentMetaLine attachment={a} />
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs">
                  <FileText size={14} className="text-[var(--ink-soft)]" />
                  <span className="truncate max-w-[120px]">{a.name}</span>
                </div>
                <AttachmentMetaLine attachment={a} />
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

function AttachmentMetaLine({ attachment }: { attachment: Attachment }) {
  const parts: string[] = [];
  if (attachment.kind) parts.push(KIND_LABEL[attachment.kind]);
  if (attachment.documentDate) {
    try { parts.push(format(parseISO(attachment.documentDate), "d MMM yyyy")); }
    catch { /* ignore parse errors */ }
  }
  if (parts.length === 0) return null;
  return (
    <div className="text-[10px] text-[var(--ink-soft)] truncate max-w-[160px]">
      {parts.join(" · ")}
    </div>
  );
}
