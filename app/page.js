"use client";
import { useEffect, useState } from "react";

const KEY = "cleancheck-v1";

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
  new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

const timeThai = () =>
  new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";

const BLUE = "bg-[#1B6A93]";

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
      if (Array.isArray(d.custom)) setCustom(d.custom);
      if (d.results) setResults(d.results);
      if (d.user) setUser(d.user);
    } catch (e) {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ assign, inspect, custom, results, user }));
    } catch (e) {}
  }, [assign, inspect, custom, results, user, ready]);

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
    if (assigning.kind === "worker") setAssign((a) => ({ ...a, [assigning.i]: v }));
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
