"use client";

import Image from "next/image";

interface PaymentHeaderProps {
    shopAvatar?: string;
    shopName?: string;
}

export function PaymentHeader({ shopAvatar, shopName }: PaymentHeaderProps) {
    return (
        <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
            <div className="px-4 py-3 md:px-6 md:py-4 flex items-center justify-center max-w-6xl mx-auto">
                <Image 
                    src="/logoheader.png" 
                    alt="LiveTracker" 
                    width={200} 
                    height={60} 
                    className="h-10 md:h-14 w-auto object-contain" 
                    priority
                />
            </div>
        </header>
    );
}
