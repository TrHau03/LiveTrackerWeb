import Image from "next/image";

export function PaymentFooter() {
    return (
        <footer className="bg-blue-900 text-blue-100 py-8 md:py-12">
            <div className="max-w-6xl mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    {/* Brand Info */}
                    <div>
                        <div className="mb-4">
                            <a href="https://livetracker.vn" target="_blank" rel="noopener noreferrer" className="inline-block transition-opacity hover:opacity-80">
                                <Image
                                    src="/logo.png"
                                    alt="LiveTracker Logo"
                                    width={160}
                                    height={40}
                                    className="h-10 w-auto object-contain"
                                    style={{ height: 50 }}
                                />
                            </a>
                        </div>
                        <p className="text-sm text-blue-200/80 leading-relaxed">
                            Giải pháp quản lý bán hàng trực tuyến toàn diện cho doanh nghiệp của bạn.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-bold text-white mb-4">Về chúng tôi</h3>
                        <ul className="space-y-3 text-sm">
                            <li>
                                <a href="https://livetracker.vn" target="_blank" rel="noopener noreferrer" className="text-blue-200/80 hover:text-white transition-colors duration-200">
                                    Trang chủ
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-blue-200/80 hover:text-white transition-colors duration-200">
                                    Liên hệ
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-blue-200/80 hover:text-white transition-colors duration-200">
                                    Hỗ trợ
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h3 className="font-bold text-white mb-4">Hỗ trợ khách hàng</h3>
                        <ul className="space-y-3 text-sm text-blue-100/90">
                            <li>
                                <p className="flex items-center gap-2">
                                    <span className="opacity-70">📧</span> Email: support@livetracker.vn
                                </p>
                            </li>
                            <li>
                                <p className="flex items-center gap-2">
                                    <span className="opacity-70">💬</span> Chat: Hỗ trợ 24/7
                                </p>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-blue-800/50 pt-6">
                    <p className="text-center text-sm text-blue-300/60">
                        © 2024 LiveTracker. Tất cả quyền được bảo vệ.
                    </p>
                </div>
            </div>
        </footer>
    );
}
