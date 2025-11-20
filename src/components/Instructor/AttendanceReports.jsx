// src/components/Instructor/AttendanceReport.jsx
import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  getClassesByInstructor,
  getInstructorSessions,
  getAllInstructorSessions,
} from "../../services/api";

import { toast } from "react-toastify";
import { FaClipboardList, FaListUl, FaFilePdf } from "react-icons/fa";

import { useModal } from "./ModalManager";
import DailyLogsModal from "./DailyLogsModal";

const AttendanceReport = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  // WEEK FILTER
  const [weekStart, setWeekStart] = useState(null);

  const weekEnd = weekStart
    ? new Date(new Date(weekStart).setDate(new Date(weekStart).getDate() + 6))
    : null;

  const instructor = JSON.parse(localStorage.getItem("userData"));
  const { openModal } = useModal();

  // ---------------------------------------------------
  // Load instructor classes & ALL sessions on load
  // ---------------------------------------------------
  useEffect(() => {
    if (!instructor?.instructor_id) {
      toast.error("Instructor data missing. Please login again.");
      return;
    }
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const data = await getClassesByInstructor(instructor.instructor_id);
      setClasses(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load classes.");
    }
  };

  // ---------------------------------------------------
  // Fetch sessions (ALL by default or filtered by class)
  // ---------------------------------------------------
  const fetchSessions = async () => {
    setLoading(true);

    try {
      let data = [];

      // 🟢 If no class selected → fetch ALL sessions
      if (!selectedClass) {
        data = await getAllInstructorSessions(instructor.instructor_id);
      } else {
        // 🟦 Fetch only sessions of selected class
        data = await getInstructorSessions(selectedClass);
      }

      // Create quick lookup for class metadata
      const classMap = {};
      classes.forEach((cls) => {
        classMap[cls._id] = cls;
      });

      // Inject class metadata into each session
      data = data.map((s) => ({
        ...s,
        _id: String(s._id),
        subject_code: classMap[s.class_id]?.subject_code || "Unknown",
        subject_title: classMap[s.class_id]?.subject_title || "",
        course: classMap[s.class_id]?.course || "",
        section: classMap[s.class_id]?.section || "",
      }));

      // Sort latest first
      const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));

      setSessions(sorted);
    } catch {
      toast.error("Failed to load attendance sessions.");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch sessions when class changes OR classes load
  useEffect(() => {
    if (classes.length > 0) {
      fetchSessions();
    }
  }, [selectedClass, classes]);

  // ---------------------------------------------------
  // Apply WEEK FILTER
  // ---------------------------------------------------
  useEffect(() => {
    if (!weekStart || sessions.length === 0) {
      setFilteredSessions(sessions);
      return;
    }

    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const filtered = sessions.filter((s) => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });

    setFilteredSessions(filtered);
  }, [weekStart, sessions]);

  // ---------------------------------------------------
  // EXPORT PDF
  // ---------------------------------------------------
  const exportToPDF = () => {
    if (filteredSessions.length === 0) {
      toast.warn("No attendance found for selected week.");
      return;
    }

    const meta = classes.find((c) => c._id === selectedClass);
    const doc = new jsPDF("l", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    // HEADER
    doc.addImage("/ccit-logo.png", "PNG", 15, 8, 25, 25);
    doc.addImage("/prmsu.png", "PNG", pageWidth - 40, 8, 25, 25);

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("Republic of the Philippines", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(15);
    doc.text("PRESIDENT RAMON MAGSAYSAY STATE UNIVERSITY", pageWidth / 2, 22, { align: "center" });
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.text("(Ramon Magsaysay Technological University)", pageWidth / 2, 29, { align: "center" });
    doc.setFontSize(11);
    doc.text("Iba, Zambales", pageWidth / 2, 35, { align: "center" });
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text("COLLEGE OF COMMUNICATION AND INFORMATION TECHNOLOGY", pageWidth / 2, 42, { align: "center" });

    // TITLE
    doc.setFontSize(16);
    doc.setTextColor(34, 197, 94);
    doc.text("WEEKLY ATTENDANCE REPORT", pageWidth / 2, 52, { align: "center" });
    doc.setTextColor(0, 0, 0);

    const instructorName = `${instructor.first_name} ${instructor.last_name}`;
    const sessionMeta = filteredSessions[0] || {};

    doc.setFontSize(11);
    doc.text(`Instructor: ${instructorName}`, 15, 65);

    if (meta) {
      doc.text(`Subject: ${meta.subject_code} – ${meta.subject_title}`, 15, 72);
      doc.text(`Course & Section: ${meta.course} – ${meta.section}`, 15, 79);
      doc.text(`Semester: ${sessionMeta.semester || "N/A"}`, 15, 86);
      doc.text(`School Year: ${sessionMeta.school_year || "N/A"}`, 15, 93);
    }

    if (weekStart) {
      const startStr = new Date(weekStart).toISOString().split("T")[0];
      const endStr = new Date(weekEnd).toISOString().split("T")[0];
      doc.text(`Week Of: ${startStr} to ${endStr}`, pageWidth - 100, 65);
    }

    const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const allStudents = filteredSessions[0].students.map((s) => ({
      id: s.student_id,
      name: `${s.last_name}, ${s.first_name}`,
    }));

    const tableRows = allStudents.map((student, index) => {
      const row = [index + 1, student.name];

      weekDays.forEach((day) => {
        const record = filteredSessions.find((sess) => {
          const d = new Date(sess.date);
          return d.toLocaleDateString("en-US", { weekday: "long" }) === day;
        });

        const log = record?.students.find((s) => s.student_id === student.id);
        row.push(log?.status === "Present" ? "P" : log?.status === "Late" ? "L" : log?.status === "Absent" ? "A" : "");
      });

      return row;
    });

    autoTable(doc, {
      startY: 110,
      head: [["No.", "Student Name", ...weekDays]],
      body: tableRows,
      styles: { halign: "center", valign: "middle", fontSize: 9 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      columnStyles: { 1: { halign: "left" } },
    });

    doc.save("Weekly Attendance Report.pdf");
  };

  // ---------------------------------------------------
  // UI RENDER
  // ---------------------------------------------------
  return (
    <div className="p-8 bg-neutral-950/80 rounded-2xl border border-white/10 shadow-xl space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <FaClipboardList className="text-green-400 text-3xl" />
        <h2 className="text-3xl font-bold text-emerald-400">Attendance Report</h2>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Class Selector */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-4 py-2 bg-neutral-900/70 border border-white/10 text-white rounded-lg"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.subject_code} — {c.subject_title}
              </option>
            ))}
          </select>

          {/* Week Picker */}
          <DatePicker
            selected={weekStart}
            onChange={(date) => setWeekStart(date)}
            placeholderText="Week Start"
            className="px-4 py-2 bg-neutral-900/70 border border-white/10 text-white rounded-lg w-full"
          />

          {/* Refresh */}
          <button
            onClick={fetchSessions}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 transition text-white rounded-lg"
          >
            Refresh
          </button>
        </div>

        {weekStart && weekEnd && (
          <div className="px-4 py-3 bg-neutral-900/60 border border-white/10 rounded-lg text-gray-300">
            <p className="text-sm">
              <span className="text-emerald-400 font-medium">Week:</span>{" "}
              {weekStart.toISOString().split("T")[0]} — {weekEnd.toISOString().split("T")[0]}
            </p>
          </div>
        )}
      </div>

      {/* Attendance Table */}
      {filteredSessions.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-white/10 shadow-lg">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-neutral-800 text-emerald-300">
              <tr>
                <th className="px-4 py-3 text-left">Class</th>
                <th>Date</th>
                <th>Present</th>
                <th>Late</th>
                <th>Absent</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredSessions.map((session, index) => {
                const present = session.students.filter((s) => s.status === "Present").length;
                const late = session.students.filter((s) => s.status === "Late").length;
                const absent = session.students.filter((s) => s.status === "Absent").length;

                return (
                  <tr
                    key={session._id}
                    className={index % 2 ? "bg-neutral-900/50" : "bg-neutral-800/50"}
                  >
                    {/* NEW: Class Info */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">
                        {session.subject_code} — {session.subject_title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {session.course} {session.section}
                      </p>
                    </td>

                    <td className="px-4 py-3">{session.date}</td>
                    <td className="text-emerald-400 text-center">{present}</td>
                    <td className="text-yellow-400 text-center">{late}</td>
                    <td className="text-red-400 text-center">{absent}</td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => openModal(<DailyLogsModal session={session} />)}
                        className="text-emerald-400 hover:text-white text-sm flex items-center gap-2"
                      >
                        <FaListUl /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>
      ) : (
        <p className="text-gray-400 text-center mt-6">
          {loading ? "Loading attendance..." : "No attendance found."}
        </p>
      )}

      {/* Export Button */}
      {filteredSessions.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={exportToPDF}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 transition text-white rounded-lg flex items-center gap-2"
          >
            <FaFilePdf />
            Export PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default AttendanceReport;
