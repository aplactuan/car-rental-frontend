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
};

export default nextConfig;
