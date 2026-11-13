"use client";
import { useEffect, useState } from "react";

const KEY = "cleancheck-v1";

// บัญชีทดลอง (รอบแรก) จะเปลี่ยนเป็นระบบล็อกอินจริงในรอบสอง
const USERS = [
  { u: "admin", p: "1234", role: "admin", name: "ผู้ดูแลระบบ" },
  { u: "user", p: "1234", role: "staff", name: "ผู้ใช้" },
];

const AREAS = [
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
  new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

const BLUE = "bg-[#1B6A93]";

function Header({ title, sub, children }) {
  return (
    <header className={`relative overflow-hidden rounded-b-[36px] ${BLUE} px-5 pb-24 pt-8 text-white`}>
      <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-white/10" />
      <div className="absolute right-8 top-10 h-20 w-20 rounded-full bg-white/15" />
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
  const [login, setLogin] = useState({ u: "user", p: "", err: "" });
  const [assigning, setAssigning] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [draft, setDraft] = useState({ checks: {}, inspector: "" });

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (d.assign) setAssign(d.assign);
      if (d.results) setResults(d.results);
      if (d.user) setUser(d.user);
    } catch (e) {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ assign, results, user }));
    } catch (e) {}
  }, [assign, results, user, ready]);

  if (!ready) return <main className="min-h-screen bg-[#EEF3F8]" />;

  const doLogin = () => {
    const found = USERS.find((x) => x.u === login.u.trim() && x.p === login.p);
    if (!found) return setLogin({ ...login, err: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    setUser({ u: found.u, role: found.role, name: found.name });
    setLogin({ u: "user", p: "", err: "" });
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
              <button
                type="button"
                onClick={() => setLogin({ ...login, u: login.u === "admin" ? "user" : "admin", err: "" })}
                className="mt-2 flex h-[52px] w-full items-center justify-between rounded-2xl border-2 border-[#C9D7E5] bg-[#F4F8FC] px-4 text-base"
              >
                <span className="font-medium">{login.u === "admin" ? "Admin" : "User"}</span>
                <span className="text-[13px] text-[#3B5268]">
                  {login.u === "admin" ? "แตะเพื่อเปลี่ยนเป็น User" : "แตะเพื่อเปลี่ยนเป็น Admin"}
                </span>
              </button>
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
          <p className="mt-6 text-center text-xs text-[#3B5268]">รหัสผ่านทดลอง: 1234 (ใช้ได้ทั้ง User และ Admin)</p>
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
  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#EEF3F8] pb-10 text-[#12263A]">
      <Header title={"แบบประเมินความสะอาด 7ส."}>
        <button onClick={() => setUser(null)} className="absolute right-0 top-0 rounded-full bg-white/20 px-3 py-1 text-sm">
          ออกจากระบบ
        </button>
      </Header>
      <div className="relative -mt-10 px-5">
        <div className="space-y-1 rounded-3xl bg-white p-4 text-sm shadow-lg">
          <p>
            <span className="text-[#3B5268]">วันที่: </span>
            <span className="font-bold">{todayThai()}</span>
          </p>
          <p>
            <span className="text-[#3B5268]">ผู้ใช้: </span>
            <span className="font-bold">
              {user.name} ({isAdmin ? "แอดมิน" : "ผู้ตรวจ"})
            </span>
          </p>
        </div>

        <h2 className="mb-3 mt-6 text-2xl font-bold text-[#1B6A93]">พื้นที่ส่วนรวม</h2>
        <ul className="space-y-3">
          {AREAS.map((name, i) => {
            const r = results[day]?.[i];
            const p = r ? Object.values(r.checks).filter((v) => v === "pass").length : 0;
            return (
              <li key={name} className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="font-bold text-[#1B6A93]">
                  <span className="mr-2 inline-block h-6 w-6 rounded-full bg-[#E4EFFA] text-center text-sm leading-6">{i + 1}</span>
                  {name}
                </p>
                <p className="mt-1 text-sm text-[#3B5268]">
                  {assign[i] ? `ผู้รับผิดชอบ: ${assign[i]}` : "ยังไม่ได้มอบหมายงาน"}
                  {r ? ` · ตรวจแล้ววันนี้ ผ่าน ${p}/${ITEMS.length}` : ""}
                </p>
                <div className="mt-3 flex gap-2">
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setAssigning(i);
                        setNameInput(assign[i] || "");
                      }}
                      className="h-11 rounded-xl bg-[#F1F4F8] px-5 text-sm font-medium"
                    >
                      มอบหมาย
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setDraft(r ? { checks: r.checks, inspector: r.inspector } : { checks: {}, inspector: user.name });
                      setView({ name: "check", index: i });
                    }}
                    className={`h-11 rounded-xl ${BLUE} px-5 text-sm font-medium text-white`}
                  >
                    {r ? "ดู/แก้ผลตรวจ" : "ประเมิน"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-xs text-[#3B5268]">ข้อมูลเก็บในเครื่องนี้เท่านั้น (รอบสองจะซิงค์ข้ามเครื่อง)</p>
      </div>

      {assigning !== null && (
        <div className="fixed inset-0 z-10 flex items-end bg-black/40" onClick={() => setAssigning(null)}>
          <div className="mx-auto w-full max-w-md rounded-t-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-[#1B6A93]">มอบหมาย: {AREAS[assigning]}</p>
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="ชื่อผู้รับผิดชอบ"
              className="mt-3 h-[52px] w-full rounded-2xl border-2 border-[#C9D7E5] bg-[#F4F8FC] px-4 text-base"
            />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setAssigning(null)} className="h-12 flex-1 rounded-xl bg-[#F1F4F8] font-medium">
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  setAssign((a) => ({ ...a, [assigning]: nameInput.trim() }));
                  setAssigning(null);
                }}
                className={`h-12 flex-1 rounded-xl ${BLUE} font-bold text-white`}
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
