export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Page not found</h2>
        <p className="text-zinc-500">The page you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    </div>
  );
}
