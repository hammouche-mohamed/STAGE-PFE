import React from "react";

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-20 bg-gray-200 rounded-md w-full" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-md" />
        ))}
      </div>
      <div className="h-96 bg-gray-200 rounded-md w-full" />
    </div>
  );
}
