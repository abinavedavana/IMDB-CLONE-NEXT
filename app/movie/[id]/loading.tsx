export default function MovieLoading() {
  return (
    <div className="text-white bg-black min-h-screen animate-pulse">
      {/* Hero skeleton */}
      <div className="relative h-[80vh] w-full bg-gray-900" />

      <div className="px-20 py-16 grid grid-cols-3 gap-12">
        <div className="col-span-2 space-y-6">
          <div className="h-6 bg-gray-800 rounded w-1/3" />
          <div className="h-4 bg-gray-800 rounded w-full" />
          <div className="h-4 bg-gray-800 rounded w-5/6" />
          <div className="h-4 bg-gray-800 rounded w-4/6" />

          {/* Carousel skeleton */}
          <div className="aspect-video w-full bg-gray-800 rounded-xl mt-8" />

          {/* Cast skeleton */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-800 rounded-xl" />
            ))}
          </div>
        </div>

        <div className="h-64 bg-gray-800 rounded-xl" />
      </div>
    </div>
  );
}