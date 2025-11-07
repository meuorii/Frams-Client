// src/components/Instructor/AttendanceSession.jsx
import React, { useEffect, useState } from "react";
import { getAttendanceLogs } from "../../services/api";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const AttendanceSession = () => {
  const [recognizedStudents, setRecognizedStudents] = useState([]);
  const [lastClass, setLastClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionStart, setSessionStart] = useState(null);
  const [sessionEnd, setSessionEnd] = useState(null);

 useEffect(() => {
    const fetchStoppedSessionLogs = async () => {
      try {
        console.log("🟢 [DEBUG] Fetching logs for last stopped attendance session...");

        // ✅ STEP 1: Get the last stopped class ID from localStorage
        const classId = localStorage.getItem("lastClassId");
        if (!classId) {
          console.warn("⚠️ [DEBUG] No classId found from last stopped session.");
          setRecognizedStudents([]);
          setLoading(false);
          return;
        }

        // ✅ STEP 2: Fetch attendance logs for that specific class
        console.log("📘 [DEBUG] Fetching attendance logs for class:", classId);
        const logsRes = await getAttendanceLogs(classId);
        console.log("📦 [DEBUG] Logs response for CAP 102:", logsRes);

        if (!logsRes?.logs?.length) {
          console.warn("⚠️ [DEBUG] No logs found for this class.");
          setRecognizedStudents([]);
          setLoading(false);
          return;
        }

        // ✅ STEP 3: Use the most recent attendance log (latest date)
        const latestLog = logsRes.logs.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        )[0];
        console.log("🟩 [DEBUG] Using latest log:", latestLog);

        if (!latestLog) {
          toast.info("⚠ No recent attendance logs found for this class.");
          setLoading(false);
          return;
        }

        // ✅ STEP 4: Prepare students list (Present, Late, Absent)
        const students = (latestLog.students || []).map((s) => ({
          ...s,
          time: s.time_logged
            ? new Date(s.time_logged).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "—",
        }));

        console.log("🎯 [DEBUG] Loaded students for summary:", students);

        // ✅ STEP 5: Compute session start & end times
        const times = students
          .filter((s) => s.time_logged)
          .map((s) => new Date(s.time_logged))
          .sort((a, b) => a - b);

        if (times.length > 0) {
          setSessionStart(times[0]);
          setSessionEnd(times[times.length - 1]);
          console.log("⏰ [DEBUG] Session times:", {
            start: times[0],
            end: times[times.length - 1],
          });
        }

        // ✅ STEP 6: Sort by status → alphabetical
        students.sort((a, b) => {
          const lastA = (a.last_name || "").toLowerCase();
          const lastB = (b.last_name || "").toLowerCase();
          if (lastA < lastB) return -1;
          if (lastA > lastB) return 1;

          const firstA = (a.first_name || "").toLowerCase();
          const firstB = (b.first_name || "").toLowerCase();
          return firstA.localeCompare(firstB);
        });

        // ✅ STEP 7: Update state
        setRecognizedStudents(students);
        setLastClass(latestLog.class_info || latestLog.class);
      } catch (err) {
        console.error("❌ [DEBUG] Error fetching CAP 102 logs:", err);
        toast.error("⚠ Failed to load CAP 102 attendance summary.");
      } finally {
        setLoading(false);
      }
    };

    fetchStoppedSessionLogs();
  }, []);

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";

  const formatTime = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "";

  // ✅ Export to PDF
  const exportToPDF = () => {
    if (recognizedStudents.length === 0) {
      toast.info("⚠ No attendance logs to export.");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.addImage("/ccit-logo.png", "PNG", 15, 10, 25, 25);
    doc.addImage("/prmsu.png", "PNG", pageWidth - 40, 10, 25, 25);

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("Republic of the Philippines", pageWidth / 2, 18, { align: "center" });
    doc.text("President Ramon Magsaysay State University", pageWidth / 2, 25, {
      align: "center",
    });

    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.text("(Ramon Magsaysay Technological University)", pageWidth / 2, 32, {
      align: "center",
    });
    doc.text("Iba, Zambales", pageWidth / 2, 38, { align: "center" });

    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text(
      "COLLEGE OF COMMUNICATION AND INFORMATION TECHNOLOGY",
      pageWidth / 2,
      45,
      { align: "center" }
    );

    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94);
    doc.text("ATTENDANCE SUMMARY REPORT", pageWidth / 2, 55, {
      align: "center",
    });

    // Class Info
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    if (lastClass) {
      doc.text(
        `Subject: ${lastClass.subject_code} – ${lastClass.subject_title}`,
        20,
        65
      );
      doc.text(
        `Instructor: ${lastClass.instructor_first_name} ${lastClass.instructor_last_name}`,
        20,
        72
      );
      doc.text(
        `Course: ${lastClass.course} | Year Level: ${lastClass.year_level} | Section: ${lastClass.section}`,
        20,
        79
      );
    }

    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Date: ${formatDate(new Date().toISOString())}`, 20, 87);
    if (sessionStart && sessionEnd) {
      doc.text(
        `Time: ${formatTime(sessionStart)} - ${formatTime(sessionEnd)}`,
        20,
        94
      );
    }

    const presentCount = recognizedStudents.filter(
      (s) => s.status === "Present"
    ).length;
    const absentCount = recognizedStudents.filter(
      (s) => s.status === "Absent"
    ).length;
    const lateCount = recognizedStudents.filter(
      (s) => s.status === "Late"
    ).length;

    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(
      `Summary → Present: ${presentCount} | Absent: ${absentCount} | Late: ${lateCount}`,
      20,
      104
    );

    autoTable(doc, {
      startY: 112,
      head: [["Student ID", "Name", "Status", "Time"]],
      body: recognizedStudents.map((s) => [
        s.student_id,
        `${s.first_name} ${s.last_name}`,
        s.status,
        s.time || (s.status === "Absent" ? "—" : "N/A"),
      ]),
      styles: {
        font: "helvetica",
        fontSize: 10,
        cellPadding: 3,
        lineColor: [34, 197, 94],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: [255, 255, 255],
        halign: "center",
      },
      bodyStyles: { halign: "center" },
      alternateRowStyles: { fillColor: [240, 255, 240] },
    });

    doc.save("attendance_summary_report.pdf");
  };

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white p-8 overflow-hidden rounded-2xl">
      {/* Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 blur-[160px] rounded-full"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-600/20 blur-[160px] rounded-full"></div>

      {/* Header */}
      <div className="relative z-10 mb-6 flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold text-transparent bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text">
          🧾 Attendance Summary
        </h2>
        <p className="text-gray-400 text-sm italic">
          Summary of the most recent attendance session.
        </p>
        <span className="inline-block bg-white/10 backdrop-blur-md border border-white/20 text-emerald-300 text-xs font-medium px-3 py-1 rounded-full mt-1 w-fit shadow">
          {formatDate(new Date().toISOString())}
        </span>
      </div>

      {/* Students List */}
      <div className="relative z-10 bg-white/10 backdrop-blur-lg rounded-2xl shadow-lg border border-white/10 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-emerald-300">Attendance Summary</h3>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              Total:{" "}
              <span className="text-white font-bold">
                {recognizedStudents.length}
              </span>
            </span>
            <button
              onClick={exportToPDF}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold
                bg-gradient-to-r from-emerald-500 to-green-600 shadow-md
                hover:from-green-600 hover:to-emerald-700 hover:shadow-emerald-500/30
                transition-all duration-300"
            >
              Export PDF
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 italic animate-pulse">Loading summary...</p>
        ) : recognizedStudents.length === 0 ? (
          <div className="text-center py-6 text-gray-400 italic">
            No attendance summary available for today.
          </div>
        ) : (
          <ul className="divide-y divide-white/10 max-h-[450px] overflow-y-auto custom-scroll">
            {recognizedStudents.map((s, idx) => (
              <li
                key={`${s.student_id}-${idx}`}
                className="flex items-center justify-between py-3 px-3 hover:bg-white/5 rounded-lg transition-all duration-300"
              >
                <div>
                  <p className="font-medium text-white">
                    {s.first_name} {s.last_name}
                  </p>
                  <p className="text-xs text-gray-400">ID: {s.student_id}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full shadow backdrop-blur-md border border-white/20
                      ${
                        s.status === "Present"
                          ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white"
                          : s.status === "Late"
                          ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white"
                          : "bg-gradient-to-r from-red-500 to-red-700 text-white"
                      }`}
                  >
                    {s.status}
                  </span>
                  <span className="text-sm text-gray-300 font-mono">
                    {s.time || (s.status === "Absent" ? "—" : "N/A")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AttendanceSession;
