import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { createPortal } from "react-dom";

export default function SemesterManagementModal({ isOpen, onClose, onRefresh }) {
  const [semesters, setSemesters] = useState([]);
  const [semesterName, setSemesterName] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const API_BASE = "https://frams-server-production.up.railway.app/api/admin";

  // ✅ Fetch Semesters
  const fetchSemesters = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/semesters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSemesters(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load semesters.");
    }
  };

  // ✅ Add new semester
  const handleAddSemester = async (e) => {
    e.preventDefault();
    if (!semesterName || !schoolYear) return toast.error("Please fill all fields");

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE}/semesters`,
        { semester_name: semesterName, school_year: schoolYear },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Semester added successfully!");
      setSemesterName("");
      setSchoolYear("");
      fetchSemesters();
      onRefresh(); // refresh parent
    } catch (err) {
      console.error(err);
      toast.error("Failed to add semester.");
    }
  };

  // ✅ Activate semester
  const handleActivate = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_BASE}/semesters/activate/${id}`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Semester activated!");
      fetchSemesters();
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to activate semester.");
    }
  };

  useEffect(() => {
    if (isOpen) fetchSemesters();
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-lg p-6 relative shadow-lg">
        <h2 className="text-2xl font-bold text-emerald-400 mb-4 text-center">
          Semester Management
        </h2>

        {/* ➕ Add Semester */}
        <form onSubmit={handleAddSemester} className="flex flex-col gap-3 mb-6">
          <select
            value={semesterName}
            onChange={(e) => setSemesterName(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 text-sm px-3 py-2 rounded-lg focus:ring-emerald-400 focus:border-emerald-400"
          >
            <option value="">Select Semester</option>
            <option value="1st Semester">1st Semester</option>
            <option value="2nd Semester">2nd Semester</option>
            <option value="Summer">Summer</option>
          </select>

          <input
            type="text"
            placeholder="School Year (e.g. 2025–2026)"
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 text-sm px-3 py-2 rounded-lg focus:ring-emerald-400 focus:border-emerald-400"
          />

          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            Add Semester
          </button>
        </form>

        {/* 📋 List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {semesters.length > 0 ? (
            semesters.map((sem) => (
              <div
                key={sem._id}
                className={`flex justify-between items-center p-3 rounded-lg transition-all ${
                  sem.is_active
                    ? "bg-emerald-900/20 border border-emerald-500/30"
                    : "bg-neutral-800/50 border border-neutral-700 hover:border-emerald-400/40"
                }`}
              >
                <div>
                  <p className="font-medium text-emerald-300">{sem.semester_name}</p>
                  <p className="text-xs text-gray-400">{sem.school_year}</p>
                  {sem.is_active ? (
                    <p className="text-xs text-emerald-400 font-semibold mt-1">
                      🟢 Active Semester
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 italic mt-1">Inactive</p>
                  )}
                </div>

                {!sem.is_active && (
                  <button
                    onClick={() => handleActivate(sem._id)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-sm px-3 py-1 rounded-md text-white transition"
                  >
                    Activate
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 text-sm italic">
              No semesters found.
            </p>
          )}
        </div>

        {/* ✖ Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-400 hover:text-white text-xl"
        >
          ✕
        </button>
      </div>
    </div>,
    document.body
  );
}
