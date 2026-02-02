"use client";

import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./Map"), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-gray-50 rounded-xl">
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-10 w-10 bg-gray-200 rounded-full mb-4"></div>
                <div className="text-gray-400 font-medium">Loading Map...</div>
            </div>
        </div>
    ),
});

export default MapComponent;
