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
    course: "All",
    subject: "All",
    section: "All",
    instructor: "All",
  });

  // ---------------------------------------------------
  // LOAD CLASS LIST (once)
  // ---------------------------------------------------
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

  // ---------------------------------------------------
  // AUTO-FETCH SESSIONS WHEN FILTERS CHANGE
  // ---------------------------------------------------
  useEffect(() => {
    const hasFilter =
      filters.course !== "All" &&
      filters.subject !== "All" &&
      filters.section !== "All" &&
      filters.instructor !== "All";

    if (hasFilter) {
      fetchSessions();
    } else {
      setSessions([]);
    }
  }, [filters]);

  // ---------------------------------------------------
  // FETCH SESSIONS FOR SELECTED CLASS
  // ---------------------------------------------------
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Find class that matches the filters
      const selected = classes.find(
        (cls) =>
          cls.course === filters.course &&
          cls.subject_code === filters.subject &&
          cls.section === filters.section &&
          `${cls.instructor_first_name} ${cls.instructor_last_name}`.trim() ===
            filters.instructor
      );

      if (!selected) {
        setSessions([]);
        setLoading(false);
        return;
      }

      const classId = selected._id;

      // 🔥 Correct backend route
      const res = await axios.get(`${API}/api/attendance/sessions/${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to load attendance sessions");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------
  // FILTER CHANGE HANDLER
  // ---------------------------------------------------
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const toggleExpand = (idx) => {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // ---------------------------------------------------
  // EXPORT PDF (PER SESSION)
  // ---------------------------------------------------
  const exportToPDF = () => {
    if (sessions.length === 0) {
      toast.error("No sessions to export.");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("ATTENDANCE SESSIONS REPORT", 105, 15, { align: "center" });

    let offsetY = 25;

    sessions.forEach((session) => {
      doc.setFontSize(12);
      doc.text(`Session Date: ${session.date}`, 15, offsetY);
      doc.text(`Subject: ${filters.subject}`, 15, offsetY + 7);

      autoTable(doc, {
        startY: offsetY + 12,
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

  // ---------------------------------------------------
  // DROPDOWN OPTIONS
  // ---------------------------------------------------
  const courseList = [...new Set(classes.map((c) => c.course))];
  const subjectList = [...new Set(classes.map((c) => c.subject_code))];
  const sectionList = [...new Set(classes.map((c) => c.section))];
  const instructorList = [
    ...new Set(
      classes.map(
        (c) =>
          `${c.instructor_first_name} ${c.instructor_last_name}`.trim()
      )
    ),
  ];

  // ---------------------------------------------------
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

      {/* FILTERS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Course */}
        <select
          value={filters.course}
          onChange={(e) => handleFilterChange("course", e.target.value)}
          className="px-4 py-2 bg-neutral-900 border border-neutral-700 text-white rounded-lg"
        >
          <option value="All">All Courses</option>
          {courseList.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        {/* Subject */}
        <select
          value={filters.subject}
          onChange={(e) => handleFilterChange("subject", e.target.value)}
          className="px-4 py-2 bg-neutral-900 border border-neutral-700 text-white rounded-lg"
        >
          <option value="All">All Subjects</option>
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
          <option value="All">All Sections</option>
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
          <option value="All">All Instructors</option>
          {instructorList.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
      </div>

      {/* SESSION LIST */}
      <h3 className="text-xl font-extrabold text-white mt-8">Attendance Sessions</h3>

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
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="text-emerald-400" />
                <span className="font-semibold text-lg">
                  {session.date}
                </span>
              </div>

              {expanded[idx] ? (
                <FaChevronUp />
              ) : (
                <FaChevronDown />
              )}
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
