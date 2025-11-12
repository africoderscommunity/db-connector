import React from "react";
import { Database } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center text-gray-500">
      <div className="text-center">
        <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-xl">Select a connection to get started</p>
        <p className="text-sm mt-2">or click "New Connection" to add one</p>
      </div>
    </div>
  );
}
