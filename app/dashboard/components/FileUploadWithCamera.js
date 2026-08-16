"use client";

import { useId, useState } from "react";
import { prepareFilesForUpload } from "@/app/dashboard/lib/prepareImageForUpload";

const DEFAULT_INPUT_CLASS =
  "w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200 disabled:cursor-not-allowed";

const DEFAULT_CAMERA_BUTTON_CLASS =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50";

const HEIC_ACCEPT_EXTRA =
  ".heic,.heif,image/heic,image/heif,image/heic-sequence,image/heif-sequence";

function withHeicAccept(accept) {
  const value = String(accept || "").trim();
  if (!value) return HEIC_ACCEPT_EXTRA;
  if (/\.heic\b|image\/heic/i.test(value)) return value;
  return `${value},${HEIC_ACCEPT_EXTRA}`;
}

/**
 * File picker plus optional “Take photo” (rear camera on supporting mobile browsers).
 * HEIC/HEIF and large camera images are converted/compressed to JPEG before upload.
 */
export default function FileUploadWithCamera({
  id,
  accept,
  multiple = false,
  disabled = false,
  onFilesChange,
  existingFiles = null,
  inputClassName = DEFAULT_INPUT_CLASS,
  cameraButtonClassName = DEFAULT_CAMERA_BUTTON_CLASS,
  className = "",
}) {
  const generatedCameraInputId = useId();
  const cameraInputId = `${id || generatedCameraInputId}-camera`;
  const [selectedNames, setSelectedNames] = useState([]);
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState("");

  const resolvedAccept = withHeicAccept(accept);
  const isDisabled = disabled || isConverting;

  function emitFiles(files) {
    const list = Array.isArray(files) ? files : [];
    setSelectedNames(list.map((file) => file.name).filter(Boolean));
    onFilesChange?.(list);
  }

  async function processAndEmit(
    incomingFiles,
    { append = false, forceCompress = false } = {},
  ) {
    const incoming = Array.isArray(incomingFiles) ? incomingFiles : [];
    if (incoming.length === 0) return;

    setConvertError("");
    setIsConverting(true);
    try {
      const processed = await prepareFilesForUpload(incoming, {
        forceCompress,
      });
      if (append && Array.isArray(existingFiles)) {
        emitFiles([...existingFiles, ...processed]);
      } else {
        emitFiles(processed);
      }
    } catch (error) {
      console.error(error);
      setConvertError(
        "Could not convert image for upload. Try another photo or format.",
      );
    } finally {
      setIsConverting(false);
    }
  }

  function handlePickerChange(event) {
    const files = Array.from(event.target.files ?? []);
    void processAndEmit(files);
  }

  function handleCameraChange(event) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    // Always convert/compress camera shots — iOS often returns HEIC or
    // multi-MB JPEGs that exceed the Next.js proxy body limit (413).
    void processAndEmit([file], {
      append: multiple && Array.isArray(existingFiles),
      forceCompress: true,
    });
  }

  const namesToShow =
    selectedNames.length > 0
      ? selectedNames
      : Array.isArray(existingFiles)
        ? existingFiles.map((file) => file?.name).filter(Boolean)
        : [];

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id={id}
          type="file"
          accept={resolvedAccept}
          multiple={multiple}
          onChange={handlePickerChange}
          disabled={isDisabled}
          className={`min-w-0 flex-1 ${inputClassName}`.trim()}
        />
        <input
          id={cameraInputId}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={handleCameraChange}
          disabled={isDisabled}
        />
        <label
          htmlFor={isDisabled ? undefined : cameraInputId}
          aria-disabled={isDisabled}
          role="button"
          tabIndex={isDisabled ? -1 : 0}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            document.getElementById(cameraInputId)?.click();
          }}
          className={`${cameraButtonClassName} ${
            isDisabled ? "pointer-events-none cursor-not-allowed opacity-50" : "cursor-pointer"
          }`.trim()}
        >
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {isConverting ? "Converting…" : "Take Photo"}
        </label>
      </div>
      {isConverting ? (
        <p className="mt-2 text-xs text-zinc-500">Preparing image for upload…</p>
      ) : null}
      {convertError ? (
        <p className="mt-2 text-xs text-red-600">{convertError}</p>
      ) : null}
      {!isConverting && namesToShow.length > 0 ? (
        <p className="mt-2 text-xs text-zinc-500">
          {namesToShow.length === 1
            ? namesToShow[0]
            : `${namesToShow.length} files: ${namesToShow.join(", ")}`}
        </p>
      ) : null}
    </div>
  );
}
