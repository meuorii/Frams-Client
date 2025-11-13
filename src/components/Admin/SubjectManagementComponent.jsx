import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaChalkboardTeacher, FaSearch } from "react-icons/fa";
import SemesterManagementModal from "./SemesterManagementModal";

export default function SubjectManagementComponent() {
  const [subjects, setSubjects] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [yearSemFilter, setYearSemFilter] = useState("");
  const [activeSemester, setActiveSemester] = useState(null);
  const [showSemesterModal, setShowSemesterModal] = useState(false);

  const API_BASE = "https://frams-server-production.up.railway.app/api/admin";

  // 🧩 Fetch subjects for the active semester
  const fetchActiveSemesterSubjects = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("No authorization token found. Please log in again.");
        return;
      }

      const res = await axios.get(`${API_BASE}/subjects/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setActiveSemester(res.data.active_semester);
      setSubjects(res.data.subjects || []);
      setFiltered(res.data.subjects || []);
    } catch (err) {
      console.error("Error fetching subjects:", err);
      toast.error("Failed to fetch subjects for the active semester.");
    }
  };

  useEffect(() => {
    fetchActiveSemesterSubjects();
  }, []);

  // 🧠 Apply filters
  useEffect(() => {
    let data = [...subjects];

    if (courseFilter)
      data = data.filter(
        (s) => (s.course || "").toLowerCase() === courseFilter.toLowerCase()
      );

    if (yearSemFilter) {
      if (yearSemFilter === "Summer") {
        data = data.filter(
          (s) => (s.semester || "").toLowerCase() === "summer"
        );
      } else {
        const [year, sem] = yearSemFilter.split(" - ");
        data = data.filter(
          (s) =>
            (s.year_level || "").toLowerCase() === year.toLowerCase() &&
            (s.semester || "").toLowerCase() === sem.toLowerCase()
        );
      }
    }

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (s) =>
          (s.subject_code || "").toLowerCase().includes(q) ||
          (s.subject_title || "").toLowerCase().includes(q)
      );
    }

    setFiltered(data);
  }, [search, courseFilter, yearSemFilter, subjects]);

  return (
    <div className="bg-neutral-950 text-white p-8 rounded-xl shadow-lg space-y-8">
      {/* 🔹 Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
        <h2 className="text-3xl font-extrabold flex items-center gap-2 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
          <FaChalkboardTeacher className="text-emerald-400" />
          Subject Management
        </h2>

        {/* Active Semester Display */}
        {activeSemester ? (
          <div className="bg-neutral-900 border border-emerald-500/30 px-5 py-3 rounded-lg text-sm text-emerald-300 shadow-md">
            <p className="font-semibold text-emerald-400">🟢 Active Semester</p>
            <p>
              {activeSemester.semester_name} –{" "}
              <span className="text-emerald-200 font-medium">
                {activeSemester.school_year}
              </span>
            </p>
          </div>
        ) : (
          <div className="text-sm text-gray-400 italic">
            ⚠️ No active semester set. Activate one below.
          </div>
        )}
      </div>

      {/* 🧭 Manage Semester Modal Trigger */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowSemesterModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-white text-sm transition"
        >
          Manage Semesters
        </button>
      </div>

      {/* Modal Component */}
      <SemesterManagementModal
        isOpen={showSemesterModal}
        onClose={() => setShowSemesterModal(false)}
        onRefresh={fetchActiveSemesterSubjects}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        {/* Search */}
        <div className="flex items-center bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 w-full sm:w-60 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400 transition">
          <FaSearch className="text-neutral-500 mr-2 text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or title..."
            className="bg-transparent outline-none text-sm text-white w-full placeholder-neutral-500"
          />
        </div>

        {/* Course Filter */}
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
        >
          <option value="">All Courses</option>
          <option value="BSCS">BSCS</option>
          <option value="BSINFOTECH">BSINFOTECH</option>
        </select>

        {/* Year + Semester Filter */}
        <select
          value={yearSemFilter}
          onChange={(e) => setYearSemFilter(e.target.value)}
          className="px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
        >
          <option value="">All Year & Sem</option>
          <option value="1st Year - 1st Sem">1st Year - 1st Sem</option>
          <option value="1st Year - 2nd Sem">1st Year - 2nd Sem</option>
          <option value="2nd Year - 1st Sem">2nd Year - 1st Sem</option>
          <option value="2nd Year - 2nd Sem">2nd Year - 2nd Sem</option>
          <option value="3rd Year - 1st Sem">3rd Year - 1st Sem</option>
          <option value="3rd Year - 2nd Sem">3rd Year - 2nd Sem</option>
          <option value="4th Year - 1st Sem">4th Year - 1st Sem</option>
          <option value="4th Year - 2nd Sem">4th Year - 2nd Sem</option>
          <option value="Summer">Summer</option>
        </select>
      </div>

      {/* 🔸 Grouped by Year and Semester */}
      {["1st Year", "2nd Year", "3rd Year", "4th Year"].map((year) => {
        const yearSubjects = filtered.filter((s) => s.year_level === year);
        if (yearSubjects.length === 0) return null;

        const semestersList = ["1st Sem", "2nd Sem", "Summer"];
        return (
          <div key={year} className="space-y-6">
            <div className="border-l-4 border-emerald-500 pl-4">
              <h2 className="text-2xl font-bold text-emerald-400">{year}</h2>
              <p className="text-sm text-gray-400">
                {yearSubjects.length} total subject
                {yearSubjects.length > 1 ? "s" : ""}
              </p>
            </div>

            {semestersList.map((sem) => {
              const semSubjects = yearSubjects.filter(
                (s) => s.semester === sem
              );
              if (semSubjects.length === 0) return null;

              return (
                <div
                  key={`${year}-${sem}`}
                  className="rounded-xl border border-neutral-700 bg-neutral-900/60 backdrop-blur-sm shadow-lg overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-emerald-700/20 to-green-700/20 border-b border-neutral-700 px-6 py-3">
                    <h3 className="text-lg font-semibold text-emerald-300">
                      {sem}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {semSubjects.length} subject
                      {semSubjects.length > 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="hidden md:grid grid-cols-3 bg-neutral-900/70 text-emerald-300 font-semibold text-sm uppercase tracking-wide border-b border-neutral-700">
                    <div className="px-4 py-3">Code</div>
                    <div className="px-4 py-3">Title</div>
                    <div className="px-4 py-3">Course</div>
                  </div>

                  {semSubjects.map((s) => (
                    <div
                      key={s._id}
                      className="grid md:grid-cols-3 text-sm text-neutral-300 border-b border-neutral-800 hover:bg-neutral-800/40 transition-all duration-300"
                    >
                      <div className="px-4 py-3 font-mono text-emerald-400">
                        {s.subject_code}
                      </div>
                      <div className="px-4 py-3 font-medium">
                        {s.subject_title}
                      </div>
                      <div className="px-4 py-3">{s.course}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center text-neutral-500 py-10 italic">
          No subjects found for the active semester.
        </div>
      )}
    </div>
  );
}
