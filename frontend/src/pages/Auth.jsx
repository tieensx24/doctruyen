import React, { useState, useEffect } from "react";

const API = "http://localhost:3000/api";

function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => localStorage.getItem(key) || initial);
  const set = (v) => { localStorage.setItem(key, v); setVal(v); };
  const remove = () => { localStorage.removeItem(key); setVal(initial); };
  return [val, set, remove];
}

async function apiFetch(path, options = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${API}${path}`, { ...options, signal: ctrl.signal });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    throw err.name === "AbortError"
      ? new Error("Không thể kết nối server. Vui lòng thử lại.")
      : err;
  } finally {
    clearTimeout(t);
  }
}

// ─── Eye icon ───────────────────────────────────────────────────────────────
function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>
    </svg>
  );
}

// ─── Input field ─────────────────────────────────────────────────────────────
function Field({ label, type = "text", name, value, onChange, placeholder, autoComplete, minLength, required, icon, rightSlot, error }) {
  return (
    <div style={{ marginBottom: error ? 6 : 18 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {icon && (
          <span style={{
            position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
            color: "var(--color-text-tertiary)", display: "flex", alignItems: "center",
          }}>{icon}</span>
        )}
        <input
          type={type} name={name} value={value} onChange={onChange}
          placeholder={placeholder} autoComplete={autoComplete}
          minLength={minLength} required={required}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: icon ? "11px 40px 11px 40px" : "11px 16px",
            paddingRight: rightSlot ? 44 : 16,
            border: `1px solid ${error ? "#e24b4a" : "var(--color-border-secondary)"}`,
            borderRadius: 10, fontSize: 14,
            background: "var(--color-background-primary)",
            color: "var(--color-text-primary)",
            outline: "none",
            transition: "border-color 0.15s",
          }}
          onFocus={e => { if (!error) e.target.style.borderColor = "#378add"; }}
          onBlur={e => { if (!error) e.target.style.borderColor = "var(--color-border-secondary)"; }}
        />
        {rightSlot && (
          <span style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            color: "var(--color-text-tertiary)", display: "flex", alignItems: "center",
          }}>{rightSlot}</span>
        )}
      </div>
      {error && (
        <p style={{ margin: "4px 0 10px", fontSize: 12, color: "#e24b4a" }}>{error}</p>
      )}
    </div>
  );
}

// ─── User avatar ──────────────────────────────────────────────────────────────
function Avatar({ username, size = 44 }) {
  const colors = ["#e63946", "#2a9d8f", "#457b9d", "#6a4c93", "#f4a261", "#2dc653"];
  let h = 0;
  for (let i = 0; i < username.length; i++) h = username.charCodeAt(i) + ((h << 5) - h);
  const bg = colors[Math.abs(h) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, display: "flex", alignItems: "center",
      justifyContent: "center", color: "#fff",
      fontWeight: 700, fontSize: size * 0.36,
      flexShrink: 0,
    }}>
      {username[0].toUpperCase()}
    </div>
  );
}

// ─── Logged-in state ──────────────────────────────────────────────────────────
function ProfileCard({ user, onLogout }) {
  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        background: "var(--color-background-secondary)",
        borderRadius: 14, padding: "20px 24px", marginBottom: 24,
      }}>
        <Avatar username={user.username} size={56} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 17, color: "var(--color-text-primary)" }}>
            {user.username}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
            {user.email}
          </div>
          <span style={{
            display: "inline-block", marginTop: 6,
            fontSize: 11, fontWeight: 600, padding: "3px 10px",
            borderRadius: 20,
            background: user.role_id === 1 ? "#faece7" : "#e1f5ee",
            color: user.role_id === 1 ? "#993c1d" : "#0f6e56",
          }}>
            {user.role_id === 1 ? "⚙ Admin" : "👤 User"}
          </span>
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 10, marginBottom: 24,
      }}>
        {[
          { label: "Đang theo dõi", value: "0", icon: "❤️" },
          { label: "Đã đọc", value: "0", icon: "📖" },
          { label: "Bình luận", value: "0", icon: "💬" },
        ].map(s => (
          <div key={s.label} style={{
            background: "var(--color-background-secondary)",
            borderRadius: 10, padding: "14px 12px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button style={{
          flex: 1, padding: "11px 0", borderRadius: 10,
          background: "var(--color-background-secondary)",
          border: "0.5px solid var(--color-border-secondary)",
          color: "var(--color-text-primary)", fontSize: 14,
          fontWeight: 500, cursor: "pointer",
        }}>
          ✏️ Chỉnh sửa hồ sơ
        </button>
        <button
          onClick={onLogout}
          style={{
            flex: 1, padding: "11px 0", borderRadius: 10,
            background: "#fcebeb",
            border: "0.5px solid #f7c1c1",
            color: "#a32d2d", fontSize: 14,
            fontWeight: 600, cursor: "pointer",
          }}
        >
          🚪 Đăng xuất
        </button>
      </div>
    </div>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────
function LoginForm({ onSuccess, onSwitch }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const change = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
    setFieldErrors(fe => ({ ...fe, [e.target.name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) errs.email = "Vui lòng nhập email";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Email không hợp lệ";
    if (!form.password) errs.password = "Vui lòng nhập mật khẩu";
    return errs;
  };

  const submit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setLoading(true); setError("");
    try {
      const { ok, data } = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      });
      if (!ok) throw new Error(data.message || "Đăng nhập thất bại");
      onSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ animation: "fadeUp 0.25s ease" }}>
      <Field
        label="Email" name="email" type="email" value={form.email}
        onChange={change} placeholder="you@example.com"
        autoComplete="email" required
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg>}
        error={fieldErrors.email}
      />
      <Field
        label="Mật khẩu" name="password"
        type={showPwd ? "text" : "password"}
        value={form.password} onChange={change}
        placeholder="Nhập mật khẩu" autoComplete="current-password" required
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>}
        rightSlot={
          <button type="button" onClick={() => setShowPwd(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-text-tertiary)", display: "flex" }}>
            <EyeIcon open={showPwd} />
          </button>
        }
        error={fieldErrors.password}
      />

      {error && (
        <div style={{
          background: "#fcebeb", border: "0.5px solid #f7c1c1",
          borderRadius: 8, padding: "10px 14px",
          color: "#a32d2d", fontSize: 13, marginBottom: 16,
        }}>⚠️ {error}</div>
      )}

      <button
        type="submit" disabled={loading}
        style={{
          width: "100%", padding: "13px 0",
          background: loading ? "var(--color-border-secondary)" : "var(--color-text-primary)",
          color: "var(--color-background-primary)",
          border: "none", borderRadius: 10,
          fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          transition: "opacity 0.15s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {loading && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 0.8s linear infinite" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        )}
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>

      <div style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--color-text-secondary)" }}>
        Chưa có tài khoản?{" "}
        <button type="button" onClick={onSwitch}
          style={{ background: "none", border: "none", color: "#185fa5", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
          Đăng ký ngay
        </button>
      </div>
    </form>
  );
}

// ─── Register form ────────────────────────────────────────────────────────────
function RegisterForm({ onSuccess, onSwitch }) {
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const change = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
    setFieldErrors(fe => ({ ...fe, [e.target.name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = "Vui lòng nhập tên đăng nhập";
    else if (form.username.trim().length < 3) errs.username = "Tối thiểu 3 ký tự";
    if (!form.email.trim()) errs.email = "Vui lòng nhập email";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Email không hợp lệ";
    if (!form.password) errs.password = "Vui lòng nhập mật khẩu";
    else if (form.password.length < 6) errs.password = "Tối thiểu 6 ký tự";
    if (!form.confirm) errs.confirm = "Vui lòng xác nhận mật khẩu";
    else if (form.confirm !== form.password) errs.confirm = "Mật khẩu không khớp";
    return errs;
  };

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(s, 4);
  })();

  const strengthLabel = ["", "Yếu", "Trung bình", "Khá", "Mạnh"];
  const strengthColor = ["", "#e24b4a", "#ef9f27", "#2a9d8f", "#1d9e75"];

  const submit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setLoading(true); setError("");
    try {
      const { ok, data } = await apiFetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });
      if (!ok) throw new Error(data.message || "Đăng ký thất bại");
      onSuccess(form.email.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ animation: "fadeUp 0.25s ease" }}>
      <Field
        label="Tên đăng nhập" name="username" value={form.username}
        onChange={change} placeholder="vd: nguyenvana"
        autoComplete="username" required
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
        error={fieldErrors.username}
      />
      <Field
        label="Email" name="email" type="email" value={form.email}
        onChange={change} placeholder="you@example.com"
        autoComplete="email" required
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg>}
        error={fieldErrors.email}
      />
      <Field
        label="Mật khẩu" name="password"
        type={showPwd ? "text" : "password"}
        value={form.password} onChange={change}
        placeholder="Tối thiểu 6 ký tự" autoComplete="new-password"
        minLength={6} required
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>}
        rightSlot={
          <button type="button" onClick={() => setShowPwd(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-text-tertiary)", display: "flex" }}>
            <EyeIcon open={showPwd} />
          </button>
        }
        error={fieldErrors.password}
      />

      {form.password.length > 0 && (
        <div style={{ marginBottom: 16, marginTop: -8 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i <= strength ? strengthColor[strength] : "var(--color-border-tertiary)",
                transition: "background 0.2s",
              }} />
            ))}
          </div>
          {strength > 0 && (
            <span style={{ fontSize: 11, color: strengthColor[strength] }}>
              Độ mạnh: {strengthLabel[strength]}
            </span>
          )}
        </div>
      )}

      <Field
        label="Xác nhận mật khẩu" name="confirm"
        type={showPwd ? "text" : "password"}
        value={form.confirm} onChange={change}
        placeholder="Nhập lại mật khẩu" autoComplete="new-password" required
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>}
        error={fieldErrors.confirm}
      />

      {error && (
        <div style={{
          background: "#fcebeb", border: "0.5px solid #f7c1c1",
          borderRadius: 8, padding: "10px 14px",
          color: "#a32d2d", fontSize: 13, marginBottom: 16,
        }}>⚠️ {error}</div>
      )}

      <button
        type="submit" disabled={loading}
        style={{
          width: "100%", padding: "13px 0",
          background: loading ? "var(--color-border-secondary)" : "var(--color-text-primary)",
          color: "var(--color-background-primary)",
          border: "none", borderRadius: 10,
          fontSize: 15, fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {loading && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 0.8s linear infinite" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        )}
        {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
      </button>

      <div style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--color-text-secondary)" }}>
        Đã có tài khoản?{" "}
        <button type="button" onClick={onSwitch}
          style={{ background: "none", border: "none", color: "#185fa5", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
          Đăng nhập
        </button>
      </div>
    </form>
  );
}

// ─── Success toast ────────────────────────────────────────────────────────────
function SuccessToast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      background: "#e1f5ee", border: "0.5px solid #5dcaa5",
      borderRadius: 10, padding: "14px 18px",
      display: "flex", alignItems: "center", gap: 12,
      animation: "fadeUp 0.25s ease", marginBottom: 20,
    }}>
      <span style={{ fontSize: 22 }}>✅</span>
      <span style={{ fontSize: 14, color: "#085041", fontWeight: 500 }}>{message}</span>
    </div>
  );
}

// ─── Main Auth page ───────────────────────────────────────────────────────────
export default function Auth({ onGoHome, onLoginSuccess }) {
  const [mode, setMode] = useState("login");
  const [token, setToken, removeToken] = useLocalStorage("doctruyen_token", "");
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState("");
  const [loadingUser, setLoadingUser] = useState(false);

  useEffect(() => {
    if (token) fetchMe(token);
  }, []);

  async function fetchMe(t) {
    setLoadingUser(true);
    try {
      const { ok, data } = await apiFetch("/auth/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!ok) throw new Error();
      setUser(data);
      localStorage.setItem("doctruyen_user", JSON.stringify(data));
      if (onLoginSuccess) {
        setTimeout(() => onLoginSuccess(data), 300);
      }
    } catch {
      removeToken();
      localStorage.removeItem("doctruyen_user");
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  }

  function handleLoginSuccess(t, u) {
    setToken(t);
    setUser(u);
    localStorage.setItem("doctruyen_user", JSON.stringify(u));
    setToast(`Chào mừng trở lại, ${u.username}! 👋`);
    if (onLoginSuccess) {
      setTimeout(() => onLoginSuccess(u), 500);
      return;
    }
    if (onGoHome) {
      setTimeout(onGoHome, 500);
    }
  }

  function handleRegisterSuccess(email) {
    setToast("Đăng ký thành công! Bạn có thể đăng nhập ngay.");
    setMode("login");
  }

  function handleLogout() {
    removeToken();
    localStorage.removeItem("doctruyen_user");
    setUser(null);
    setToast("Đã đăng xuất thành công.");
  }

  const isLoggedIn = !!(token && user);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "var(--color-background-tertiary)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "var(--font-sans, 'Segoe UI', sans-serif)",
      }}>
        <div style={{
          display: "flex", width: "100%", maxWidth: 900,
          minHeight: 560, borderRadius: 20, overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
          border: "0.5px solid var(--color-border-tertiary)",
        }}>

          {/* ── Left panel ── */}
          <div style={{
            flex: "0 0 360px", background: "#0c1a2e",
            padding: "48px 40px", display: "flex",
            flexDirection: "column", justifyContent: "space-between",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: "radial-gradient(circle at 30% 20%, rgba(55,138,221,0.18) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(29,158,117,0.12) 0%, transparent 50%)",
            }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
                <span style={{ fontSize: 26 }}>📖</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>DocTruyen</span>
              </div>
              <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 700, margin: "0 0 12px", lineHeight: 1.3 }}>
                Kho truyện tranh trực tuyến
              </h2>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                Đọc hàng nghìn bộ truyện tranh, theo dõi tiến độ và khám phá những bộ mới mỗi ngày.
              </p>
            </div>

            <div style={{ position: "relative" }}>
              {[
                { icon: "📚", text: "Hơn 1,200 bộ truyện" },
                { icon: "🔄", text: "Cập nhật mỗi ngày" },
                { icon: "❤️", text: "Theo dõi truyện yêu thích" },
                { icon: "🔖", text: "Lưu lịch sử đọc" },
              ].map(f => (
                <div key={f.text} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  marginBottom: 14,
                }}>
                  <span style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: "rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 16, flexShrink: 0,
                  }}>{f.icon}</span>
                  <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right panel ── */}
          <div style={{
            flex: 1, background: "var(--color-background-primary)",
            padding: "40px 44px", display: "flex", flexDirection: "column",
            justifyContent: "center",
          }}>
            {toast && (
              <SuccessToast message={toast} onDone={() => setToast("")} />
            )}

            {loadingUser ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-secondary)" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              </div>
            ) : isLoggedIn ? (
              <>
                <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  Tài khoản của bạn
                </h2>
                <ProfileCard user={user} onLogout={handleLogout} />
              </>
            ) : (
              <>
                {/* Tabs */}
                <div style={{
                  display: "flex", gap: 0, marginBottom: 32,
                  background: "var(--color-background-secondary)",
                  borderRadius: 10, padding: 4,
                }}>
                  {[["login", "Đăng nhập"], ["register", "Đăng ký"]].map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      style={{
                        flex: 1, padding: "9px 0",
                        border: "none", borderRadius: 8,
                        fontSize: 14, fontWeight: mode === m ? 600 : 400,
                        cursor: "pointer",
                        background: mode === m
                          ? "var(--color-background-primary)"
                          : "transparent",
                        color: mode === m
                          ? "var(--color-text-primary)"
                          : "var(--color-text-secondary)",
                        boxShadow: mode === m
                          ? "0 1px 4px rgba(0,0,0,0.08)"
                          : "none",
                        transition: "all 0.18s",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div style={{ marginBottom: 6 }}>
                  <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
                  </h2>
                  <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--color-text-secondary)" }}>
                    {mode === "login"
                      ? "Đăng nhập để tiếp tục đọc truyện."
                      : "Điền thông tin để bắt đầu hành trình đọc truyện."}
                  </p>
                </div>

                {mode === "login"
                  ? <LoginForm onSuccess={handleLoginSuccess} onSwitch={() => setMode("register")} />
                  : <RegisterForm onSuccess={handleRegisterSuccess} onSwitch={() => setMode("login")} />
                }
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
