import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  FaChevronDown,
  FaChevronUp,
  FaDownload,
  FaCalendarAlt,
  FaUserCheck,
} from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API = "https://frams-server-production.up.railway.app";

const AttendanceMonitoringComponent = () => {
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    subject: "All",
    section: "All",
    instructor: "All",
    startDate: "",
    endDate: "",
  });

  // ======================================================
  // LOAD ALL CLASSES ONCE
  // ======================================================
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/api/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(res.data || []);
    } catch {
      toast.error("❌ Failed to load classes");
    }
  };

  // ======================================================
  // ALWAYS FETCH SESSIONS (DEFAULT: ALL)
  // ======================================================
  useEffect(() => {
    if (classes.length > 0) {
      fetchSessions();
    }
  }, [filters, classes]);

  // ======================================================
  // FETCH SESSIONS
  // ======================================================
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      let filtered = classes;

      // =============== SUBJECT FILTER ===============
      if (filters.subject !== "All") {
        filtered = filtered.filter(
          (cls) => cls.subject_code === filters.subject
        );
      }

      // =============== SECTION FILTER ===============
      if (filters.section !== "All") {
        filtered = filtered.filter((cls) => cls.section === filters.section);
      }

      // =============== INSTRUCTOR FILTER ===============
      if (filters.instructor !== "All") {
        filtered = filtered.filter(
          (cls) =>
            `${cls.instructor_first_name} ${cls.instructor_last_name}` ===
            filters.instructor
        );
      }

      let allSessions = [];

      // Load sessions from ALL matching classes
      for (let cls of filtered) {
        const res = await axios.get(
          `${API}/api/attendance/sessions/${cls._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const sessionList = res.data.sessions || [];

        const enriched = sessionList.map((session) => ({
          ...session,
          subject_code: cls.subject_code,
          section: cls.section,
          instructor_name: `${cls.instructor_first_name} ${cls.instructor_last_name}`,
        }));

        allSessions.push(...enriched);
      }

      // =============== APPLY DATE FILTERS (OPTIONAL) ===============
      if (filters.startDate) {
        allSessions = allSessions.filter(
          (s) => new Date(s.date) >= new Date(filters.startDate)
        );
      }

      if (filters.endDate) {
        allSessions = allSessions.filter(
          (s) => new Date(s.date) <= new Date(filters.endDate)
        );
      }

      // Sort newest first
      allSessions.sort((a, b) => new Date(b.date) - new Date(a.date));

      setSessions(allSessions);
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to load attendance sessions");
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // FILTER LOGIC (CASCADING)
  // ======================================================
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "subject"
        ? { section: "All", instructor: "All" }
        : field === "section"
        ? { instructor: "All" }
        : {}),
    }));
  };

  const toggleExpand = (idx) => {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // ======================================================
  // EXPORT PDF
  // ======================================================
  const exportToPDF = () => {
    if (sessions.length === 0) {
      toast.error("No sessions to export.");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("ATTENDANCE SESSIONS REPORT", 105, 15, { align: "center" });

    doc.setFontSize(11);
    doc.text(
      `Date Range: ${filters.startDate || "—"} to ${
        filters.endDate || "—"
      }`,
      105,
      22,
      { align: "center" }
    );

    let offsetY = 32;

    sessions.forEach((session) => {
      doc.setFontSize(12);
      doc.text(`Date: ${session.date}`, 15, offsetY);
      doc.text(`Subject: ${session.subject_code}`, 15, offsetY + 5);
      doc.text(`Section: ${session.section}`, 15, offsetY + 10);
      doc.text(`Instructor: ${session.instructor_name}`, 15, offsetY + 15);

      autoTable(doc, {
        startY: offsetY + 22,
        head: [["Student ID", "Name", "Status", "Time Logged"]],
        body: session.students.map((s) => [
          s.student_id,
          `${s.first_name} ${s.last_name}`,
          s.status,
          s.time || "-",
        ]),
      });

      offsetY = doc.lastAutoTable.finalY + 10;
      if (offsetY > 260) doc.addPage();
    });

    doc.save("attendance_sessions.pdf");
  };

  // ======================================================
  // DROPDOWNS
  // ======================================================
  const subjectList = [...new Set(classes.map((c) => c.subject_code))];

  const sectionList = [
    ...new Set(
      classes
        .filter(
          (c) => filters.subject === "All" || c.subject_code === filters.subject
        )
        .map((c) => c.section)
    ),
  ];

  const instructorList = [
    ...new Set(
      classes
        .filter(
          (c) =>
            (filters.subject === "All" ||
              c.subject_code === filters.subject) &&
            (filters.section === "All" || c.section === filters.section)
        )
        .map((c) => `${c.instructor_first_name} ${c.instructor_last_name}`)
    ),
  ];

  // ======================================================
  // UI
  // ======================================================
  return (
    <div className="bg-neutral-950 p-8 rounded-2xl shadow-lg max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-extrabold flex items-center gap-2 text-emerald-400">
          <FaUserCheck /> Attendance Monitoring
        </h2>

        <button
          onClick={exportToPDF}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md"
        >
          <FaDownload /> Export PDF
        </button>
      </div>

      {/* FILTER ROW (5 FILTERS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Subject */}
        <select
          value={filters.subject}
          onChange={(e) => handleFilterChange("subject", e.target.value)}
          className="px-4 py-2 bg-neutral-900 border border-neutral-700 text-white rounded-lg"
        >
          <option value="All">Select Subject</option>
          {subjectList.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        {/* Section */}
        <select
          value={filters.section}
          onChange={(e) => handleFilterChange("section", e.target.value)}
          className="px-4 py-2 bg-neutral-900 border border-neutral-700 text-white rounded-lg"
        >
          <option value="All">Select Section</option>
          {sectionList.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        {/* Instructor */}
        <select
          value={filters.instructor}
          onChange={(e) => handleFilterChange("instructor", e.target.value)}
          className="px-4 py-2 bg-neutral-900 border border-neutral-700 text-white rounded-lg"
        >
          <option value="All">Select Instructor</option>
          {instructorList.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>

        {/* Start Date */}
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => handleFilterChange("startDate", e.target.value)}
          className="px-4 py-2 bg-neutral-900 border border-neutral-700 text-white rounded-lg"
        />

        {/* End Date */}
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => handleFilterChange("endDate", e.target.value)}
          className="px-4 py-2 bg-neutral-900 border border-neutral-700 text-white rounded-lg"
        />
      </div>

      {/* SESSION LIST */}
      <h3 className="text-xl font-extrabold text-white mt-8">
        Attendance Sessions
      </h3>

      {loading ? (
        <p className="text-neutral-400 italic">Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <p className="text-neutral-400 italic">No attendance sessions found.</p>
      ) : (
        sessions.map((session, idx) => (
          <div
            key={idx}
            className="border border-neutral-700 rounded-xl bg-neutral-900 my-4"
          >
            <button
              onClick={() => toggleExpand(idx)}
              className="w-full px-5 py-4 flex justify-between items-center text-white"
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <FaCalendarAlt className="text-emerald-400" />
                  <span className="font-semibold text-lg">
                    {session.date}
                  </span>
                </div>

                <div className="text-sm text-neutral-400 mt-1">
                  <p>Subject: {session.subject_code}</p>
                  <p>Section: {session.section}</p>
                  <p>Instructor: {session.instructor_name}</p>
                </div>
              </div>

              {expanded[idx] ? <FaChevronUp /> : <FaChevronDown />}
            </button>

            {expanded[idx] && (
              <div className="p-4">
                <div className="grid grid-cols-3 bg-neutral-800 text-emerald-300 text-xs uppercase border-b border-neutral-700">
                  <div className="px-4 py-2">Student</div>
                  <div className="px-4 py-2">Status</div>
                  <div className="px-4 py-2">Time</div>
                </div>

                {session.students.map((s, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-3 border-b border-neutral-800 text-white ${
                      i % 2 === 0 ? "bg-neutral-900" : "bg-neutral-800"
                    }`}
                  >
                    <div className="px-4 py-3">
                      {s.first_name} {s.last_name}
                    </div>
                    <div className="px-4 py-3">{s.status}</div>
                    <div className="px-4 py-3 text-neutral-400">
                      {s.time || "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default AttendanceMonitoringComponent;
