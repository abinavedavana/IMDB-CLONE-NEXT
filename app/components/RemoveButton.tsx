"use client";

export default function RemoveButton({ id }: { id: string }) {
  const handleDelete = async () => {
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    window.location.reload();
  };

  return (
    <button
      onClick={handleDelete}
      className="mt-2 text-sm bg-red-600 px-2 py-1 rounded"
    >
      Remove
    </button>
  );
}