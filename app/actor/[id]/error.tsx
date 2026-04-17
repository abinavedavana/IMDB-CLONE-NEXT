
"use client";

export default function ActorError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
      <p className="text-xl">Something went wrong loading this actor.</p>
      <button
        onClick={reset}
        className="bg-yellow-500 text-black px-6 py-2 rounded-lg font-semibold hover:bg-yellow-400"
      >
        Try Again
      </button>
    </div>
  );
}