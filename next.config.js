/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Intern redirect: /tracking/NS-... → /track/NS-...
      // Bruges af SMS/e-mail tracking-links (PUBLIC_BASE_URL = admin.buildone.dk)
      {
        source: "/tracking/:ref",
        destination: "/track/:ref",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
