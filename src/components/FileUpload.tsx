"use client";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { Camera, FileText, Trash2, Upload, Eye } from "lucide-react";
import { useRef, useState } from "react";

export type Attachment = {
  id: string;
  name: string;
  url: string;
  type: string; // "image" | "pdf" | "other"
  uploadedAt: string;
};

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

      const { data: urlData } = sb.storage.from("attachments").getPublicUrl(path);

      const type = file.type.startsWith("image/") ? "image"
        : file.type === "application/pdf" ? "pdf"
        : "other";

      newAttachments.push({
        id: crypto.randomUUID(),
        name: file.name,
        url: urlData.publicUrl,
        type,
        uploadedAt: new Date().toISOString(),
      });
    }

    onChange([...attachments, ...newAttachments]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  return (
    <div>
      <div className="text-sm font-medium mb-2">{label}</div>

      {/* Existing attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2 mb-3">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-2">
              {a.type === "image" ? (
                <img src={a.url} alt={a.name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-[var(--surface-soft)] flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-[var(--ink-soft)]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{a.name}</div>
                <div className="text-xs text-[var(--ink-soft)]">{a.type === "image" ? "Photo" : a.type === "pdf" ? "PDF" : "File"}</div>
              </div>
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-[var(--primary)]">
                <Eye size={16} />
              </a>
              <button type="button" onClick={() => remove(a.id)} className="p-1.5 text-[var(--ink-soft)]">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload buttons */}
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
              // Reset accept after click
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
              <img src={a.url} alt={a.name} className="h-20 w-auto rounded-lg border border-[var(--border)] object-cover" />
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs">
                <FileText size={14} className="text-[var(--ink-soft)]" />
                <span className="truncate max-w-[120px]">{a.name}</span>
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
