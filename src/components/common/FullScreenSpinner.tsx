"use client";

export function FullScreenSpinner() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md text-white">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-transparent border-white"></div>
      <p className="mt-4 font-medium tracking-wide">Loading...</p>
    </div>
  );
}
