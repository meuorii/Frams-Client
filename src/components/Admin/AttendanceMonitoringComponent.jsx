// src/components/Admin/AttendanceMonitoring.jsx
import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";

import { toast } from "react-toastify";
import { FaClipboardList, FaListUl, FaFilePdf } from "react-icons/fa";

import DailyLogsModalAdmin from "../Admin/DailyLogsModalAdmin";

const API = "https://frams-server-production.up.railway.app";

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const semesterMap = {
  "1st Sem": "1st Semester",
  "2nd Sem": "2nd Semester",
  "Summer": "Mid Year",
};

export default function AttendanceMonitoring() {
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  // ADMIN MODAL STYLE
  const [activeSession, setActiveSession] = useState(null);

  // FILTERS
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const [weekStart, setWeekStart] = useState(null);
  const weekEnd = weekStart
    ? new Date(new Date(weekStart).setDate(new Date(weekStart).getDate() + 6))
    : null;

  const formatName = (value = "") =>
    value
      .trim()
      .split(" ")
      .map((w) =>
        w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""
      )
      .join(" ");

  const formatLongDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // ============================================================
  // LOAD ATTENDANCE SESSIONS FOR ALL CLASSES
  // ============================================================
  const fetchSessions = async () => {
  setLoading(true);

  try {
    const token = localStorage.getItem("token");

    // 🔥 Fetch ALL attendance sessions (Admin version)
    const res = await axios.get(`${API}/api/attendance/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    let allSessions = res.data.sessions || [];

    // Sort by date (newest → oldest)
    allSessions.sort((a, b) => new Date(b.date) - new Date(a.date));

    setSessions(allSessions);

  } catch  {
    toast.error("❌ Failed to load attendance sessions.");
  } finally {
    setLoading(false);
  }
};

// Load once (Admin does NOT depend on classes)
useEffect(() => {
  fetchSessions();
}, []);

  // ============================================================
  // FILTER LOGIC
  // ============================================================
  useEffect(() => {
    let filtered = [...sessions];

    if (selectedClass)
      filtered = filtered.filter((s) => s.class_id === selectedClass);

    if (selectedSemester)
      filtered = filtered.filter((s) => s.semester === selectedSemester);

    if (selectedSchoolYear)
      filtered = filtered.filter((s) => s.school_year === selectedSchoolYear);

    if (selectedMonth)
      filtered = filtered.filter(
        (s) => new Date(s.date).getMonth() + 1 === Number(selectedMonth)
      );

    if (weekStart) {
      const start = new Date(weekStart);
      const end = weekEnd;
      filtered = filtered.filter((s) => {
        const d = new Date(s.date);
        return d >= start && d <= end;
      });
    }

    setFilteredSessions(filtered);
  }, [sessions, selectedClass, selectedSemester, selectedSchoolYear, selectedMonth, weekStart]);

  // ============================================================
  // GROUP SESSIONS BY CLASS
  // ============================================================
  const groupedByClass = filteredSessions.reduce((acc, s) => {
    if (!acc[s.class_id]) {
      acc[s.class_id] = {
        meta: {
          subject_code: s.subject_code,
          subject_title: s.subject_title,
          course: s.course,
          section: s.section,
          semester: s.semester,
          school_year: s.school_year,
          instructor_first_name: s.instructor_first_name,
          instructor_last_name: s.instructor_last_name,
        },
        rows: [],
      };
    }
    acc[s.class_id].rows.push(s);
    return acc;
  }, {});

  // ============================================================
  // EXPORT PDF
  // ============================================================
  const exportToPDF = () => {
    if (filteredSessions.length === 0)
      return toast.warn("No attendance to export.");

    const doc = new jsPDF("l", "mm", "a3");
    const width = doc.internal.pageSize.getWidth();
    let isFirstPage = true;

    Object.keys(groupedByClass).forEach((classId) => {
      const group = groupedByClass[classId];
      const sessions = group.rows.sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      if (!isFirstPage) doc.addPage();
      isFirstPage = false;

      const studentMap = {};

      sessions.forEach((session) => {
        (session.students || []).forEach((stud) => {
          const fullName =
            stud.student_name ||
            `${formatName(stud.last_name)}, ${formatName(stud.first_name)}`;

          if (!studentMap[stud.student_id]) {
            studentMap[stud.student_id] = {
              id: stud.student_id,
              name: fullName,
              logs: {},
            };
          }

          studentMap[stud.student_id].logs[session.date] = stud.status;
        });
      });

      const dates = sessions.map((s) => s.date);
      const tableHead = [["Student Name", ...dates]];

      const tableBody = Object.values(studentMap).map((stud) => [
        stud.name,
        ...dates.map((d) =>
          stud.logs[d] === "Present"
            ? "P"
            : stud.logs[d] === "Late"
            ? "L"
            : stud.logs[d] === "Absent"
            ? "A"
            : ""
        ),
      ]);

      doc.setFont("times", "bold");
      doc.setFontSize(16);
      doc.text("ATTENDANCE REPORT", width / 2, 25, { align: "center" });

      const meta = group.meta;

      doc.setFontSize(12);
      doc.text(
        `Subject: ${meta.subject_code} — ${meta.subject_title}`,
        15,
        40
      );
      doc.text(
        `Course & Section: ${meta.course} — ${meta.section}`,
        15,
        47
      );
      doc.text(`Semester: ${meta.semester}`, 15, 54);
      doc.text(`School Year: ${meta.school_year}`, 15, 61);
      doc.text(
        `Instructor: ${meta.instructor_first_name} ${meta.instructor_last_name}`,
        15,
        68
      );

      autoTable(doc, { startY: 80, head: tableHead, body: tableBody });
    });

    doc.save("Admin_Attendance_Report.pdf");
  };

  // ============================================================
  // UI
  // ============================================================
  return (
    <div className="p-8 bg-neutral-950 rounded-2xl shadow-xl space-y-8">
      <div className="flex items-center gap-3">
        <FaClipboardList className="text-green-400 text-3xl" />
        <h2 className="text-3xl font-bold text-emerald-400">Attendance Monitoring</h2>
      </div>

      {/* FILTERS */}
      <div className="flex items-center gap-4 pb-2 flex-wrap">

        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="min-w-[180px] px-4 py-2 bg-neutral-900 border border-white/10 text-white rounded-md"
        >
          <option value="">All Classes</option>

          {/* Build unique class options from attendance sessions */}
          {[...new Map(
            sessions.map(s => [
              s.class_id,
              {
                class_id: s.class_id,
                subject_code: s.subject_code,
                course: s.course,
                section: s.section,
              }
            ])
          ).values()].map(cls => (
            <option key={cls.class_id} value={cls.class_id}>
              {cls.subject_code} — {cls.course} {cls.section}
            </option>
          ))}
        </select>


        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="min-w-[150px] px-4 py-2 bg-neutral-900 border border-white/10 text-white rounded-md"
        >
          <option value="">All Semesters</option>
          <option value="1st Sem">1st Semester</option>
          <option value="2nd Sem">2nd Semester</option>
          <option value="Summer">Mid Year</option>
        </select>

        <select
          value={selectedSchoolYear}
          onChange={(e) => setSelectedSchoolYear(e.target.value)}
          className="min-w-[150px] px-4 py-2 bg-neutral-900 border border-white/10 text-white rounded-md"
        >
          <option value="">All School Years</option>

          {/* Extract unique school years FROM attendance sessions */}
          {[...new Set(sessions.map((s) => s.school_year))].map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>


        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="min-w-[140px] px-4 py-2 bg-neutral-900 border border-white/10 text-white rounded-md"
        >
          <option value="">All Months</option>
          {monthNames.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>

        <DatePicker
          selected={weekStart}
          onChange={(d) => setWeekStart(d)}
          placeholderText="Week Start"
          className="min-w-[140px] px-4 py-2 bg-neutral-900 border border-white/10 text-white rounded-md"
        />

        {filteredSessions.length > 0 && (
          <button
            onClick={exportToPDF}
            className="ml-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-2"
          >
            <FaFilePdf /> Export PDF
          </button>
        )}
      </div>

      {/* GROUPED TABLES */}
      {Object.keys(groupedByClass).length > 0 ? (
        <div className="space-y-10">

          {Object.entries(groupedByClass).map(([classId, group]) => (
            <div
              key={classId}
              className="bg-neutral-900/40 border border-white/10 rounded-xl p-6 shadow-lg"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {group.meta.subject_code} — {group.meta.subject_title}
                </h3>
                <p className="text-sm text-gray-400">
                  {group.meta.course} · {group.meta.section} ·{" "}
                  {semesterMap[group.meta.semester]} · {group.meta.school_year}
                </p>
                <p className="text-sm text-gray-400">
                  Instructor:{" "}
                  <span className="text-emerald-400">
                    {group.meta.instructor_first_name}{" "}
                    {group.meta.instructor_last_name}
                  </span>
                </p>
              </div>

              <table className="w-full text-sm text-gray-300">
                <thead className="bg-neutral-800 text-emerald-300">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-center">Present</th>
                    <th className="px-4 py-3 text-center">Late</th>
                    <th className="px-4 py-3 text-center">Absent</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {group.rows.map((session, i) => (
                    <tr
                      key={session._id}
                      className={i % 2 ? "bg-neutral-900/40" : "bg-neutral-800/40"}
                    >
                      <td className="px-4 py-3">{formatLongDate(session.date)}</td>

                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 rounded-full bg-emerald-900/50 text-emerald-400">
                          {session.students.filter((s) => s.status === "Present").length}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 rounded-full bg-yellow-900/50 text-yellow-400">
                          {session.students.filter((s) => s.status === "Late").length}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 rounded-full bg-red-900/50 text-red-400">
                          {session.students.filter((s) => s.status === "Absent").length}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setActiveSession(session)}
                          className="p-2 text-emerald-400 hover:text-white hover:bg-emerald-600/20 rounded-lg transition"
                        >
                          <FaListUl />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-center mt-6">
          {loading ? "Loading attendance..." : "No attendance found."}
        </p>
      )}

      {/* ADMIN MODAL */}
      {activeSession && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center">
          <div className="bg-neutral-900 p-6 rounded-xl w-full max-w-3xl shadow-lg">
            
            <DailyLogsModalAdmin session={activeSession} />

            <button
              onClick={() => setActiveSession(null)}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
