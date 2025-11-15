// src/components/Instructor/AttendanceReport.jsx
import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  getClassesByInstructor,
  getInstructorSessions,
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
  // Load instructor classes
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
  // Fetch all sessions for selected class
  // ---------------------------------------------------
  const fetchSessions = async () => {
    if (!selectedClass) {
      setSessions([]);
      return;
    }

    setLoading(true);

    try {
      let data = await getInstructorSessions(selectedClass);
      data = data.map((s) => ({ ...s, _id: String(s._id) }));

      const sorted = (data || []).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      setSessions(sorted);
    } catch {
      toast.error("Failed to load attendance sessions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [selectedClass]);

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
    end.setDate(end.getDate() + 6); // WEEK END

    const filtered = sessions.filter((s) => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });

    

    setFilteredSessions(filtered);
  }, [weekStart, sessions]);

  // ---------------------------------------------------
  // EXPORT PDF (WEEKLY FORMAT)
  // ---------------------------------------------------
  const exportToPDF = () => {
    if (filteredSessions.length === 0) {
      toast.warn("No attendance found for selected week.");
      return;
    }

    const meta = classes.find((c) => c._id === selectedClass);
    if (!meta) return;

    const doc = new jsPDF("l", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    // HEADER LOGOS + SCHOOL HEADER
    doc.addImage("/ccit-logo.png", "PNG", 15, 8, 25, 25);
    doc.addImage("/prmsu.png", "PNG", pageWidth - 40, 8, 25, 25);

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("Republic of the Philippines", pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(15);
    doc.text(
      "PRESIDENT RAMON MAGSAYSAY STATE UNIVERSITY",
      pageWidth / 2,
      22,
      { align: "center" }
    );

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

    // METADATA
    const instructorName = `${instructor.first_name} ${instructor.last_name}`;
    const subject = `${meta.subject_code} – ${meta.subject_title}`;
    const courseSection = `${meta.course} – ${meta.section}`;
    const firstSession = sessions[0] || {};
    const semester = firstSession.semester || meta?.semester || "N/A";
    const schoolYear = firstSession.school_year || "N/A";

    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    doc.setFontSize(11);
    doc.text(`Instructor: ${instructorName}`, 15, 65);
    doc.text(`Subject: ${subject}`, 15, 72);
    doc.text(`Course & Section: ${courseSection}`, 15, 79);
    doc.text(`Semester: ${semester}`, 15, 86);
    doc.text(`School Year: ${schoolYear}`, 15, 93);

    doc.text(`Week Of: ${startStr} to ${endStr}`, pageWidth - 100, 65);

    // Week days
    const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // Student list from first session
    const allStudents = filteredSessions[0].students.map((s) => ({
      id: s.student_id,
      name: `${s.last_name}, ${s.first_name}`,
    }));

    // Build weekly table
    const tableRows = allStudents.map((student, index) => {
      const row = [index + 1, student.name];

      weekDays.forEach((day) => {
        const record = filteredSessions.find((sess) => {
          const d = new Date(sess.date);
          return d.toLocaleDateString("en-US", { weekday: "long" }) === day;
        });

        if (!record) {
          row.push("");
          return;
        }

        const log = record.students.find((s) => s.student_id === student.id);

        if (!log) row.push("");
        else if (log.status === "Present") row.push("P");
        else if (log.status === "Late") row.push("L");
        else if (log.status === "Absent") row.push("A");
        else row.push("");
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

    const safeSubject = `${meta.subject_code} - ${meta.subject_title}`
      .replace(/[^a-zA-Z0-9\- ]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    doc.save(`${safeSubject} - Weekly Attendance Report.pdf`);
  };

  // Extract metadata for Class Info Box
  const meta = sessions.length > 0 ? sessions[0] : null;

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
            <option value="">Select Class</option>
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

        {/* Week Range Display */}
        {weekStart && weekEnd && (
          <div className="px-4 py-3 bg-neutral-900/60 border border-white/10 rounded-lg text-gray-300">
            <p className="text-sm">
              <span className="text-emerald-400 font-medium">Week:</span>{" "}
              {weekStart.toISOString().split("T")[0]} — {weekEnd.toISOString().split("T")[0]}
            </p>
          </div>
        )}
      </div>

      {/* Class Information */}
      {meta && (
        <div className="p-6 bg-neutral-900/60 border border-white/10 rounded-xl space-y-4">
          <h3 className="text-lg font-semibold text-emerald-400">Class Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="space-y-1">
              <p className="text-xs text-gray-400">Subject</p>
              <p className="text-white font-medium">
                {meta.subject_code} — {meta.subject_title}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-gray-400">Course & Section</p>
              <p className="text-white font-medium">{meta.course} — {meta.section}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-gray-400">Semester</p>
              <p className="text-white font-medium">{meta.semester}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-gray-400">School Year</p>
              <p className="text-white font-medium">{meta.school_year}</p>
            </div>

          </div>
        </div>
      )}

      {/* Attendance Table */}
      {filteredSessions.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-white/10 shadow-lg">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-neutral-800 text-emerald-300">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
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
          {loading ? "Loading attendance..." : "No attendance for this week."}
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
