// src/components/Instructor/Subjects.jsx
import { useEffect, useState } from "react";
import {
  getClassesByInstructor,
  activateAttendance,
  stopAttendance,
  getInstructorById,
} from "../../services/api";
import { toast } from "react-toastify";

import {
  FaBookOpen,
  FaClock,
  FaUsers,
  FaPlayCircle,
  FaStopCircle,
} from "react-icons/fa";

const Subjects = ({ onActivateSession }) => {
  const SHOW_DEBUG = false;

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState(null);

  const [instructorData, setInstructorData] = useState(
    JSON.parse(localStorage.getItem("userData"))
  );

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (instructorData?.instructor_id && token) fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------
  // FETCH CLASSES
  // ---------------------------------------------------------
  const fetchClasses = async () => {
    try {
      const data = await getClassesByInstructor(
        instructorData.instructor_id,
        token
      );
      setClasses(data || []);
    } catch (err) {
      console.error("❌ Failed to fetch classes:", err.response?.data || err);
      toast.error("Failed to load classes.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // SCHEDULE VALIDATION
  // ---------------------------------------------------------
  const isWithinSchedule = (schedule_blocks = []) => {
    if (!Array.isArray(schedule_blocks) || schedule_blocks.length === 0)
      return false;

    const nowPH = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );

    const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const currentDay = dayMap[nowPH.getDay()];
    const currentTime = nowPH.toTimeString().slice(0, 5); // "HH:MM"

    return schedule_blocks.some((b) => {
      if (!b.days || !b.start || !b.end) return false;

      const dayMatch = b.days.includes(currentDay);
      const timeMatch = currentTime >= b.start && currentTime <= b.end;

      return dayMatch && timeMatch;
    });
  };

  // ---------------------------------------------------------
  // ACTIVATE SESSION
  // ---------------------------------------------------------
  const handleActivate = async (classId) => {
    try {
      setLoadingId(classId);

      const fresh = await getInstructorById(instructorData.instructor_id);

      localStorage.setItem("userData", JSON.stringify(fresh));
      setInstructorData(fresh);

      if (!fresh?.registered || !fresh.embeddings) {
        toast.error("❌ You must register your face first!");
        setLoadingId(null);
        return;
      }

      const emb = fresh.embeddings;
      const hasAllAngles =
        emb.front?.length &&
        emb.left?.length &&
        emb.right?.length &&
        emb.up?.length &&
        emb.down?.length;

      if (!hasAllAngles) {
        toast.error("⚠ Incomplete face registration. Capture all 5 angles.");
        setLoadingId(null);
        return;
      }

      // 🚨 Prevent if NOT scheduled
      const classInfo = classes.find((c) => c._id === classId);
      if (!isWithinSchedule(classInfo.schedule_blocks)) {
        toast.error("⚠ You can only activate attendance during the scheduled time.");
        setLoadingId(null);
        return;
      }

      await activateAttendance(classId);
      toast.success("✅ Attendance session activated!");

      fetchClasses();
      onActivateSession?.(classId);
      
    } catch (err) {
      console.error("❌ Activation Error:", err.response?.data || err);
      toast.error(err.response?.data?.error || "Failed to activate session.");
    } finally {
      setLoadingId(null);
    }
  };

  // ---------------------------------------------------------
  // STOP SESSION
  // ---------------------------------------------------------
  const handleStop = async (classId) => {
    try {
      setLoadingId(classId);
      await stopAttendance(classId);
      toast.info("🛑 Attendance session stopped.");
      fetchClasses();
    } catch (err) {
      console.error("❌ Stop failed:", err.response?.data || err);
      toast.error("Failed to stop session.");
    } finally {
      setLoadingId(null);
    }
  };

  const formatScheduleBlocks = (blocks) => {
    if (!Array.isArray(blocks) || blocks.length === 0) return "No schedule";

    const days = new Set();
    const times = [];

    blocks.forEach((b) => {
      if (Array.isArray(b.days)) b.days.forEach((d) => days.add(d));
      if (b.start && b.end) times.push(`${b.start}–${b.end}`);
    });

    return `${Array.from(days).join(", ")} • ${times.join(", ")}`;
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------
  return (
    <div className="relative z-10 bg-neutral-950 min-h-screen p-8 rounded-2xl overflow-hidden">

      {/* Background effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 blur-[160px] rounded-full"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-600/20 blur-[160px] rounded-full"></div>

      <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10">
        <h2 className="text-3xl font-extrabold flex items-center gap-3 text-transparent bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text">
          <FaBookOpen className="text-emerald-400" /> Your Classes
        </h2>
      </div>

      {loading ? (
        <p className="text-neutral-400">Loading classes...</p>
      ) : classes.length > 0 ? (
        <div className="grid sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 relative z-10">

          {classes.map((c) => {
            const allowedNow = isWithinSchedule(c.schedule_blocks);

            return (
              <div
                key={c._id}
                className="bg-neutral-900 backdrop-blur-md rounded-2xl p-6 border border-white/10
                           hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-500/30
                           transition-all duration-300 hover:-translate-y-1 flex flex-col"
              >
                <h3 className="text-xl font-bold text-white">{c.subject_title}</h3>
                <p className="text-sm text-gray-400 mb-4">{c.subject_code}</p>

                <div className="text-sm text-gray-300 space-y-3 flex-1">
                  {c.schedule_blocks?.length > 0 && (
                    <p className="flex items-center gap-2">
                      <FaClock className="text-emerald-400" />
                      {formatScheduleBlocks(c.schedule_blocks)}
                    </p>
                  )}

                  <p className="flex items-center gap-2">
                    <FaUsers className="text-emerald-400" />
                    {c.course} – {c.section}
                  </p>

                  <p>
                    <span className="font-medium text-gray-200">Status:</span>{" "}
                    {c.is_attendance_active ? (
                      <span className="text-emerald-400 font-semibold">Active</span>
                    ) : (
                      <span className="text-gray-400">Inactive</span>
                    )}
                  </p>

                  {!allowedNow && !c.is_attendance_active && (
                    <p className="text-red-400 text-xs mt-2">
                      ⚠ Not within scheduled time.
                    </p>
                  )}
                </div>

                {c.is_attendance_active ? (
                  <button
                    onClick={() => handleStop(c._id)}
                    disabled={loadingId === c._id}
                    className="mt-6 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white
                               bg-gradient-to-r from-red-500 to-red-700 disabled:opacity-50"
                  >
                    <FaStopCircle />
                    {loadingId === c._id ? "Stopping..." : "Stop Attendance"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleActivate(c._id)}
                    disabled={loadingId === c._id || !allowedNow}
                    className={`mt-6 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm
                      ${
                        allowedNow
                          ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-green-600 hover:to-emerald-700"
                          : "bg-gray-700 cursor-not-allowed opacity-60"
                      }
                      transition-all duration-300`}
                  >
                    <FaPlayCircle />
                    {loadingId === c._id ? "Activating..." : "Activate Attendance"}
                  </button>
                )}
              </div>
            );
          })}

        </div>
      ) : (
        <p className="text-neutral-400 mt-4 text-center">
          No classes found. Please contact admin.
        </p>
      )}
    </div>
  );
};

export default Subjects;
