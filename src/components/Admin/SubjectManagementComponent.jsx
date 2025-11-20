import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaChalkboardTeacher } from "react-icons/fa";
import SemesterManagementModal from "./SemesterManagementModal";

export default function SubjectManagementComponent() {
  const [subjects, setSubjects] = useState([]);
  const [activeSemester, setActiveSemester] = useState(null);
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [curriculums, setCurriculums] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState("");

  const API_BASE = "https://frams-server-production.up.railway.app/api/admin";

  // ================================================================
  // FETCH CURRICULUM LIST
  // ================================================================
  const fetchCurriculums = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/curriculum`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = res.data.curriculums || [];

      setCurriculums(list);

      if (list.length > 0) {
        setSelectedCurriculum(list[0]); // default
      }
    } catch (err) {
      console.error("Error fetching curriculum list:", err);
      toast.error("Failed to load curriculum list.");
    }
  };

  // ================================================================
  // FETCH SUBJECTS BELONGING ONLY TO ACTIVE SEMESTER
  // ================================================================
  const fetchActiveSemesterSubjects = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("No authorization token. Please log in again.");
        return;
      }

      const res = await axios.get(`${API_BASE}/subjects/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setActiveSemester(res.data.active_semester);
      setSubjects(res.data.subjects || []);

    } catch (err) {
      console.error("Error fetching subjects:", err);
      toast.error("Failed to fetch subjects for the active semester.");
    }
  };

  // ================================================================
  // INITIAL LOAD
  // ================================================================
  useEffect(() => {
    fetchCurriculums();
    fetchActiveSemesterSubjects();
  }, []);

  // ================================================================
  // FILTER SUBJECTS
  // By: semester + curriculum + year
  // ================================================================
  const filteredSubjects = subjects.filter(
    (s) =>
      s.semester === activeSemester?.semester_name &&
      (!selectedCurriculum || s.curriculum === selectedCurriculum)
  );

  const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

  // ================================================================
  // UI
  // ================================================================
  return (
    <div className="bg-neutral-950 text-white p-8 rounded-xl shadow-lg space-y-10">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
        <h2 className="text-3xl font-extrabold flex items-center gap-2 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
          <FaChalkboardTeacher className="text-emerald-400" />
          Subject Management
        </h2>

        {activeSemester ? (
          <div className="bg-neutral-900 border border-emerald-500/20 px-5 py-3 rounded-lg text-sm text-emerald-300 shadow-md">
            <p className="font-semibold text-emerald-400 text-sm">🟢 Active Semester</p>
            <p className="text-emerald-200">
              {activeSemester.semester_name} — {activeSemester.school_year}
            </p>
          </div>
        ) : (
          <div className="text-gray-400 italic text-sm">⚠ No active semester set.</div>
        )}
      </div>

      {/* Manage Semester Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowSemesterModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-white text-sm transition shadow-md"
        >
          Manage Semesters
        </button>
      </div>

      {/* Semester Modal */}
      <SemesterManagementModal
        isOpen={showSemesterModal}
        onClose={() => setShowSemesterModal(false)}
        onRefresh={fetchActiveSemesterSubjects}
      />

      {/* CURRICULUM DROPDOWN */}
      {curriculums.length > 0 && (
        <div className="flex justify-end mb-4">
          <select
            value={selectedCurriculum}
            onChange={(e) => setSelectedCurriculum(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 px-4 py-2 rounded-lg text-emerald-300 focus:outline-none focus:border-emerald-500"
          >
            {curriculums.map((c) => (
              <option key={c} value={c}>
                Curriculum {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* SUBJECT LIST */}
      {yearLevels.map((year) => {
        const subjectsByYear = filteredSubjects.filter(
          (s) => s.year_level === year
        );

        if (subjectsByYear.length === 0) return null;

        return (
          <div key={year} className="space-y-8">

            {/* YEAR HEADER */}
            <div className="pl-4 border-l-4 border-emerald-500">
              <h2 className="text-2xl font-bold text-emerald-400">{year}</h2>
              <p className="text-sm text-gray-400">
                {subjectsByYear.length} total subject
                {subjectsByYear.length > 1 ? "s" : ""}
              </p>
            </div>

            {/* SEMESTER BLOCK */}
            <div className="rounded-xl bg-neutral-900/60 border border-neutral-700 backdrop-blur-sm shadow-lg overflow-hidden">
              
              {/* SEM HEADER */}
              <div className="bg-gradient-to-r from-emerald-700/20 to-green-700/20 px-6 py-4 border-b border-neutral-800">
                <h3 className="text-lg font-semibold text-emerald-300">
                  {activeSemester?.semester_name} — Curriculum {selectedCurriculum}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {subjectsByYear.length} subject
                  {subjectsByYear.length > 1 ? "s" : ""}
                </p>
              </div>

              {/* TABLE HEADER */}
              <div className="hidden md:grid grid-cols-3 bg-neutral-900/80 text-emerald-300 font-semibold text-sm tracking-wide border-b border-neutral-800">
                <div className="px-4 py-3">Code</div>
                <div className="px-4 py-3">Title</div>
                <div className="px-4 py-3">Course</div>
              </div>

              {/* SUBJECT ROWS */}
              {subjectsByYear.map((s) => (
                <div
                  key={s._id}
                  className="grid md:grid-cols-3 text-sm text-neutral-300 border-b border-neutral-800 hover:bg-neutral-800/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300"
                >
                  <div className="px-4 py-3 font-mono text-emerald-400">
                    {s.subject_code}
                  </div>
                  <div className="px-4 py-3 font-medium">{s.subject_title}</div>
                  <div className="px-4 py-3">{s.course}</div>
                </div>
              ))}
            </div>

          </div>
        );
      })}

      {filteredSubjects.length === 0 && (
        <div className="text-center text-neutral-500 py-10 italic">
          No subjects found for the active semester and curriculum.
        </div>
      )}
    </div>
  );
}
