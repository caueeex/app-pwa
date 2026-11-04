interface ComingSoonProps {
  title: string
  description: string
  icon: string
}

export default function ComingSoon({
  title,
  description,
  icon,
}: ComingSoonProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-6 pb-28 text-center text-white">
      <div className="max-w-sm">
        <div className="mb-5 text-6xl">{icon}</div>

        <p className="mb-2 text-sm font-medium text-green-400">
          Resale Manager
        </p>

        <h1 className="text-3xl font-bold">{title}</h1>

        <p className="mt-3 text-gray-400">{description}</p>

        <div className="mt-6 inline-flex rounded-full border border-gray-700 px-4 py-2 text-sm text-gray-400">
          Em desenvolvimento
        </div>
      </div>
    </main>
  )
}