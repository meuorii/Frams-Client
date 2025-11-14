import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaSearch, FaPlus, FaUserCog } from "react-icons/fa";
import InstructorAssignmentManagerModal from "./InstructorAssignmentManagerModal";

const API_URL = "https://frams-server-production.up.railway.app";

const InstructorAssignmentComponent = () => {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/instructors`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setInstructors(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to load instructors");
    } finally {
      setLoading(false);
    }
  };

  const filteredInstructors = instructors.filter(
    (inst) =>
      inst.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-neutral-950 p-8 rounded-xl shadow-xl max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <h2 className="text-3xl font-bold text-white tracking-tight">
          Instructor Management
        </h2>

        {/* Search Bar */}
        <div className="flex items-center w-full md:w-80 px-3 py-2 rounded-lg bg-neutral-800 border border-white/10">
          <FaSearch className="text-neutral-500 mr-2" />
          <input
            type="text"
            placeholder="Search instructors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none text-sm text-white w-full placeholder-neutral-500"
          />
        </div>
      </div>

      {/* Add Instructor Button (optional) */}
      <div className="flex justify-end mb-4">
        <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg text-white text-sm transition">
          <FaPlus /> Add Instructor
        </button>
      </div>

      {/* Table Wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-neutral-800 text-neutral-300">
              <th className="px-4 py-3">Instructor ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="px-4 py-4 text-center text-neutral-400">
                  Loading instructors...
                </td>
              </tr>
            ) : filteredInstructors.length > 0 ? (
              filteredInstructors.map((inst) => (
                <tr
                  key={inst.instructor_id}
                  className="border-b border-neutral-800 hover:bg-neutral-900/60 transition"
                >
                  <td className="px-4 py-3 text-white font-medium">
                    {inst.instructor_id}
                  </td>

                  <td className="px-4 py-3 text-neutral-300">
                    {inst.first_name} {inst.last_name}
                  </td>

                  <td className="px-4 py-3 text-neutral-400 truncate">
                    {inst.email}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedInstructor(inst)}
                      className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 
                                 px-4 py-1.5 rounded-lg text-white text-xs font-semibold mx-auto transition"
                    >
                      <FaUserCog /> Manage →
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-4 py-4 text-center text-neutral-400">
                  No instructors found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedInstructor && (
        <InstructorAssignmentManagerModal
          instructor={selectedInstructor}
          onClose={() => setSelectedInstructor(null)}
        />
      )}
    </div>
  );
};

export default InstructorAssignmentComponent;
