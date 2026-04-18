export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafaf8] px-4">
      <div className="mb-8">
        <span className="text-2xl font-bold text-[#0a0a0a] tracking-tight">
          Ratings<span className="text-[#e84c2e]">Shield</span>
        </span>
      </div>
      {children}
    </div>
  )
}
