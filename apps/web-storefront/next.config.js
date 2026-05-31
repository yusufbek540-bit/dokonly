/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }]
  },
  async redirects() {
    return [
      { source: '/ru', destination: '/', permanent: true },
      { source: '/niches', destination: '/nishi', permanent: true },
      { source: '/help', destination: '/pomoshch', permanent: true },
      { source: '/demo', destination: '/namuna', permanent: true },
      { source: '/pricing', destination: '/tarify', permanent: true },
      { source: '/contact', destination: '/kontakt', permanent: true },
      {
        source: '/blog/create-telegram-store-uzbekistan',
        destination: '/blog/kak-sozdat-telegram-magazin-v-uzbekistane',
        permanent: true,
      },
    ]
  }
}
module.exports = nextConfig
