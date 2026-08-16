/** @type {import('next').NextConfig} */

const remotePatterns = [];

const logoUrl = process.env.NEXT_PUBLIC_COMPANY_LOGO_URL;
if (logoUrl) {
  try {
    const { protocol, hostname, port } = new URL(logoUrl);
    // Only add remote pattern for external URLs (http/https with a real hostname)
    if (protocol === "https:" || protocol === "http:") {
      remotePatterns.push({
        protocol: protocol.replace(":", ""),
        hostname,
        ...(port ? { port } : {}),
        pathname: "/**",
      });
    }
  } catch {
    // Relative path like /logo.png — no remote pattern needed
  }
}

const nextConfig = {
  images: {
    remotePatterns,
  },
  // Allow PO/invoice attachments up to the UI's 10 MB-per-file guidance.
  // Without this, the App Router proxy can reject or truncate large camera
  // uploads (often HEIC/JPEG) with HTTP 413.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
    proxyClientMaxBodySize: "12mb",
  },
};

export default nextConfig;
