/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // track.buildone.dk/NS-2026-0001 → /track/NS-2026-0001
      // Giver et rent tracking-link til kunder uden synlig sti
      {
        source: "/:ref(NS-[0-9]+-[0-9]+)",
        destination: "/track/:ref",
        permanent: false,
      },
      // Behold /tracking/:ref som fallback (gammel Cloudflare-regel)
      {
        source: "/tracking/:ref",
        destination: "/track/:ref",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
