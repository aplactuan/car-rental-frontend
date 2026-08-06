"use client";

import { useRef, useState } from "react";

const DEFAULT_INPUT_CLASS =
  "w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200 disabled:cursor-not-allowed";

const DEFAULT_CAMERA_BUTTON_CLASS =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * File picker plus optional “Take photo” (rear camera on supporting mobile browsers).
 * Camera captures are always images; the main input keeps the full `accept` list.
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
  const cameraInputRef = useRef(null);
  const [selectedNames, setSelectedNames] = useState([]);

  function emitFiles(files) {
    const list = Array.isArray(files) ? files : [];
    setSelectedNames(list.map((file) => file.name).filter(Boolean));
    onFilesChange?.(list);
  }

  function handlePickerChange(event) {
    emitFiles(Array.from(event.target.files ?? []));
  }

  function handleCameraChange(event) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    if (multiple && Array.isArray(existingFiles)) {
      emitFiles([...existingFiles, file]);
      return;
    }

    emitFiles([file]);
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
          accept={accept}
          multiple={multiple}
          onChange={handlePickerChange}
          disabled={disabled}
          className={`min-w-0 flex-1 ${inputClassName}`.trim()}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={handleCameraChange}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
          className={cameraButtonClassName}
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
          Take photo
        </button>
      </div>
      {namesToShow.length > 0 ? (
        <p className="mt-2 text-xs text-zinc-500">
          {namesToShow.length === 1
            ? namesToShow[0]
            : `${namesToShow.length} files: ${namesToShow.join(", ")}`}
        </p>
      ) : null}
    </div>
  );
}
