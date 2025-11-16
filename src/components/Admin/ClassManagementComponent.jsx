// src/components/Admin/ClassManagement/ClassManagementComponent.jsx
import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import {
  FaChalkboardTeacher,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
} from "react-icons/fa";

import StudentsModal from "./StudentsModal";
import EditClassModal from "./EditClassModal";
import DeleteClassModal from "./DeleteClassModal";
import AddClassModal from "./AddClassModal";

const API_URL = "https://frams-server-production.up.railway.app";

const ClassManagementComponent = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedClass, setSelectedClass] = useState(null);
  const [editClass, setEditClass] = useState(null);
  const [deleteClass, setDeleteClass] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);

  // FILTER STATES
  const [yearFilter, setYearFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");

  // ─────────────────────────────────────────────────────

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setClasses(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  // FORMAT SCHEDULE
  const formatSchedule = (blocks) => {
    if (!blocks || blocks.length === 0) return "No schedule set";
    return blocks
      .map(
        (b) =>
          `${b.days?.join(", ")} ${b.start || ""} - ${b.end || ""}`
      )
      .join(" | ");
  };

  // ─────────────────────────────────────────────────────
  // FILTERING LOGIC
  const filteredClasses = useMemo(() => {
    let data = [...classes];

    if (yearFilter)
      data = data.filter((c) => c.year_level === yearFilter);

    if (sectionFilter)
      data = data.filter((c) => c.section === sectionFilter);

    return data;
  }, [classes, yearFilter, sectionFilter]);

  // Compute unique sections dynamically
  const uniqueSections = [...new Set(classes.map((c) => c.section).filter(Boolean))];

  // ─────────────────────────────────────────────────────

  // DELETE CLASS
  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/classes/${deleteClass._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("✅ Class deleted");
      setDeleteClass(null);
      fetchClasses();
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to delete class");
    }
  };

  // UPDATE CLASS
  const handleEdit = async () => {
    try {
      const token = localStorage.getItem("token");

      const cleanedScheduleBlocks = (editClass.schedule_blocks || [])
        .map((block) => ({
          ...block,
          days: (block.days || []).filter((d) => d && d.trim() !== ""),
        }))
        .filter((block) => block.days?.length || block.start || block.end);

      await axios.put(
        `${API_URL}/api/classes/${editClass._id}`,
        {
          section: editClass.section,
          semester: editClass.semester,
          schedule_blocks: cleanedScheduleBlocks,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("✅ Class updated");
      setEditClass(null);
      fetchClasses();
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to update class");
    }
  };

  return (
    <div className="bg-neutral-950 p-8 rounded-2xl shadow-xl text-white mx-auto">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
        <h2 className="text-3xl font-extrabold text-transparent bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text flex items-center gap-2">
          <FaChalkboardTeacher className="text-emerald-400" />
          Class Management
        </h2>

        {/* ADD CLASS BUTTON */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-semibold shadow-md transition-transform hover:scale-105"
        >
          <FaPlus /> Add Class
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3 mb-6">

        {/* Year Filter */}
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-1"
        >
          <option value="">All Year Levels</option>
          <option value="1st Year">1st Year</option>
          <option value="2nd Year">2nd Year</option>
          <option value="3rd Year">3rd Year</option>
          <option value="4th Year">4th Year</option>
        </select>

        {/* Section Filter */}
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-1"
        >
          <option value="">All Sections</option>
          {uniqueSections.map((sec) => (
            <option key={sec} value={sec}>
              {sec}
            </option>
          ))}
        </select>

      </div>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-xl border border-neutral-800 shadow-lg">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-neutral-900 text-emerald-300 uppercase text-xs tracking-wide border-b border-neutral-800">
            <tr>
              <th className="py-4 px-4 text-left">Code</th>
              <th className="py-4 px-4 text-left">Title</th>
              <th className="py-4 px-4 text-left">Instructor</th>
              <th className="py-4 px-4 text-left">Course & Section</th>
              <th className="py-4 px-4 text-left">Year / Sem</th>
              <th className="py-4 px-4 text-left">Schedule</th>
              <th className="py-4 px-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="text-neutral-300">
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-neutral-500">
                  Loading classes...
                </td>
              </tr>
            ) : filteredClasses.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-neutral-500">
                  No classes found.
                </td>
              </tr>
            ) : (
              filteredClasses.map((cls, idx) => (
                <tr
                  key={idx}
                  className="border-b border-neutral-800 hover:bg-neutral-900/50 transition-all"
                >
                  <td className="px-4 py-3 font-mono text-emerald-400">
                    {cls.subject_code}
                  </td>
                  <td className="px-4 py-3 font-medium">{cls.subject_title}</td>
                  <td className="px-4 py-3">
                    {cls.instructor_first_name} {cls.instructor_last_name}
                  </td>

                  <td className="px-4 py-3">
                    {cls.course} — {cls.section}
                  </td>

                  <td className="px-4 py-3">
                    {cls.year_level} — {cls.semester}
                  </td>

                  <td className="px-4 py-3 text-neutral-400">
                    {formatSchedule(cls.schedule_blocks)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedClass(cls)}
                        className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white shadow transition"
                      >
                        <FaEye size={14} />
                      </button>

                      <button
                        onClick={() => setEditClass(cls)}
                        className="p-2 bg-yellow-500 hover:bg-yellow-400 rounded-lg text-white shadow transition"
                      >
                        <FaEdit size={14} />
                      </button>

                      <button
                        onClick={() => setDeleteClass(cls)}
                        className="p-2 bg-red-600 hover:bg-red-500 rounded-lg text-white shadow transition"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODALS */}
      {selectedClass && (
        <StudentsModal
          isOpen={!!selectedClass}
          onClose={() => setSelectedClass(null)}
          selectedClass={selectedClass}
        />
      )}

      {editClass && (
        <EditClassModal
          isOpen={!!editClass}
          editClass={editClass}
          setEditClass={setEditClass}
          onClose={() => setEditClass(null)}
          onSave={handleEdit}
        />
      )}

      <DeleteClassModal
        isOpen={!!deleteClass}
        deleteClass={deleteClass}
        onClose={() => setDeleteClass(null)}
        onConfirm={handleDelete}
      />

      {showAddModal && (
        <AddClassModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdded={fetchClasses}
        />
      )}
    </div>
  );
};

export default ClassManagementComponent;
