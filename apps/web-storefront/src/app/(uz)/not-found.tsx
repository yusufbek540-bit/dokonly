export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-6">
        <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1
          className="text-2xl font-bold text-gray-900 mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Sahifa topilmadi
        </h1>
        <p className="text-gray-500 mb-6">
          Bunday sahifa mavjud emas. URL manzilni tekshirib, qayta urinib ko'ring.
        </p>
        <a
          href="/uz"
          className="inline-flex items-center gap-2 text-sm font-medium text-white px-5 py-2.5 rounded-full"
          style={{ background: 'var(--accent)' }}
        >
          Bosh sahifaga
        </a>
      </div>
    </div>
  )
}
