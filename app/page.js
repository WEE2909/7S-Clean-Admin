"use client";
import { useEffect, useRef, useState } from "react";

const KEY = "cleancheck-v1";
const SUBS_KEY = "cleancheck-subs-v1";

// บัญชีทดลอง (รอบแรก) จะเปลี่ยนเป็นระบบล็อกอินจริงในรอบสอง
const USERS = [
  { u: "admin", p: "1234", role: "admin", name: "ผู้ดูแลระบบ" },
  { u: "user", p: "1234", role: "staff", name: "ผู้ใช้" },
];

const BASE_AREAS = [
  "ห้องครัวใน",
  "ห้องครัวนอก (บริเวณล้างจาน)",
  "ห้องครัวนอก (บริเวณทานข้าว)",
  "ห้องประชุม 1",
  "ห้องประชุม 2",
  "ลานจอดรถ",
  "ระเบียง 1",
  "ระเบียง 2",
  "ที่ทำงานส่วนกลาง",
  "จุดทิ้งขยะ",
  "ห้องน้ำ 1",
  "ห้องน้ำ 2",
];

const ITEMS = [
  { id: "i1", name: "โต๊ะและเก้าอี้", hint: "เช็ดสะอาด ไม่มีเศษอาหาร จัดวางเป็นระเบียบ" },
  { id: "i2", name: "พื้น", hint: "กวาด ถู แห้ง ไม่มีคราบอาหาร" },
  { id: "i3", name: "ถังขยะ", hint: "ไม่ล้น แยกประเภทถูกต้อง เปลี่ยนถุงแล้ว" },
  { id: "i4", name: "ของใช้ส่วนกลาง", hint: "ที่อยู่ น้ำยา ผ้าเช็ด เก็บเข้าที่" },
];

const pad = (n) => String(n).padStart(2, "0");
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const todayThai = () =>
  new Date().toLocaleDateString("th-TH-u-ca-gregory", { day: "numeric", month: "short", year: "numeric" });

const timeThai = () =>
  new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";

const BLUE = "bg-[#1B6A93]";

const ACTION = "bg-[#2E69A8]";
const fmtTime = (iso) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())} น.`;
};
const fmtDateLong = (iso) =>
  new Date(iso).toLocaleDateString("th-TH-u-ca-gregory", { day: "numeric", month: "short", year: "numeric" });
const taskItems = (name) =>
  name.startsWith("ห้องน้ำ")
    ? ["พื้น", "อ่างล้างมือ", "ถังขยะ", "ของใช้ส่วนกลาง"]
    : name.includes("ล้างจาน")
    ? ["ล้างจาน", "ล้างอ่างล้างจาน", "ถังขยะ"]
    : ["โต๊ะและเก้าอี้", "พื้น", "ถังขยะ", "ของใช้ส่วนกลาง"];

function BackIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}
function CamIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function StaffHeader({ onLogout, onBack, title, sub, date, pb = "pb-16", children }) {
  return (
    <header className={`relative overflow-hidden rounded-b-[36px] ${BLUE} px-5 pt-8 text-white ${pb}`}>
      <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-white/10" />
      <div className="absolute right-8 top-20 h-20 w-20 rounded-full bg-white/15" />
      <div className="relative">
        <div className="flex justify-end">
          <button onClick={onLogout} className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#1B6A93]">
            ออกจากระบบ
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} aria-label="ย้อนกลับ" className="-ml-1 p-1">
              <BackIcon />
            </button>
          )}
          <div>
            {sub && <p className="text-sm tracking-wide">{sub}</p>}
            <h1 className="text-2xl font-bold leading-snug">{title}</h1>
            {date && <p className="text-[#E4EFFA]">{date}</p>}
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}

function shrink(source, w, h) {
  const max = 900;
  const sc = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * sc);
  c.height = Math.round(h * sc);
  c.getContext("2d").drawImage(source, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.65);
}

function CameraView({ title, stepTitle, hint, step, thumb, onShot, onBack }) {
  const vref = useRef(null);
  const fref = useRef(null);
  const [live, setLive] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let stream;
    let dead = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (dead) return stream.getTracks().forEach((t) => t.stop());
        if (vref.current) {
          vref.current.srcObject = stream;
          await vref.current.play().catch(() => {});
          setLive(true);
        }
      } catch (e) {
        setErr("เปิดกล้องในหน้านี้ไม่ได้ กดปุ่มถ่ายเพื่อใช้กล้องของเครื่องแทน");
      }
    })();
    return () => {
      dead = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const shoot = () => {
    const v = vref.current;
    if (live && v && v.videoWidth) onShot(shrink(v, v.videoWidth, v.videoHeight));
    else if (fref.current) fref.current.click();
  };
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      onShot(shrink(img, img.width, img.height));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };
  const corner = "absolute h-9 w-9 border-white";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-[#11161C] px-5 pb-8 pt-12 text-white">
      <div className="flex items-center gap-3">
        <button onClick={onBack} aria-label="ย้อนกลับ" className="-ml-1 p-1">
          <BackIcon />
        </button>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      <div className="mt-4 flex gap-2">
        {[1, 2].map((k) => (
          <span key={k} className={`h-1.5 flex-1 rounded-full ${k <= step ? "bg-[#1B6A93]" : "bg-[#D7DEE2]"}`} />
        ))}
      </div>
      <h2 className="mt-5 text-xl font-bold">{stepTitle}</h2>
      <p className="text-sm text-[#9AA6B2]">{hint}</p>
      <div className="relative mt-4 min-h-[50vh] flex-1 overflow-hidden rounded-3xl bg-[#1F262D]">
        <video ref={vref} playsInline muted className={`absolute inset-0 h-full w-full object-cover ${live ? "" : "hidden"}`} />
        {!live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#6E7F8D]">
            <CamIcon size={56} />
            <p>ภาพจากกล้องจะแสดงตรงนี้</p>
          </div>
        )}
        {thumb && <img src={thumb} alt="รูปก่อนทำ" className="absolute left-4 top-4 h-28 w-24 rounded-xl border-2 border-white object-cover" />}
        <span className={`${corner} left-4 top-4 border-l-2 border-t-2 ${thumb ? "hidden" : ""}`} />
        <span className={`${corner} right-4 top-4 border-r-2 border-t-2`} />
        <span className={`${corner} bottom-4 left-4 border-b-2 border-l-2`} />
        <span className={`${corner} bottom-4 right-4 border-b-2 border-r-2`} />
      </div>
      {err && <p className="mt-3 text-center text-sm text-[#F2C46B]">{err}</p>}
      <div className="mt-6 flex flex-col items-center gap-3">
        <button onClick={shoot} aria-label="ถ่ายรูป" className="h-20 w-20 rounded-full border-4 border-white p-1">
          <span className="block h-full w-full rounded-full bg-white" />
        </button>
        <p className="text-sm text-[#9AA6B2]">ไม่สามารถเลือกรูปจากคลังได้</p>
      </div>
      <input ref={fref} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
    </main>
  );
}

function PhotoBox({ src, label, tone, className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${tone === "after" ? "bg-[#C6E3D3]" : "bg-[#D5DCE0]"} ${className}`}>
      {src && <img src={src} alt={label} className="absolute inset-0 h-full w-full object-cover" />}
      <span className="absolute bottom-3 left-3 rounded-full bg-[#4B5563]/85 px-3 py-1 text-sm text-white">{label}</span>
    </div>
  );
}


