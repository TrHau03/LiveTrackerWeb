"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, Zap, Layout } from "lucide-react";

import { useSession } from "@/components/session-provider";

export function AuthScreen() {
  const { isLoggingIn, login, loginError, register } = useSession();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "login") {
      await login({ email, password });
    } else {
      setRegisterError("");
      setRegisterSuccess("");

      if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
        setRegisterError("Vui lòng điền đầy đủ tất cả các trường.");
        return;
      }
      if (!EMAIL_REGEX.test(email.trim().toLowerCase())) {
        setRegisterError("Email không đúng định dạng.");
        return;
      }
      if (password.length < 6) {
        setRegisterError("Mật khẩu phải chứa ít nhất 6 ký tự.");
        return;
      }
      if (password !== confirmPassword) {
        setRegisterError("Mật khẩu xác nhận không khớp.");
        return;
      }

      setIsSubmittingRegister(true);
      const res = await register({
        email: email.trim(),
        password,
        confirmPassword,
        username: username.trim() || undefined,
        fullName: fullName.trim() || undefined,
      });
      setIsSubmittingRegister(false);

      if (res.success) {
        setRegisterSuccess(res.message);
        setPassword("");
        setConfirmPassword("");
        setUsername("");
        setFullName("");
        setTimeout(() => {
          setMode("login");
          setRegisterSuccess("");
        }, 2000);
      } else {
        setRegisterError(res.message);
      }
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--background)] p-4 sm:p-6 lg:p-8 font-sans overflow-hidden">
      {/* Main container */}
      <div className="relative w-full max-w-[1100px] h-full max-h-[720px] flex flex-col lg:flex-row overflow-hidden rounded-2xl lg:rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-strong)]">

        {/* Left Section - Promo Area */}
        <section className="hidden lg:flex w-full lg:w-3/5 flex-col items-start justify-center px-12 xl:px-16 relative z-10 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="max-w-lg py-8">
            <h1 className="text-4xl xl:text-5xl font-bold text-[var(--foreground)] leading-tight tracking-tight">
              Live Tracker
            </h1>
            <h2 className="mt-4 text-xl xl:text-2xl font-semibold text-[var(--foreground-soft)] leading-snug">
              Control Room cho đội ngũ bán hàng Realtime
            </h2>
            <p className="mt-6 text-sm text-[var(--muted)] leading-relaxed">
              Theo dõi livestream, tự động hoá chốt đơn, quản lý khách hàng và vận hành kho bãi chỉ trong một nền tảng duy nhất.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-6">
              <PromoFeature
                icon={<Zap className="w-4 h-4 text-[var(--primary)]" />}
                title="Realtime Processing"
                desc="Xử lý hàng ngàn bình luận mỗi giây"
              />
              <PromoFeature
                icon={<Layout className="w-4 h-4 text-[var(--primary)]" />}
                title="Modern Dashboard"
                desc="Giao diện sạch sẽ, tối ưu vận hành"
              />
            </div>
          </div>
        </section>

        {/* Right Section - Login/Register Card */}
        <section className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-20 h-full overflow-hidden bg-[var(--surface)]">
          <div className="w-full max-w-[380px] my-auto flex flex-col max-h-full overflow-y-auto pr-1 select-none">
            <div className="lg:hidden mb-6 text-center">
              <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">Live Tracker</h1>
            </div>

            {/* Card Header */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex items-center justify-center">
                <img src="/logoicon.png" alt="Logo" className="w-14 h-14 sm:w-16 sm:h-16 object-contain animate-fade-in" />
              </div>

              <h3 className="text-xl font-bold text-[var(--foreground)] tracking-tight transition-all duration-300">
                {mode === "login" ? "Đăng nhập" : "Đăng ký"}
              </h3>
              <p className="mt-1.5 text-[var(--muted)] text-xs font-medium transition-all duration-300">
                {mode === "login"
                  ? "Nhập email và mật khẩu để đăng nhập"
                  : "Tạo tài khoản Live Tracker mới"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-3">
                {mode === "register" && (
                  <>
                    <div className="relative animate-slide-up">
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Họ và tên"
                        required
                        className="w-full h-11 px-4 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all outline-none text-sm"
                      />
                    </div>
                    <div className="relative animate-slide-up">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Tên đăng nhập"
                        required
                        className="w-full h-11 px-4 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all outline-none text-sm"
                      />
                    </div>
                  </>
                )}

                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="w-full h-11 px-4 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all outline-none text-sm"
                  />
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu"
                    required
                    minLength={6}
                    className="w-full h-11 px-4 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {mode === "register" && (
                  <div className="relative animate-slide-up">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Xác nhận mật khẩu"
                      required
                      minLength={6}
                      className="w-full h-11 px-4 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                )}
              </div>

              {mode === "login" && loginError && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400 text-xs font-medium animate-shake">
                  {loginError}
                </div>
              )}

              {mode === "register" && registerError && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400 text-xs font-medium animate-shake">
                  {registerError}
                </div>
              )}

              {mode === "register" && registerSuccess && (
                <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 text-green-600 dark:text-green-400 text-xs font-medium animate-fade-in">
                  {registerSuccess}
                </div>
              )}

              <div className="space-y-3 pt-1">
                {mode === "login" ? (
                  <>
                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full h-11 flex items-center justify-center rounded-lg bg-[var(--primary)] text-white font-semibold text-sm shadow-sm hover:bg-[var(--primary-strong)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isLoggingIn ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMode("register");
                        setRegisterError("");
                        setRegisterSuccess("");
                      }}
                      className="w-full h-11 flex items-center justify-center rounded-lg bg-transparent border border-[var(--border)] text-[var(--foreground-soft)] font-medium text-sm hover:bg-[var(--hover)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all active:scale-[0.98]"
                    >
                      Đăng ký
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="submit"
                      disabled={isSubmittingRegister}
                      className="w-full h-11 flex items-center justify-center rounded-lg bg-[var(--primary)] text-white font-semibold text-sm shadow-sm hover:bg-[var(--primary-strong)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSubmittingRegister ? "Đang xử lý..." : "Đăng ký tài khoản"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setRegisterError("");
                        setRegisterSuccess("");
                      }}
                      className="w-full h-11 flex items-center justify-center rounded-lg bg-transparent border border-[var(--border)] text-[var(--foreground-soft)] font-medium text-sm hover:bg-[var(--hover)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all active:scale-[0.98]"
                    >
                      Quay lại đăng nhập
                    </button>
                  </>
                )}
              </div>

              {mode === "login" && (
                <div className="flex justify-center">
                  <button type="button" className="text-xs font-medium text-[var(--muted)] hover:text-[var(--primary)] transition-colors">
                    Quên mật khẩu?
                  </button>
                </div>
              )}
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

function PromoFeature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--primary-soft)] border border-[var(--border)]">
        {icon}
      </div>
      <div>
        <h4 className="text-[var(--foreground)] font-semibold text-sm">{title}</h4>
        <p className="text-[var(--muted)] text-xs mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
