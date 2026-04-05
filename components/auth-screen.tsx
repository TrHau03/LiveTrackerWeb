"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, Printer, Layout, Zap, Users } from "lucide-react";

import { useSession } from "@/components/session-provider";

export function AuthScreen() {
  const { isLoggingIn, login, loginError } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await login({ email, password });
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[linear-gradient(180deg,_#00449F_0%,_#3b82f6_50%,_#FFFFFF_100%)] p-4 sm:p-6 lg:p-8 font-sans overflow-hidden">
      {/* Khung chung */}
      <div className="relative w-full max-w-[1320px] h-full max-h-[800px] flex flex-col lg:flex-row overflow-hidden rounded-[40px] lg:rounded-[56px] bg-white/5 backdrop-blur-sm border border-white/10 shadow-2xl">

        {/* Background Decorative Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[100px] pointer-events-none" />

        {/* 2/3 Left Section - Promo Area */}
        <section className="hidden lg:flex w-full lg:w-2/3 flex-col items-start justify-center px-12 xl:px-20 relative z-10">
          <div className="max-w-2xl py-10">
            <h1 className="text-5xl xl:text-6xl font-bold text-white leading-tight tracking-tighter">
              Live Tracker
            </h1>
            <h2 className="mt-6 text-3xl xl:text-4xl font-medium text-white/90 leading-snug">
              Control Room cho đội ngũ bán hàng Realtime
            </h2>
            <p className="mt-8 text-lg xl:text-xl text-white/70 leading-relaxed font-light">
              Theo dõi livestream, tự động hoá chốt đơn, quản lý khách hàng và vận hành kho bãi chỉ trong một nền tảng duy nhất.
            </p>

            <div className="mt-12 xl:mt-16 grid grid-cols-2 gap-8">
              <PromoFeature
                icon={<Zap className="w-5 h-5 text-yellow-300" />}
                title="Realtime Processing"
                desc="Xử lý hàng ngàn bình luận mỗi giây"
              />
              <PromoFeature
                icon={<Layout className="w-5 h-5 text-blue-300" />}
                title="Modern Dashboard"
                desc="Giao diện sạch sẽ, tối ưu vận hành"
              />
            </div>
          </div>

          {/* Mockup Element */}
          <div className="absolute right-[-80px] bottom-[-40px] w-full max-w-[450px] pointer-events-none opacity-60">
            <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-red-400/60" />
                <div className="w-2 h-2 rounded-full bg-yellow-400/60" />
                <div className="w-2 h-2 rounded-full bg-green-400/60" />
              </div>
              <div className="space-y-3">
                <div className="h-3 w-2/3 bg-white/20 rounded" />
                <div className="h-24 w-full bg-white/10 rounded-xl" />
              </div>
            </div>
          </div>
        </section>

        {/* 1/3 Right Section - Login Card area */}
        <section className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-20 h-full overflow-hidden">
          {/* Card đăng nhập nổi lên */}
          <div className="w-full max-w-[420px] bg-white rounded-[32px] lg:rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] p-6 sm:p-8 border border-white relative my-auto flex flex-col shrink-0">
            <div className="lg:hidden absolute -top-10 left-0 right-0 flex justify-center">
              <h1 className="text-2xl font-bold text-white tracking-tight">Live Tracker</h1>
            </div>

            {/* Login Card Header */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 sm:mb-6 flex items-center justify-center">
                <img src="/logoicon.png" alt="Logo" className="w-14 h-14 sm:w-20 sm:h-20 object-contain" />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Đăng nhập</h3>
              <p className="mt-1.5 sm:mt-2 text-slate-500 text-xs sm:text-sm font-medium">Nhập email và mật khẩu để đăng nhập</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 space-y-4 sm:space-y-5">
              <div className="space-y-3">
                <div className="relative group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="w-full h-12 sm:h-14 px-4 sm:px-5 rounded-xl bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-sm"
                  />
                </div>

                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    minLength={6}
                    className="w-full h-12 sm:h-14 px-4 sm:px-5 rounded-xl bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-2 sm:p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[10px] sm:text-xs font-medium">
                  {loginError}
                </div>
              )}

              <div className="space-y-3 pt-1">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full h-12 sm:h-14 flex items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>

                <button
                  type="button"
                  className="w-full h-12 sm:h-14 flex items-center justify-center rounded-xl bg-transparent border-2 border-blue-100 text-blue-600 font-bold text-sm sm:text-base hover:bg-blue-50 hover:border-blue-200 transition-all"
                >
                  Đăng ký
                </button>
              </div>

              <div className="flex justify-center">
                <button type="button" className="text-[10px] sm:text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-wider">
                  Quên mật khẩu?
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

function PromoFeature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
        {icon}
      </div>
      <div>
        <h4 className="text-white font-bold text-lg">{title}</h4>
        <p className="text-white/60 text-sm">{desc}</p>
      </div>
    </div>
  );
}