function Header({ title, sub, children, logo }) {
  return (
    <header className={`relative overflow-hidden rounded-b-[36px] ${BLUE} px-5 pb-24 pt-8 text-white`}>
      <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-white/10" />
      {logo ? (
        <img src="/logo.png" alt="โลโก้ 7ส" className="absolute right-6 top-6 h-24 w-24 rounded-full" />
      ) : (
        <div className="absolute right-8 top-10 h-20 w-20 rounded-full bg-white/15" />
      )}
      <div className="relative">
        {sub && <p className="text-sm font-medium tracking-wide">{sub}</p>}
        <h1 className="mt-1 text-2xl font-bold leading-snug">{title}</h1>
        {children}
      </div>
    </header>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [assign, setAssign] = useState({}); // areaIndex -> ชื่อผู้รับผิดชอบ
  const [results, setResults] = useState({}); // date -> areaIndex -> {checks, inspector}
  const [view, setView] = useState({ name: "list" });
  const [login, setLogin] = useState({ u: "user", name: "", p: "", err: "" });
  const [subs, setSubs] = useState({}); // date -> areaIndex -> {by, at, before, after, note}
  const [due, setDue] = useState({}); // areaIndex -> "HH:MM"
  const [dueInput, setDueInput] = useState("16:00");
  const [photos, setPhotos] = useState({ before: null, after: null, note: "" });
  const [myTab, setMyTab] = useState("tasks");
  const [doneTab, setDoneTab] = useState("todo");
  const [inspect, setInspect] = useState({}); // areaIndex -> ชื่อผู้ตรวจ
  const [custom, setCustom] = useState([]); // [{name, type}] ห้องที่แอดมินเพิ่ม
  const [adding, setAdding] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: "", type: "พื้นที่ส่วนรวม" });
  const [clock, setClock] = useState("");
  const [assigning, setAssigning] = useState(null); // {i, kind}
  const [nameInput, setNameInput] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [draft, setDraft] = useState({ checks: {}, inspector: "" });

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (d.assign) setAssign(d.assign);
      if (d.inspect) setInspect(d.inspect);
      if (d.due) setDue(d.due);
      if (Array.isArray(d.custom)) setCustom(d.custom);
      if (d.results) setResults(d.results);
      if (d.user) setUser(d.user);
    } catch (e) {}
    try {
      const sb = JSON.parse(localStorage.getItem(SUBS_KEY) || "{}");
      if (sb && typeof sb === "object") setSubs(sb);
    } catch (e) {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ assign, inspect, custom, results, due, user }));
    } catch (e) {}
  }, [assign, inspect, custom, results, due, user, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(SUBS_KEY, JSON.stringify(subs));
    } catch (e) {}
  }, [subs, ready]);

  useEffect(() => {
    setClock(timeThai());
    const t = setInterval(() => setClock(timeThai()), 30000);
    return () => clearInterval(t);
  }, []);

  const AREAS = [...BASE_AREAS, ...custom.map((c) => c.name)];

  if (!ready) return <main className="min-h-screen bg-[#EEF3F8]" />;

  const doLogin = () => {
    const found = USERS.find((x) => x.u === login.u.trim() && x.p === login.p);
    if (!found) return setLogin({ ...login, err: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    setUser({ u: found.u, role: found.role, name: login.name.trim() || (found.role === "admin" ? found.name : "User") });
    setLogin({ u: "user", name: "", p: "", err: "" });
  };

  // ---------- หน้าเข้าสู่ระบบ ----------
  if (!user) {
    return (
      <main className="mx-auto min-h-screen max-w-md bg-[#EEF3F8] text-[#12263A]">
        <Header sub="CLEAN CHECK" title="เข้าสู่ระบบ">
          <p className="mt-2 text-[#E4EFFA]">ประเมินความสะอาดตามหลัก 7ส</p>
        </Header>
        <div className="relative -mt-10 px-5">
          <div className="space-y-5 rounded-3xl bg-white p-6 shadow-lg">
            <div>
              <span className="text-sm font-medium text-[#3B5268]">ชื่อผู้ใช้</span>
              <div className="mt-2 flex h-[52px] w-full items-center gap-2 rounded-2xl border-2 border-[#C9D7E5] bg-[#F4F8FC] pl-2 pr-3 text-base focus-within:border-[#1B6A93] focus-within:bg-white">
                <button
                  type="button"
                  onClick={() => setLogin({ ...login, u: login.u === "admin" ? "user" : "admin", err: "" })}
                  aria-label="สลับระหว่าง User และ Admin"
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 font-medium text-[#12263A] shadow-sm active:scale-95"
                >
                  <span>{login.u === "admin" ? "Admin" : "User"}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1B6A93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 4 3 8l4 4" />
                    <path d="M3 8h14" />
                    <path d="m17 20 4-4-4-4" />
                    <path d="M21 16H7" />
                  </svg>
                </button>
                <input
                  value={login.name}
                  onChange={(e) => setLogin({ ...login, name: e.target.value, err: "" })}
                  placeholder="พิมพ์ชื่อผู้ใช้"
                  aria-label="ชื่อผู้ใช้"
                  autoCapitalize="none"
                  className="min-w-0 flex-1 bg-transparent font-medium outline-none"
                />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B5268" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
              </div>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-[#3B5268]">รหัสผ่าน</span>
              <div className="relative mt-2">
                <input
                  type={showPass ? "text" : "password"}
                  value={login.p}
                  onChange={(e) => setLogin({ ...login, p: e.target.value, err: "" })}
                  onKeyDown={(e) => e.key === "Enter" && doLogin()}
                  placeholder="กรอกรหัสผ่าน"
                  className="h-[52px] w-full rounded-2xl border-2 border-[#C9D7E5] bg-[#F4F8FC] pl-4 pr-16 text-base focus:border-[#1B6A93] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2 top-1/2 h-9 -translate-y-1/2 rounded-lg px-3 text-sm font-medium text-[#1B6A93]"
                >
                  {showPass ? "ซ่อน" : "แสดง"}
                </button>
              </div>
            </label>
            {login.err && <p className="text-sm font-medium text-red-700">{login.err}</p>}
            <button onClick={doLogin} className={`h-[54px] w-full rounded-2xl ${BLUE} text-[17px] font-bold text-white transition-transform active:scale-[0.98]`}>
              เข้าสู่ระบบ
            </button>
            <p className="text-center text-sm text-[#3B5268]">ลืมรหัสผ่าน ติดต่อผู้ดูแลระบบ</p>
          </div>
          <p className="mt-6 text-center text-xs text-[#3B5268]">รหัสผ่านทดลอง: 1234 · แตะ User/Admin เพื่อสลับ และพิมพ์ชื่อของคุณได้ เช่น Vee</p>
          <p className="mt-10 pb-6 text-center text-xs text-[#3B5268]">ระบบประเมินความสะอาด 7ส</p>
        </div>
      </main>
    );
  }

  const day = todayKey();
  const isAdmin = user.role === "admin";

  // ---------- หน้าตรวจรายพื้นที่ ----------
  if (view.name === "check") {
    const i = view.index;
    const done = Object.keys(draft.checks).length;
    const pass = Object.values(draft.checks).filter((v) => v === "pass").length;
    const save = () => {
      setResults((r) => ({
        ...r,
        [day]: { ...(r[day] || {}), [i]: { checks: draft.checks, inspector: draft.inspector } },
      }));
      setView({ name: "list" });
    };
    return (
      <main className="mx-auto min-h-screen max-w-md bg-[#EEF3F8] pb-28 text-[#12263A]">
        <Header sub="CLEAN CHECK" title={AREAS[i]} />
        <div className="relative -mt-10 space-y-4 px-5">
          <div className="space-y-2 rounded-3xl bg-white p-4 text-sm shadow-lg">
            <div className="flex justify-between">
              <span className="text-[#3B5268]">วันที่ตรวจ:</span>
              <span className="font-bold">{todayThai()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#3B5268]">ผู้รับผิดชอบ:</span>
              <span className="font-bold">{assign[i] || "ยังไม่ระบุ"}</span>
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-[#3B5268]">ผู้ตรวจประเมิน:</span>
              <input
                value={draft.inspector}
                onChange={(e) => setDraft({ ...draft, inspector: e.target.value })}
                placeholder="ระบุชื่อผู้ตรวจ"
                className="min-w-0 flex-1 rounded-lg bg-[#F4F8FC] px-3 py-2 text-right font-bold"
              />
            </label>
          </div>

          <div className={`rounded-3xl ${BLUE} p-4 text-white`}>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">{done === ITEMS.length ? "ตรวจครบแล้ว" : "ยังตรวจไม่ครบ"}</span>
              <span className="text-xl font-bold">
                {done} / {ITEMS.length}
              </span>
            </div>
            <p className="text-sm text-[#E4EFFA]">
              ตรวจแล้ว {done} จาก {ITEMS.length} รายการ{done > 0 ? ` (ผ่าน ${pass})` : ""}
            </p>
            <div className="mt-3 flex gap-2">
              {ITEMS.map((it) => (
                <span key={it.id} className={`h-1.5 flex-1 rounded-full ${draft.checks[it.id] ? "bg-white" : "bg-white/30"}`} />
              ))}
            </div>
          </div>

          {(subs[day] || {})[i] && (
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="mb-2 text-sm text-[#3B5268]">
                ผู้รับผิดชอบส่งงานเมื่อ {fmtTime(subs[day][i].at)}
                {subs[day][i].note ? ` · หมายเหตุ: ${subs[day][i].note}` : ""}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <PhotoBox src={subs[day][i].before} label="ก่อน" className="h-40" />
                <PhotoBox src={subs[day][i].after} label="หลัง" tone="after" className="h-40" />
              </div>
            </div>
          )}
          <h2 className="font-bold text-[#1B6A93]">รายการตรวจความสะอาด</h2>
          {ITEMS.map((it, n) => {
            const v = draft.checks[it.id];
            return (
              <div key={it.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="font-bold text-[#1B6A93]">
                  <span className="mr-2 inline-block h-6 w-6 rounded-full bg-[#E4EFFA] text-center text-sm leading-6">{n + 1}</span>
                  {it.name}
                </p>
                <p className="mt-1 text-sm text-[#3B5268]">{it.hint}</p>
                <div className="mt-3 flex gap-2">
                  {[
                    ["pass", "ผ่าน", "bg-[#2E8B57] text-white"],
                    ["fix", "ปรับปรุง", "bg-[#E08A1E] text-white"],
                  ].map(([val, label, on]) => (
                    <button
                      key={val}
                      aria-pressed={v === val}
                      onClick={() => setDraft({ ...draft, checks: { ...draft.checks, [it.id]: val } })}
                      className={`h-11 rounded-xl px-5 text-sm font-medium ${v === val ? on : "bg-[#F1F4F8] text-[#12263A]"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="fixed inset-x-0 bottom-0 bg-[#EEF3F8]/95 px-5 pb-5 pt-3">
          <div className="mx-auto flex max-w-md gap-2">
            <button onClick={() => setView({ name: "list" })} className="h-[54px] rounded-2xl bg-white px-5 font-medium">
              กลับ
            </button>
            <button
              onClick={save}
              disabled={done < ITEMS.length}
              className={`h-[54px] flex-1 rounded-2xl ${BLUE} font-bold text-white disabled:opacity-40`}
            >
              บันทึกผลการประเมิน 7 ส.
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ---------- หน้ารายการพื้นที่ ----------
  const typeOf = (i) => (i < BASE_AREAS.length ? "พื้นที่ส่วนรวม" : custom[i - BASE_AREAS.length].type);
  const commonIdx = AREAS.map((_, i) => i).filter((i) => typeOf(i) === "พื้นที่ส่วนรวม");
  const personalIdx = AREAS.map((_, i) => i).filter((i) => typeOf(i) === "พื้นที่ส่วนตัว");


  // ---------- ฝั่งผู้ใช้ (งานของฉัน) ----------
  if (!isAdmin) {
    const me = (user.name || "").trim().toLowerCase();
    const mine = (n) => !!n && n.trim().toLowerCase() === me;
    const idx = AREAS.map((_, k) => k);
    const myTasks = idx.filter((k) => mine(assign[k]));
    const myChecks = idx.filter((k) => mine(inspect[k]));
    const subsToday = subs[day] || {};
    const todo = myTasks.filter((k) => !subsToday[k]);
    const doneList = myTasks.filter((k) => subsToday[k]);
    const dueOf = (k) => due[k] || "16:00";
    const logout = () => setUser(null);
    const goList = () => {
      setMyTab("tasks");
      setView({ name: "list" });
    };
    const resetPhotos = () => setPhotos({ before: null, after: null, note: "" });

    // กล้อง
    if (view.name === "cam") {
      const k = view.index;
      const isBefore = view.step === 1;
      return (
        <CameraView
          key={`${k}-${view.step}-${view.n || 0}`}
          title={AREAS[k]}
          step={view.step}
          stepTitle={isBefore ? "ขั้นที่ 1: ถ่ายรูปก่อนทำ" : "ขั้นที่ 2: ถ่ายรูปหลังทำ"}
          hint={isBefore ? "ถ่ายให้เห็นพื้นที่ทั้งหมด" : "ถ่ายมุมเดียวกับรูปก่อน"}
          thumb={isBefore ? null : photos.before}
          onBack={() => setView(view.retake ? { name: "review", index: k } : { name: "detail", index: k })}
          onShot={(img) => {
            if (isBefore) {
              setPhotos((p) => ({ ...p, before: img }));
              setView(view.retake ? { name: "review", index: k } : { name: "cam", index: k, step: 2 });
            } else {
              setPhotos((p) => ({ ...p, after: img }));
              setView({ name: "review", index: k });
            }
          }}
        />
      );
    }

    // ตรวจสอบก่อนส่ง
    if (view.name === "review") {
      const k = view.index;
      const submit = () => {
        setSubs((all) => ({
          ...all,
          [day]: { ...(all[day] || {}), [k]: { by: user.name, at: new Date().toISOString(), before: photos.before, after: photos.after, note: photos.note.trim() } },
        }));
        setView({ name: "sent", index: k });
      };
      return (
        <main className="mx-auto min-h-screen max-w-md bg-[#EEF3F8] pb-32 text-[#12263A]">
          <StaffHeader onLogout={logout} onBack={() => setView({ name: "cam", index: k, step: 2, retake: true, n: Date.now() })} title={AREAS[k]} pb="pb-8">
            <div className="mt-4 flex gap-2">
              {[1, 2, 3].map((n) => (
                <span key={n} className="h-1.5 flex-1 rounded-full bg-white/60" />
              ))}
            </div>
          </StaffHeader>
          <div className="px-5 pt-5">
            <h2 className="text-xl font-bold">ขั้นที่ 3: ตรวจสอบก่อนส่ง</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <PhotoBox src={photos.before} label="ก่อน" className="h-56" />
                <button onClick={() => setView({ name: "cam", index: k, step: 1, retake: true, n: Date.now() })} className="mt-2 w-full text-center text-[#1B6A93]">
                  ถ่ายใหม่
                </button>
              </div>
              <div>
                <PhotoBox src={photos.after} label="หลัง" tone="after" className="h-56" />
                <button onClick={() => setView({ name: "cam", index: k, step: 2, retake: true, n: Date.now() })} className="mt-2 w-full text-center text-[#1B6A93]">
                  ถ่ายใหม่
                </button>
              </div>
            </div>
            <label className="mt-6 block">
              <span className="font-bold">หมายเหตุ (ถ้ามี)</span>
              <textarea
                value={photos.note}
                onChange={(e) => setPhotos({ ...photos, note: e.target.value })}
                placeholder="พิมพ์ข้อความที่นี่"
                rows={4}
                className="mt-2 w-full rounded-2xl border border-[#C9D7E5] bg-[#F4F8FC] p-4 text-base"
              />
            </label>
          </div>
          <div className="fixed inset-x-0 bottom-0 border-t border-[#DDE4EA] bg-white px-5 pb-5 pt-4">
            <button onClick={submit} disabled={!photos.before || !photos.after} className={`mx-auto block h-[52px] w-full max-w-md rounded-2xl ${ACTION} text-lg font-bold text-white disabled:opacity-40`}>
              ส่งงาน
            </button>
          </div>
        </main>
      );
    }

    // ส่งงานแล้ว / ดูงานที่ส่ง
    if (view.name === "sent") {
      const k = view.index;
      const sub = (subs[day] || {})[k] || Object.values(subs).map((d) => d[k]).filter(Boolean).pop();
      if (!sub) return null;
      return (
        <main className="mx-auto min-h-screen max-w-md bg-[#EEF3F8] pb-10 text-[#12263A]">
          <StaffHeader onLogout={logout} title="" pb="pb-12">
            <div className="-mt-14 flex flex-col items-center text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-[#2E8B57]">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              </span>
              <p className="mt-5 text-3xl font-bold">ส่งงานแล้ว</p>
              <p className="mt-1 text-[#E4EFFA]">รอผู้ดูแลตรวจสอบ</p>
            </div>
          </StaffHeader>
          <div className="relative -mt-10 px-5">
            <div className="rounded-3xl bg-white p-5 shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-2xl font-bold">{AREAS[k]}</h2>
                <span className="rounded-full bg-[#D7ECDF] px-4 py-1.5 text-[#1F6B43]">ส่งแล้ว</span>
              </div>
              <p className="mt-1 text-[#3B5268]">ส่งเมื่อ {fmtDateLong(sub.at)} เวลา {fmtTime(sub.at)}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <PhotoBox src={sub.before} label="ก่อน" className="h-56" />
                <PhotoBox src={sub.after} label="หลัง" tone="after" className="h-56" />
              </div>
              <p className="mt-5 text-sm text-[#667C91]">หมายเหตุ</p>
              <p className="text-lg">{sub.note || "-"}</p>
              <hr className="my-4 border-[#E3E8ED]" />
              <p className="text-sm text-[#667C91]">สถานะ</p>
              <p className="mt-2 rounded-xl bg-[#FBEBC8] py-3 text-center text-[#7A4B0A]">รอตรวจจากผู้ดูแล</p>
            </div>
            <button onClick={goList} className="mt-6 h-[54px] w-full rounded-2xl border-2 border-[#2E69A8] bg-white text-lg font-bold text-[#2E69A8]">
              กลับหน้างานของฉัน
            </button>
          </div>
        </main>
      );
    }

    // รายละเอียดงาน
    if (view.name === "detail") {
      const k = view.index;
      const done = !!subsToday[k];
      return (
        <main className="mx-auto min-h-screen max-w-md bg-[#EEF3F8] pb-32 text-[#12263A]">
          <StaffHeader onLogout={logout} onBack={goList} title="รายละเอียดงาน" pb="pb-14" />
          <div className="relative -mt-10 space-y-5 px-5">
            <div className="rounded-3xl bg-white p-5 shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">{AREAS[k]}</h2>
                  <p className="text-[#3B5268]">{typeOf(k)}</p>
                </div>
                <span className={`rounded-full px-4 py-1.5 ${done ? "bg-[#D7ECDF] text-[#1F6B43]" : "bg-[#E3E8EC] text-[#4B5A66]"}`}>{done ? "ส่งแล้ว" : "รอทำ"}</span>
              </div>
              <hr className="my-3 border-[#E3E8ED]" />
              <div className="grid grid-cols-[auto_1fr_auto] gap-x-5 gap-y-1 text-[17px]">
                <span className="text-[#667C91]">วันที่</span>
                <span>{todayThai()}</span>
                <span className="text-[#667C91]">ผู้มอบหมาย</span>
                <span className="text-[#667C91]">กำหนดส่ง</span>
                <span>{dueOf(k)} น.</span>
                <span className="font-bold">ผู้ดูแลระบบ</span>
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xl font-bold">สิ่งที่ต้องทำ</h3>
              <ul className="overflow-hidden rounded-3xl bg-white">
                {taskItems(AREAS[k]).map((t, n) => (
                  <li key={t} className="flex items-center gap-4 border-b border-[#E7ECF0] px-4 py-4 last:border-0">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E1EEF3] font-bold text-[#1B6A93]">{n + 1}</span>
                    <span className="text-lg">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-xl font-bold">ขั้นตอน</h3>
              <div className="grid grid-cols-3 gap-3">
                {["ถ่ายก่อน", "ทำความสะอาด", "ถ่ายหลัง"].map((t, n) => (
                  <div key={t} className="flex flex-col items-center rounded-2xl bg-white px-2 py-5 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E1EEF3] text-xl font-bold text-[#1B6A93]">{n + 1}</span>
                    <span className="mt-3">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="fixed inset-x-0 bottom-0 border-t border-[#DDE4EA] bg-white px-5 pb-5 pt-4">
            {done ? (
              <button onClick={() => setView({ name: "sent", index: k })} className={`mx-auto block h-[52px] w-full max-w-md rounded-2xl ${ACTION} text-lg font-bold text-white`}>
                ดูงานที่ส่งแล้ว
              </button>
            ) : (
              <button
                onClick={() => {
                  resetPhotos();
                  setView({ name: "cam", index: k, step: 1 });
                }}
                className={`mx-auto flex h-[52px] w-full max-w-md items-center justify-center gap-3 rounded-2xl ${ACTION} text-lg font-bold text-white`}
              >
                <CamIcon /> ถ่ายรูปก่อนทำ
              </button>
            )}
          </div>
        </main>
      );
    }

    // หน้าหลัก: งานของฉัน / ประวัติ / โปรไฟล์
    const nav = (
      <nav className="fixed inset-x-0 bottom-0 border-t border-[#DDE4EA] bg-white pb-2">
        <div className="mx-auto flex max-w-md">
          {[
            ["tasks", "งานของฉัน", "M4 7h16M4 12h16M4 17h16"],
            ["history", "ประวัติ", "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"],
            ["profile", "โปรไฟล์", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0"],
          ].map(([id, label, d]) => (
            <button key={id} onClick={() => setMyTab(id)} aria-current={myTab === id} className={`flex flex-1 flex-col items-center gap-1 py-3 text-sm ${myTab === id ? "text-[#1B6A93]" : "text-[#667C91]"}`}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={d} />
              </svg>
              {label}
            </button>
          ))}
        </div>
      </nav>
    );

    const taskCard = (k, first) => (
      <li key={k} className="rounded-3xl bg-white p-5">
        <button className="block w-full text-left" onClick={() => setView({ name: "detail", index: k })}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xl font-bold">{AREAS[k]}</h3>
            <span className={`shrink-0 rounded-full px-4 py-1 ${first ? "bg-[#FBEBC8] text-[#7A4B0A]" : "bg-[#E3E8EC] text-[#4B5A66]"}`}>{first ? "ใหม่" : "รอทำ"}</span>
          </div>
          <p className="mt-1 text-[#3B5268]">ส่งภายใน {dueOf(k)} น.</p>
        </button>
        {first && (
          <button onClick={() => setView({ name: "detail", index: k })} className={`mt-4 flex h-[52px] w-full items-center justify-center gap-3 rounded-2xl ${ACTION} text-lg font-bold text-white`}>
            <CamIcon /> เริ่มงาน
          </button>
        )}
      </li>
    );
    const doneCard = (k) => (
      <li key={k} className="rounded-3xl bg-white p-5">
        <button className="block w-full text-left" onClick={() => setView({ name: "sent", index: k })}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xl font-bold">{AREAS[k]}</h3>
            <span className="shrink-0 rounded-full bg-[#D7ECDF] px-4 py-1 text-[#1F6B43]">ส่งแล้ว</span>
          </div>
          <p className="mt-1 text-[#3B5268]">ส่งเมื่อ {fmtTime(subsToday[k].at)}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <PhotoBox src={subsToday[k].before} label="ก่อน" className="h-24" />
            <PhotoBox src={subsToday[k].after} label="หลัง" tone="after" className="h-24" />
          </div>
        </button>
      </li>
    );

    if (myTab === "history") {
      const rows = [];
      Object.entries(subs).forEach(([d, byArea]) => Object.entries(byArea).forEach(([k, v]) => mine(v.by) && rows.push({ d, k: Number(k), v })));
      rows.sort((a, b) => (a.v.at < b.v.at ? 1 : -1));
      return (
        <main className="mx-auto min-h-screen max-w-md bg-[#EEF3F8] pb-32 text-[#12263A]">
          <StaffHeader onLogout={logout} sub="CLEAN CHECK" title="ประวัติ" />
          <ul className="relative -mt-8 space-y-3 px-5">
            {rows.length === 0 && <li className="rounded-3xl bg-white p-5 text-[#3B5268]">ยังไม่มีงานที่ส่ง</li>}
            {rows.map(({ d, k, v }) => (
              <li key={d + k} className="rounded-3xl bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold">{AREAS[k]}</h3>
                  <span className="shrink-0 rounded-full bg-[#D7ECDF] px-3 py-1 text-sm text-[#1F6B43]">ส่งแล้ว</span>
                </div>
                <p className="text-[#3B5268]">
                  {fmtDateLong(v.at)} · {fmtTime(v.at)}
                </p>
              </li>
            ))}
          </ul>
          {nav}
        </main>
      );
    }
    if (myTab === "profile") {
      return (
        <main className="mx-auto min-h-screen max-w-md bg-[#EEF3F8] pb-32 text-[#12263A]">
          <StaffHeader onLogout={logout} sub="CLEAN CHECK" title="โปรไฟล์" />
          <div className="relative -mt-8 px-5">
            <div className="rounded-3xl bg-white p-5">
              <p className="text-sm text-[#667C91]">ชื่อผู้ใช้</p>
              <p className="text-2xl font-bold">{user.name}</p>
              <p className="mt-4 text-sm text-[#667C91]">บทบาท</p>
              <p className="text-lg">ผู้ปฏิบัติงาน</p>
              <p className="mt-4 text-sm text-[#667C91]">งานที่ได้รับมอบหมาย</p>
              <p className="text-lg">{myTasks.length} งาน</p>
            </div>
          </div>
          {nav}
        </main>
      );
    }

    const total = myTasks.length;
    return (
      <main className="mx-auto min-h-screen max-w-md bg-[#EEF3F8] pb-32 text-[#12263A]">
        <StaffHeader onLogout={logout} sub="CLEAN CHECK" title="งานของฉัน" date={todayThai()} pb="pb-16" />
        <div className="relative -mt-10 space-y-4 px-5">
          <div className="rounded-3xl bg-white p-5 shadow-lg">
            <p className="text-[#3B5268]">งานวันนี้</p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <p className="text-5xl font-bold text-[#1B6A93]">
                {doneList.length} / {total}
              </p>
              <div className="w-1/2 pb-1 text-right text-[#3B5268]">
                <div className="mb-3 h-3 overflow-hidden rounded-full bg-[#D5DCE0]">
                  <div className={`h-full rounded-full ${BLUE}`} style={{ width: total ? `${(doneList.length / total) * 100}%` : "0%" }} />
                </div>
                เสร็จแล้ว {doneList.length} งาน
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {[
              ["todo", `รอทำ ${todo.length}`],
              ["done", `ส่งแล้ว ${doneList.length}`],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setDoneTab(id)} className={`rounded-full px-6 py-3 text-lg ${doneTab === id ? `${BLUE} text-white` : "bg-[#E3E8EC] text-[#4B5A66]"}`}>
                {label}
              </button>
            ))}
          </div>
          {total === 0 && myChecks.length === 0 && (
            <div className="rounded-3xl bg-white p-5 text-[#3B5268]">
              ยังไม่มีงานที่ได้รับมอบหมาย รอแอดมินมอบหมายงานให้ชื่อ “{user.name}” ก่อน งานจะขึ้นที่นี่
            </div>
          )}
          <ul className="space-y-3">
            {doneTab === "todo" && todo.map((k, n) => taskCard(k, n === 0))}
            {doneTab === "done" && doneList.map((k) => doneCard(k))}
            {doneTab === "todo" &&
              myChecks.map((k) => (
                <li key={"c" + k} className="rounded-3xl bg-white p-5">
                  <button
                    className="flex w-full items-start justify-between gap-3 text-left"
                    onClick={() => {
                      const r = results[day]?.[k];
                      setDraft(r ? { checks: r.checks, inspector: r.inspector } : { checks: {}, inspector: user.name });
                      setView({ name: "check", index: k });
                    }}
                  >
                    <div>
                      <h3 className="text-xl font-bold">ตรวจเช็คความเรียบร้อย</h3>
                      <p className="mt-1 text-[#3B5268]">{AREAS[k]}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#E3E8EC] px-4 py-1 text-[#4B5A66]">ตรวจเช็ค</span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
        {nav}
      </main>
    );
  }

  const Card = ({ i }) => {
    const r = results[day]?.[i];
    const p = r ? Object.values(r.checks).filter((v) => v === "pass").length : 0;
    const isCustom = i >= BASE_AREAS.length;
    const label = "text-sm text-[#3B5268]";
    const assignBtn = (kind) => (
      <button
        onClick={() => {
          setAssigning({ i, kind });
          setNameInput((kind === "worker" ? assign[i] : inspect[i]) || "");
          setDueInput(due[i] || "16:00");
        }}
        className="mt-1 h-11 w-full truncate rounded-xl bg-[#F1F4F8] px-3 text-sm font-bold text-[#1B6A93]"
      >
        {(kind === "worker" ? assign[i] : inspect[i]) || "มอบหมาย"}
      </button>
    );
    return (
      <li className="rounded-2xl border border-[#DBE8F5] bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 font-bold text-[#1B6A93]">
          <span className="inline-block h-7 min-w-7 rounded-full bg-[#E4EFFA] px-2 text-center text-sm leading-7">{i + 1}</span>
          {AREAS[i]}
        </p>
        {isCustom && (
          <p className="mt-1 text-sm text-[#3B5268]">
            {typeOf(i)} · {assign[i] ? `ผู้รับผิดชอบ: ${assign[i]}` : "ยังไม่ได้มอบหมาย"}
          </p>
        )}
        {(subs[day] || {})[i] && (
          <button
            onClick={() => {
              const r = results[day]?.[i];
              setDraft(r ? { checks: r.checks, inspector: r.inspector } : { checks: {}, inspector: inspect[i] || user.name });
              setView({ name: "check", index: i });
            }}
            className="mt-2 w-full rounded-xl bg-[#E4F3EA] px-3 py-2 text-left text-sm font-medium text-[#1F6B43]"
          >
            ส่งงานแล้ว {fmtTime(subs[day][i].at)} โดย {subs[day][i].by} · แตะเพื่อดูรูปและตรวจ
          </button>
        )}
        {isAdmin ? (
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <span className={label}>มอบหมายงาน</span>
              {assignBtn("worker")}
            </div>
            <div>
              <span className={label}>มอบหมายงานผู้ตรวจ</span>
              {assignBtn("inspector")}
            </div>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-[#3B5268]">
              ผู้รับผิดชอบ: {assign[i] || "ยังไม่ได้มอบหมาย"} · ผู้ตรวจ: {inspect[i] || "ยังไม่ได้มอบหมาย"}
              {r ? ` · ตรวจแล้ววันนี้ ผ่าน ${p}/${ITEMS.length}` : ""}
            </p>
            <button
              onClick={() => {
                setDraft(r ? { checks: r.checks, inspector: r.inspector } : { checks: {}, inspector: inspect[i] || user.name });
                setView({ name: "check", index: i });
              }}
              className={`mt-3 h-11 rounded-xl ${BLUE} px-5 text-sm font-bold text-white`}
            >
              {r ? "ดู/แก้ผลตรวจ" : "ประเมิน"}
            </button>
          </>
        )}
      </li>
    );
  };

  const doAddRoom = () => {
    const name = newRoom.name.trim();
    if (!name) return;
    setCustom((c) => [...c, { name, type: newRoom.type }]);
    setNewRoom({ name: "", type: "พื้นที่ส่วนรวม" });
    setAdding(false);
  };

  const closeAssign = () => setAssigning(null);
  const saveAssign = () => {
    const v = nameInput.trim();
    if (assigning.kind === "worker") {
      setAssign((a) => ({ ...a, [assigning.i]: v }));
      setDue((d) => ({ ...d, [assigning.i]: dueInput }));
    }
    else setInspect((a) => ({ ...a, [assigning.i]: v }));
    setAssigning(null);
  };

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#EEF3F8] pb-10 text-[#12263A]">
      <Header title={"แบบประเมินความสะอาด 7ส."}>
        <button
          onClick={() => setUser(null)}
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#1B6A93]"
        >
          ออกจากระบบ
        </button>
      </Header>
      <div className="relative -mt-10 px-5">
        <div className="mx-3 space-y-1 rounded-3xl bg-white p-4 text-sm shadow-lg">
          <p>
            <span className="text-[#3B5268]">วันที่ : </span>
            <span className="font-bold">{todayThai()}</span>
          </p>
          <p>
            <span className="text-[#3B5268]">เวลา : </span>
            <span className="font-bold">{clock}</span>
          </p>
        </div>

        <div className="mb-3 mt-6 flex items-end justify-between gap-3">
          <h2 className="text-2xl font-bold text-[#1B6A93]">พื้นที่ส่วนรวม</h2>
          {isAdmin && (
            <button onClick={() => setAdding(true)} className={`rounded-xl ${BLUE} px-4 py-3 text-sm font-bold text-white`}>
              + เพิ่มห้องอื่น ๆ
            </button>
          )}
        </div>
        <ul className="space-y-3">
          {commonIdx.map((i) => (
            <Card key={i} i={i} />
          ))}
        </ul>

        <h2 className="mb-3 mt-8 text-2xl font-bold text-[#1B6A93]">พื้นที่ส่วนตัว</h2>
        {personalIdx.length === 0 ? (
          <p className="text-sm text-[#3B5268]">ยังไม่มีพื้นที่ส่วนตัว</p>
        ) : (
          <ul className="space-y-3">
            {personalIdx.map((i) => (
              <Card key={i} i={i} />
            ))}
          </ul>
        )}
        <p className="mt-6 text-xs text-[#3B5268]">ข้อมูลเก็บในเครื่องนี้เท่านั้น (รอบสองจะซิงค์ข้ามเครื่อง)</p>
      </div>

      {assigning && (
        <div className="fixed inset-0 z-10 flex items-end bg-black/40" onClick={closeAssign}>
          <div className="mx-auto w-full max-w-md rounded-t-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-[#1B6A93]">
              {assigning.kind === "worker" ? "มอบหมายงาน" : "มอบหมายงานผู้ตรวจ"}: {AREAS[assigning.i]}
            </p>
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={assigning.kind === "worker" ? "ชื่อผู้รับผิดชอบ" : "ชื่อผู้ตรวจ"}
              className="mt-3 h-[52px] w-full rounded-2xl border-2 border-[#C9D7E5] bg-[#F4F8FC] px-4 text-base"
            />
            {assigning.kind === "worker" && (
              <label className="mt-3 block text-sm text-[#3B5268]">
                ส่งภายใน (เวลา)
                <input
                  type="time"
                  value={dueInput}
                  onChange={(e) => setDueInput(e.target.value)}
                  className="mt-1 h-[52px] w-full rounded-2xl border-2 border-[#C9D7E5] bg-[#F4F8FC] px-4 text-base"
                />
              </label>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={closeAssign} className="h-12 flex-1 rounded-xl bg-[#F1F4F8] font-medium">
                ยกเลิก
              </button>
              <button onClick={saveAssign} className={`h-12 flex-1 rounded-xl ${BLUE} font-bold text-white`}>
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-5" onClick={() => setAdding(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-2xl font-bold text-[#1B6A93]">เพิ่มห้องอื่น ๆ</h3>
              <button onClick={() => setAdding(false)} className="rounded-xl border-2 border-[#1B6A93] px-5 py-2 text-sm font-bold text-[#1B6A93]">
                ปิด
              </button>
            </div>
            <p className="mt-3 text-sm text-[#667C91]">เพิ่มพื้นที่สำหรับมอบหมายงานทำความสะอาด</p>

            <label className="mt-5 block">
              <span className="font-bold text-[#3F4655]">ชื่อห้อง</span>
              <input
                autoFocus
                value={newRoom.name}
                onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                placeholder="เช่น ห้องอเนกประสงค์"
                className="mt-2 h-[52px] w-full rounded-2xl border-2 border-[#79BBE4] bg-[#F4F8FC] px-4 text-base"
              />
            </label>
            <label className="mt-4 block">
              <span className="font-bold text-[#3F4655]">ประเภทพื้นที่</span>
              <select
                value={newRoom.type}
                onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
                className="mt-2 h-[52px] w-full rounded-2xl border-2 border-[#79BBE4] bg-[#F4F8FC] px-4 text-base"
              >
                <option>พื้นที่ส่วนรวม</option>
                <option>พื้นที่ส่วนตัว</option>
              </select>
            </label>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setAdding(false)} className="h-12 flex-1 rounded-xl border-2 border-[#1B6A93] font-bold text-[#1B6A93]">
                ยกเลิก
              </button>
              <button
                onClick={doAddRoom}
                disabled={!newRoom.name.trim()}
                className={`h-12 flex-[1.3] rounded-xl ${BLUE} font-bold text-white disabled:opacity-40`}
              >
                เพิ่มห้อง
              </button>
            </div>
            <p className="mt-4 text-sm text-[#667C91]">ห้องใหม่จะแสดงต่อท้ายรายการพื้นที่ส่วนรวม</p>
          </div>
        </div>
      )}
    </main>
  );
}
