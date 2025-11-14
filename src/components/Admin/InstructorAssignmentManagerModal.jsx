import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API_URL = "https://frams-server-production.up.railway.app";

const InstructorAssignmentManagerModal = ({ instructor, onClose }) => {
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [freeClasses, setFreeClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");

  useEffect(() => {
    if (instructor) {
      fetchAssignedClasses();
      fetchFreeClasses();
    }
  }, [instructor]);

  const fetchAssignedClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_URL}/api/instructors/${instructor.instructor_id}/classes`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAssignedClasses(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load assigned classes.");
    }
  };

  const fetchFreeClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/classes/free`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFreeClasses(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load available classes.");
    }
  };

  const assignClass = async () => {
    if (!selectedClass) return toast.warn("Please select a class first.");

    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${API_URL}/api/classes/${selectedClass}/assign-instructor`,
        { instructor_id: instructor.instructor_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Class assigned successfully!");

      setSelectedClass("");
      fetchAssignedClasses();
      fetchFreeClasses();
    } catch (err) {
      console.error(err);
      toast.error("Assignment failed.");
    }
  };

  const removeClass = async (classId) => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${API_URL}/api/classes/${classId}/remove-instructor`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Class unassigned.");
      fetchAssignedClasses();
      fetchFreeClasses();
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove class.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
      <div className="bg-neutral-900 text-white w-[550px] rounded-xl shadow-2xl p-6 border border-neutral-700">

        {/* Header */}
        <h2 className="text-2xl font-bold mb-4 border-b border-neutral-700 pb-2">
          Instructor Assignment Manager – {instructor.instructor_id}
        </h2>

        {/* Instructor Info */}
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-2">Instructor Info:</h3>
          <div className="bg-neutral-800 p-3 rounded-lg text-sm space-y-1">
            <p>
              <b>Name:</b> {instructor.first_name} {instructor.last_name}
            </p>
            <p>
              <b>Program:</b> {instructor.program || "N/A"}
            </p>
          </div>
        </div>

        {/* Assigned Classes */}
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-2">Assigned Classes:</h3>

          {assignedClasses.length > 0 ? (
            <div className="space-y-2">
              {assignedClasses.map((cls) => (
                <div
                  key={cls._id}
                  className="flex justify-between items-center bg-neutral-800 p-3 rounded-lg text-sm"
                >
                  <span>
                    <b>{cls.subject_code}</b> – {cls.subject_title} |{" "}
                    {cls.course} {cls.year_level}{cls.section}
                  </span>

                  <button
                    onClick={() => removeClass(cls._id)}
                    className="text-red-400 hover:text-red-300 text-xs font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-400 text-sm">No assigned classes.</p>
          )}
        </div>

        {/* Assign New Class */}
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-2">Assign New Class:</h3>

          <div className="flex items-center gap-3">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="flex-1 bg-neutral-800 px-3 py-2 rounded-lg text-white"
            >
              <option value="">Select a Class</option>
              {freeClasses.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.subject_code} – {cls.subject_title} |{" "}
                  {cls.course} {cls.year_level}{cls.section}
                </option>
              ))}
            </select>

            <button
              onClick={assignClass}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-medium"
            >
              Assign
            </button>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default InstructorAssignmentManagerModal;
