/** Attachment type — shared by FileUpload, the entry types in
 *  store.ts, and any export / display surface that needs to render
 *  an attachment thumbnail. Lives in lib so store.ts can reference
 *  it without a backwards import from a component. */
export type AttachmentKind =
  | "photo"
  | "letter"
  | "medical-report"
  | "test-result"
  | "scan"
  | "prescription"
  | "other";

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
