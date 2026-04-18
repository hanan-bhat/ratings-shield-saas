export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col items-center justify-center px-4">
      {children}
    </div>
  )
}
