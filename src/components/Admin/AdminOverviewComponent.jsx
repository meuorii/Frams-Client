import { useEffect, useState } from "react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaBook,
  FaCalendarCheck,
  FaChartPie,
  FaChartBar,
  FaListAlt,
  FaUserCircle,
} from "react-icons/fa";

/* ==============================
   ✅ API SETUP WITH TOKEN
============================== */
const API = axios.create({
  baseURL: "https://frams-server-production.up.railway.app",
});
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function AdminOverviewComponent() {
  const [program, setProgram] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [stats, setStats] = useState({
    total_students: 0,
    total_instructors: 0,
    total_classes: 0,
    attendance_today: 0,
  });

  const [distribution, setDistribution] = useState({
    present: 0,
    late: 0,
    absent: 0,
  });

  const [trend, setTrend] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [lastStudent, setLastStudent] = useState(null);

  /* ==============================
     ✅ LOAD ADMIN PROGRAM FIRST
  ============================== */
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const payload = JSON.parse(atob(token.split(".")[1]));
      const adminProgram = payload?.sub?.program || payload?.program;
      if (!adminProgram) throw new Error("Program not found in token");
      setProgram(adminProgram);
    } catch (e) {
      console.error("⚠️ Error decoding admin token:", e);
      setErr("Session invalid. Please re-login.");
      setLoading(false);
    }
  }, []);

  /* ==============================
     ✅ FETCH DASHBOARD DATA
  ============================== */
  useEffect(() => {
    if (!program) return; // wait until program is known

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [statsRes, distRes, trendRes, recentRes, lastStudRes] =
          await Promise.allSettled([
            API.get("/api/admin/overview/stats", { params: { program } }),
            API.get("/api/admin/overview/attendance-distribution", {
              params: { program },
            }),
            API.get("/api/admin/overview/attendance-trend", {
              params: { days: 7, program },
            }),
            API.get("/api/admin/overview/recent-logs", {
              params: { limit: 5, program },
            }),
            API.get("/api/admin/overview/last-student", { params: { program } }),
          ]);

        if (statsRes.status === "fulfilled")
          setStats(normalizeStats(statsRes.value.data));
        if (distRes.status === "fulfilled")
          setDistribution(normalizeDistribution(distRes.value.data));
        if (trendRes.status === "fulfilled") {
          const tdata = trendRes.value.data.trend || trendRes.value.data;
          setTrend(Array.isArray(tdata) ? tdata : []);
        }
        if (recentRes.status === "fulfilled")
          setRecentLogs(
            Array.isArray(recentRes.value.data)
              ? recentRes.value.data
              : []
          );
        if (lastStudRes.status === "fulfilled")
          setLastStudent(lastStudRes.value.data || null);
      } catch (e) {
        console.error("❌ Error fetching overview:", e);
        setErr(e?.response?.data?.error || "Failed to load overview.");
      } finally {
        setLoading(false);
      }
    })();
  }, [program]);

  /* ==============================
     ✅ UI RENDER
  ============================== */
  return (
    <div className="p-8 bg-neutral-950 min-h-screen rounded-xl text-white space-y-10 relative overflow-hidden">
      <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-emerald-500/20 blur-3xl rounded-full"></div>
      <div className="absolute bottom-0 right-0 w-[350px] h-[350px] bg-green-600/10 blur-3xl rounded-full"></div>

      <h2 className="text-3xl font-extrabold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
        {program
          ? `${program} Admin Dashboard Overview`
          : "Loading Admin Info..."}
      </h2>
      <p className="text-neutral-400 text-sm mb-10">
        Monitor students, instructors, classes, and attendance in real-time —
        filtered for your program only.
      </p>

      {loading ? (
        <p className="text-gray-400">Loading data...</p>
      ) : err ? (
        <p className="text-red-400">{err}</p>
      ) : (
        <>
          {/* 📊 Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard
              icon={<FaUserGraduate />}
              label="Total Students"
              value={stats.total_students}
              gradient="from-emerald-500/50 to-green-700/30"
              glow="hover:shadow-emerald-500/30"
            />
            <StatCard
              icon={<FaChalkboardTeacher />}
              label="Instructors"
              value={stats.total_instructors}
              gradient="from-blue-500/50 to-indigo-700/30"
              glow="hover:shadow-blue-500/30"
            />
            <StatCard
              icon={<FaBook />}
              label="Classes"
              value={stats.total_classes}
              gradient="from-purple-500/50 to-pink-700/30"
              glow="hover:shadow-purple-500/30"
            />
            <StatCard
              icon={<FaCalendarCheck />}
              label="Attendance Today"
              value={stats.attendance_today}
              gradient="from-amber-500/50 to-orange-700/30"
              glow="hover:shadow-amber-500/30"
            />
          </div>

          {/* 📈 Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Attendance Distribution */}
            <Card>
              <h3 className="text-lg font-semibold mb-4 text-emerald-400 flex items-center gap-2">
                <FaChartPie /> Attendance Distribution
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Present", value: distribution.present },
                      { name: "Absent", value: distribution.absent },
                      { name: "Late", value: distribution.late },
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    cornerRadius={6}
                    paddingAngle={1}
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    <Cell fill="#34d399" />
                    <Cell fill="#f87171" />
                    <Cell fill="#facc15" />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(17,24,39,0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px",
                      backdropFilter: "blur(8px)",
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Attendance Trend */}
            <Card>
              <h3 className="text-lg font-semibold mb-4 text-emerald-400 flex items-center gap-2">
                <FaChartBar /> Attendance Trend (7 Days)
              </h3>
              {trend.length === 0 ? (
                <p className="text-neutral-500 italic">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#9CA3AF", fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fill: "#9CA3AF", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(17,24,39,0.9)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        backdropFilter: "blur(8px)",
                        color: "#fff",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#34d399"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* 🧾 Recent Logs + Last Student */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Logs */}
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <FaListAlt /> Recent Attendance Logs
                </h3>
                <span className="text-xs text-gray-400">Last 5 Records</span>
              </div>
              <Table
                columns={["Student", "Subject", "Status", "Timestamp"]}
                rows={recentLogs.map((log) => ({
                  Student: formatName(log?.student),
                  Subject: log?.subject || "-",
                  Status: badge(log?.status),
                  Timestamp: formatDateTime(log?.timestamp),
                }))}
              />
            </Card>

            {/* Last Student Registered */}
            <Card>
              <h3 className="text-xl font-semibold mb-4 text-emerald-400 flex items-center gap-2">
                <FaUserCircle /> Last Student Registered
              </h3>

              {lastStudent ? (
                <div className="relative bg-white/5 p-6 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md flex items-center gap-5 hover:shadow-emerald-500/20 transition-all duration-500">
                  {/* Avatar */}
                  <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-700 shadow-md">
                    <FaUserCircle className="text-4xl text-white" />
                    <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-lg animate-pulse" />
                  </div>

                  {/* Info */}
                  <div className="flex flex-col">
                    <p className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                      {formatName(lastStudent)}
                    </p>
                    <p className="text-sm text-gray-300">
                      <span className="font-semibold text-gray-400">ID:</span>{" "}
                      {lastStudent.student_id || "-"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Registered: {formatDateTime(lastStudent.created_at)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 italic">No recent registration.</p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/* ==============================
   ✅ Helper Components
============================== */
function normalizeStats(s = {}) {
  return {
    total_students: s.total_students ?? 0,
    total_instructors: s.total_instructors ?? 0,
    total_classes: s.total_classes ?? 0,
    attendance_today: s.attendance_today ?? 0,
  };
}
function normalizeDistribution(d = {}) {
  return {
    present: d.present ?? 0,
    late: d.late ?? 0,
    absent: d.absent ?? 0,
  };
}
function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-6 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}
function StatCard({ icon, label, value, gradient, glow }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-6 rounded-xl border border-white/10 
      bg-gradient-to-br ${gradient} backdrop-blur-md 
      shadow-lg ${glow} transform transition-all duration-300 hover:scale-105`}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-sm text-gray-300">{label}</p>
      <p className="text-2xl font-extrabold text-white">{value ?? 0}</p>
    </div>
  );
}
function Table({ columns = [], rows = [] }) {
  return (
    <>
      <div className="hidden md:block rounded-xl border border-white/10 shadow-lg bg-white/5 backdrop-blur-md">
        <table className="min-w-full text-sm text-left text-gray-300">
          <thead className="bg-gradient-to-r from-emerald-600 to-green-800 text-white uppercase text-xs tracking-wide">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-4 py-3 font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center text-gray-500 italic"
                >
                  No data
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr
                  key={i}
                  className={`transition-all duration-300 ${
                    i % 2 === 0 ? "bg-neutral-950" : "bg-neutral-900"
                  } hover:bg-emerald-500/30 hover:scale-[1.01]`}
                >
                  {columns.map((c) => (
                    <td key={c} className="px-4 py-3 font-medium">
                      {r[c]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
function badge(status) {
  const s = String(status || "").toLowerCase();
  const map = {
    present:
      "bg-gradient-to-r from-emerald-500/50 to-green-600/30 text-emerald-300 border border-emerald-600/30",
    late:
      "bg-gradient-to-r from-yellow-500/50 to-amber-600/30 text-yellow-300 border border-yellow-600/30",
    absent:
      "bg-gradient-to-r from-red-500/50 to-rose-600/30 text-red-300 border border-red-600/30",
  };
  const cls =
    map[s] ||
    "bg-neutral-700/40 text-gray-300 border border-neutral-600/40";
  return (
    <span
      className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition ${cls}`}
    >
      {status || "-"}
    </span>
  );
}
function formatName(obj) {
  if (!obj) return "-";
  const fn = obj.first_name || obj.firstName || "";
  const ln = obj.last_name || obj.lastName || "";
  return `${fn} ${ln}`.trim() || "-";
}
function formatDateTime(dt) {
  if (!dt) return "-";
  try {
    const d = new Date(dt);
    return d.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  } catch {
    return dt;
  }
}
