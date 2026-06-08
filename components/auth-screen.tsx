"use client";

import { FormEvent, useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Zap, Layout, Sparkles, ShieldCheck } from "lucide-react";

import { useSession } from "@/components/session-provider";

export function AuthScreen() {
  const { isLoggingIn, login, loginError, register, verifyOtp, resendOtp } = useSession();
  const [mode, setMode] = useState<"login" | "register" | "otp">("login");
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

  // OTP states
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [tempRegisterEmail, setTempRegisterEmail] = useState("");

  // Refs for auto-focus
  const emailInputRef = useRef<HTMLInputElement>(null);
  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "login") {
      if (email) {
        // Nếu đã có sẵn email (ví dụ từ OTP qua), focus vào mật khẩu
        passwordInputRef.current?.focus();
      } else {
        emailInputRef.current?.focus();
      }
    } else if (mode === "register") {
      fullNameInputRef.current?.focus();
    } else if (mode === "otp") {
      const firstOtpInput = document.getElementById("otp-0");
      firstOtpInput?.focus();
    }
  }, [mode]);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

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

      if (res.success) {
        setRegisterSuccess(res.message);
        setTempRegisterEmail(email.trim());

        if (res.requireOtp) {
          // Giữ trạng thái loading và chuyển qua mode OTP sau 1.5s
          setTimeout(() => {
            setMode("otp");
            setRegisterSuccess("");
            setCooldown(60);
            setIsSubmittingRegister(false); // Hoàn thành chuyển mode mới tắt loading
          }, 1500);
        } else {
          setPassword("");
          setConfirmPassword("");
          setUsername("");
          setFullName("");
          setTimeout(() => {
            setMode("login");
            setRegisterSuccess("");
            setIsSubmittingRegister(false); // Hoàn thành chuyển mode mới tắt loading
          }, 2000);
        }
      } else {
        setRegisterError(res.message);
        setIsSubmittingRegister(false); // Thất bại thì tắt loading ngay để sửa thông tin
      }
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const otpCode = otpValues.join("");
    if (otpCode.length < 6) {
      setOtpError("Vui lòng nhập đầy đủ mã OTP 6 chữ số.");
      return;
    }

    setOtpError("");
    setOtpSuccess("");
    setIsSubmittingOtp(true);

    const res = await verifyOtp(tempRegisterEmail, otpCode);

    if (res.success) {
      setOtpSuccess("Xác thực tài khoản thành công! Vui lòng đăng nhập lại.");
      setEmail(tempRegisterEmail); // Điền sẵn email đăng nhập
      setTimeout(() => {
        setMode("login");
        setOtpSuccess("");
        setOtpValues(Array(6).fill(""));
        setPassword("");
        setConfirmPassword("");
        setUsername("");
        setFullName("");
        setIsSubmittingOtp(false); // Hoàn thành chuyển mode mới tắt loading
      }, 3000);
    } else {
      setOtpError(res.message);
      setIsSubmittingOtp(false); // Thất bại thì tắt loading ngay để thử lại
    }
  }

  async function handleResendOtp() {
    if (cooldown > 0) return;

    setOtpError("");
    setOtpSuccess("");
    const res = await resendOtp(tempRegisterEmail);

    if (res.success) {
      setOtpSuccess(res.message);
      setCooldown(60);
    } else {
      setOtpError(res.message);
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--background)] p-4 sm:p-6 lg:p-8 font-sans overflow-hidden">
      {/* Main container */}
      <div className="relative w-full max-w-[1100px] h-full max-h-[720px] flex flex-col lg:flex-row overflow-hidden rounded-2xl lg:rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-strong)]">

        {/* Left Section - Promo Area */}
        <section className="hidden lg:flex w-full lg:w-3/5 flex-col items-start justify-center px-12 xl:px-16 relative z-10 bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/20 overflow-hidden border-r border-[var(--border)]">
          {/* Ambient light glow orbs */}
          <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-blue-400/10 dark:bg-blue-600/5 blur-3xl pointer-events-none animate-pulse-slow" />
          <div className="absolute bottom-1/4 -right-20 w-72 h-72 rounded-full bg-indigo-400/10 dark:bg-indigo-600/5 blur-3xl pointer-events-none animate-pulse-slow" />

          {/* Subtle Dot Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-60 pointer-events-none" />

          <div className="max-w-lg py-6 relative z-10 w-full">
            {/* Active Status Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-6 border border-blue-500/20 animate-fade-in">
              <Zap className="w-3 h-3 fill-current animate-pulse" />
              <span>Hệ thống quản lý livestream & hội thoại</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400">
                LiveTracker
              </span>
            </h1>
            <h2 className="mt-3.5 text-lg xl:text-xl font-bold text-[var(--foreground-soft)] leading-snug">
              Trung tâm Điều hành Bán hàng Livestream
            </h2>
            <p className="mt-4 text-xs xl:text-sm text-[var(--muted)] leading-relaxed">
              Theo dõi hiệu suất livestream, quản lý tin nhắn khách hàng, lên đơn nhanh và vận hành giao hàng trên một nền tảng tập trung.
            </p>

            {/* 4 Feature cards */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <PromoFeature
                icon={<Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                title="Xử lý tức thì"
                desc="Cập nhật chỉ số livestream và bình luận ngay lập tức"
              />
              <PromoFeature
                icon={<Layout className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                title="Bảng điều khiển"
                desc="Quản lý hiệu suất kinh doanh trực quan"
              />
              <PromoFeature
                icon={<Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />}
                title="Trung tâm tin nhắn"
                desc="Trực chat và lên đơn ngay khi nhắn tin"
              />
              <PromoFeature
                icon={<ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                title="Tích hợp vận chuyển"
                desc="Kết nối trực tiếp các đơn vị vận chuyển"
              />
            </div>

            {/* Realtime Simulator Widget */}
            <RealtimeSimulator />
          </div>
        </section>

        {/* Right Section - Login/Register/OTP Card */}
        <section className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-20 h-full overflow-hidden bg-[var(--surface)]">
          <div className="w-full max-w-[380px] my-auto flex flex-col max-h-full overflow-y-auto pr-1 select-none">
            <div className="lg:hidden mb-6 text-center">
              <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">Live Tracker</h1>
            </div>

            {/* Card Header */}
            {mode !== "otp" ? (
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
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex items-center justify-center">
                  <img src="/logoicon.png" alt="Logo" className="w-14 h-14 sm:w-16 sm:h-16 object-contain animate-fade-in" />
                </div>
                <h3 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
                  Xác thực tài khoản
                </h3>
                <p className="mt-1.5 text-[var(--muted)] text-xs font-medium px-4">
                  Mã OTP 6 số đã được gửi đến email <span className="font-semibold text-[var(--foreground-soft)]">{tempRegisterEmail}</span>.
                </p>
              </div>
            )}

            {/* Forms */}
            {mode !== "otp" ? (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-3">
                  {mode === "register" && (
                    <>
                      <div className="relative animate-slide-up">
                        <input
                          ref={fullNameInputRef}
                          type="text"
                          disabled={isSubmittingRegister}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Họ và tên"
                          required
                          className="w-full h-11 px-4 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all outline-none text-sm disabled:opacity-50"
                        />
                      </div>
                      <div className="relative animate-slide-up">
                        <input
                          type="text"
                          disabled={isSubmittingRegister}
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Tên đăng nhập"
                          required
                          className="w-full h-11 px-4 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all outline-none text-sm disabled:opacity-50"
                        />
                      </div>
                    </>
                  )}

                  <div className="relative">
                    <input
                      ref={emailInputRef}
                      type="email"
                      disabled={mode === "register" ? isSubmittingRegister : isLoggingIn}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      required
                      className="w-full h-11 px-4 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all outline-none text-sm disabled:opacity-50"
                    />
                  </div>

                  <div className="relative">
                    <input
                      ref={passwordInputRef}
                      type={showPassword ? "text" : "password"}
                      disabled={mode === "register" ? isSubmittingRegister : isLoggingIn}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mật khẩu"
                      required
                      minLength={6}
                      className="w-full h-11 px-4 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all outline-none text-sm disabled:opacity-50"
                    />
                    <button
                      type="button"
                      disabled={mode === "register" ? isSubmittingRegister : isLoggingIn}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {mode === "register" && (
                    <div className="relative animate-slide-up">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        disabled={isSubmittingRegister}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Xác nhận mật khẩu"
                        required
                        minLength={6}
                        className="w-full h-11 px-4 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all outline-none text-sm disabled:opacity-50"
                      />
                      <button
                        type="button"
                        disabled={isSubmittingRegister}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
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
                        {isLoggingIn ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Đang đăng nhập...
                          </>
                        ) : "Đăng nhập"}
                      </button>

                      <button
                        type="button"
                        disabled={isLoggingIn}
                        onClick={() => {
                          setMode("register");
                          setRegisterError("");
                          setRegisterSuccess("");
                        }}
                        className="w-full h-11 flex items-center justify-center rounded-lg bg-transparent border border-[var(--border)] text-[var(--foreground-soft)] font-medium text-sm hover:bg-[var(--hover)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all active:scale-[0.98] disabled:opacity-50"
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
                        {isSubmittingRegister ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Đang xử lý...
                          </>
                        ) : "Đăng ký tài khoản"}
                      </button>

                      <button
                        type="button"
                        disabled={isSubmittingRegister}
                        onClick={() => {
                          setMode("login");
                          setRegisterError("");
                          setRegisterSuccess("");
                        }}
                        className="w-full h-11 flex items-center justify-center rounded-lg bg-transparent border border-[var(--border)] text-[var(--foreground-soft)] font-medium text-sm hover:bg-[var(--hover)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
            ) : (
              <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4 animate-fade-in">
                <div className="flex justify-between gap-2 max-w-[320px] mx-auto">
                  {otpValues.map((val, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      maxLength={1}
                      disabled={isSubmittingOtp}
                      value={val}
                      onChange={(e) => {
                        const text = e.target.value.replace(/[^0-9]/g, "");
                        const nextOtp = [...otpValues];
                        nextOtp[idx] = text;
                        setOtpValues(nextOtp);

                        // Tự động focus ô tiếp theo
                        if (text && idx < 5) {
                          const nextInput = document.getElementById(`otp-${idx + 1}`);
                          nextInput?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otpValues[idx] && idx > 0) {
                          const prevInput = document.getElementById(`otp-${idx - 1}`);
                          prevInput?.focus();
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
                        if (pastedData.length === 6) {
                          const nextOtp = pastedData.split("");
                          setOtpValues(nextOtp);
                          // Focus vào ô cuối cùng
                          const lastInput = document.getElementById("otp-5");
                          lastInput?.focus();
                        }
                      }}
                      className="w-11 h-11 text-center rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] text-lg font-bold focus:bg-[var(--surface)] focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all outline-none disabled:opacity-50"
                    />
                  ))}
                </div>

                {otpError && (
                  <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400 text-xs font-medium animate-shake">
                    {otpError}
                  </div>
                )}

                {otpSuccess && (
                  <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 text-green-600 dark:text-green-400 text-xs font-medium animate-fade-in">
                    {otpSuccess}
                  </div>
                )}

                <div className="space-y-3 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingOtp}
                    className="w-full h-11 flex items-center justify-center rounded-lg bg-[var(--primary)] text-white font-semibold text-sm shadow-sm hover:bg-[var(--primary-strong)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmittingOtp ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Đang xác thực...
                      </>
                    ) : "Xác nhận OTP"}
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={cooldown > 0 || isSubmittingOtp}
                    className="w-full h-11 flex items-center justify-center rounded-lg bg-transparent border border-[var(--border)] text-[var(--foreground-soft)] font-medium text-sm hover:bg-[var(--hover)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : "Gửi lại mã OTP"}
                  </button>

                  <button
                    type="button"
                    disabled={isSubmittingOtp}
                    onClick={() => {
                      setMode("register");
                      setOtpError("");
                      setOtpSuccess("");
                    }}
                    className="w-full h-11 flex items-center justify-center rounded-lg bg-transparent border border-[var(--border)] text-[var(--foreground-soft)] font-medium text-sm hover:bg-[var(--hover)] transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    Quay lại đăng ký
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PromoFeature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group flex flex-col gap-2.5 p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-[var(--border)] hover:border-blue-300 dark:hover:border-blue-700 backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-default">
      <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-white dark:bg-white/10 border border-[var(--border)] group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <div>
        <h4 className="text-[var(--foreground)] font-semibold text-[13px] leading-tight">{title}</h4>
        <p className="text-[var(--muted)] text-[11px] mt-0.5 leading-snug">{desc}</p>
      </div>
    </div>
  );
}

// Simulated realtime data for the live stream monitor widget
const SIMULATED_COMMENTS = [
  { user: "Ngọc Linh", text: "Lấy size M áo xanh", avatar: "NL" },
  { user: "Minh Tuấn", text: "Cho xin giá combo 3 cái", avatar: "MT" },
  { user: "Hà Phương", text: "Còn hàng không shop?", avatar: "HP" },
  { user: "Thanh Hải", text: "Đặt 2 cái giao Đà Nẵng", avatar: "TH" },
  { user: "Thuỳ Dung", text: "Inbox shop ơi", avatar: "TD" },
  { user: "Bảo Ngọc", text: "Lấy 1 đen size L", avatar: "BN" },
  { user: "Quốc Việt", text: "Ship về HCM bao lâu?", avatar: "QV" },
  { user: "Mai Anh", text: "Combo có giảm thêm không ạ?", avatar: "MA" },
];

function RealtimeSimulator() {
  const [comments, setComments] = useState<typeof SIMULATED_COMMENTS>([]);
  const [viewers, setViewers] = useState(1247);
  const [orders, setOrders] = useState(84);

  useEffect(() => {
    // Initialize with first 2 comments
    setComments(SIMULATED_COMMENTS.slice(0, 2));

    let commentIndex = 2;

    const interval = setInterval(() => {
      // Add a new comment
      setComments((prev) => {
        const next = SIMULATED_COMMENTS[commentIndex % SIMULATED_COMMENTS.length];
        commentIndex++;
        const updated = [...prev, next];
        // Keep only last 3 comments visible
        if (updated.length > 3) return updated.slice(-3);
        return updated;
      });

      // Randomly fluctuate viewers
      setViewers((v) => v + Math.floor(Math.random() * 11) - 3);

      // Occasionally increment orders
      if (Math.random() > 0.5) {
        setOrders((o) => o + 1);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-8 p-4 rounded-xl bg-white/70 dark:bg-white/5 border border-[var(--border)] backdrop-blur-sm animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider">Đang phát trực tiếp</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[var(--muted)] font-medium">
          <span className="flex items-center gap-1">
            👁 <span className="tabular-nums">{viewers.toLocaleString()}</span>
          </span>
          <span className="flex items-center gap-1">
            📦 <span className="tabular-nums">{orders}</span> đơn
          </span>
        </div>
      </div>

      {/* Comment stream */}
      <div className="space-y-2 min-h-[84px]">
        {comments.map((c, i) => (
          <div
            key={`${c.avatar}-${i}`}
            className="flex items-start gap-2 animate-slide-up"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
              {c.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-[var(--foreground)]">{c.user}</span>
              <p className="text-[10px] text-[var(--muted)] leading-snug truncate">{c.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
