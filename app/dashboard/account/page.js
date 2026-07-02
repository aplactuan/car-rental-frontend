"use client";

import { useState } from "react";

const inputClass =
  "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
const labelClass = "block text-xs font-medium text-zinc-700";

function extractErrorMessage(data) {
  if (!data || typeof data !== "object") return "";

  if (typeof data.error === "string" && data.error) return data.error;
  if (typeof data.message === "string" && data.message) return data.message;

  const errors = data.errors;
  if (errors && typeof errors === "object") {
    for (const messages of Object.values(errors)) {
      if (Array.isArray(messages) && messages[0]) return String(messages[0]);
      if (typeof messages === "string" && messages) return messages;
    }
  }

  return "";
}

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (password.length < 8) {
      setFormError("New password must be at least 8 characters.");
      return;
    }

    if (password !== passwordConfirmation) {
      setFormError("New password and confirmation do not match.");
      return;
    }

    if (password === currentPassword) {
      setFormError("New password must be different from your current password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          current_password: currentPassword,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFormError(
          extractErrorMessage(data) || "Failed to change password.",
        );
        return;
      }

      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
      setSuccessMessage("Your password has been updated successfully.");
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full pr-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Manage your account settings
        </p>
      </div>

      <section className="mt-8 max-w-lg">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
            Change password
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Enter your current password and choose a new one.
          </p>

          {formError ? (
            <div
              className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {formError}
            </div>
          ) : null}

          {successMessage ? (
            <div
              className="mt-4 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800"
              role="status"
            >
              {successMessage}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="current_password" className={labelClass}>
                Current password
              </label>
              <div className="relative">
                <input
                  id="current_password"
                  type={showCurrentPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`${inputClass} pr-11`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label={
                    showCurrentPassword
                      ? "Hide current password"
                      : "Show current password"
                  }
                >
                  <PasswordToggleIcon visible={showCurrentPassword} />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="new_password" className={labelClass}>
                New password
              </label>
              <div className="relative">
                <input
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-11`}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label={
                    showNewPassword ? "Hide new password" : "Show new password"
                  }
                >
                  <PasswordToggleIcon visible={showNewPassword} />
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Must be at least 8 characters.
              </p>
            </div>

            <div>
              <label htmlFor="password_confirmation" className={labelClass}>
                Confirm new password
              </label>
              <div className="relative">
                <input
                  id="password_confirmation"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  className={`${inputClass} pr-11`}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label={
                    showConfirmPassword
                      ? "Hide password confirmation"
                      : "Show password confirmation"
                  }
                >
                  <PasswordToggleIcon visible={showConfirmPassword} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function PasswordToggleIcon({ visible }) {
  if (visible) {
    return (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}
