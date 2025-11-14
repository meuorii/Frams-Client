import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { createPortal } from "react-dom";

const API_URL = "https://frams-server-production.up.railway.app";

const AddClassModal = ({ isOpen, onClose, onAdded }) => {
  const [loading, setLoading] = useState(false);
  const [instructors, setInstructors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [studentPreview, setStudentPreview] = useState([]);

  // Form State
  const [form, setForm] = useState({
    subject_code: "",
    subject_title: "",
    course: "",
    year_level: "",
    semester: "",
    instructor_id: "",
    section: "TEMP", // auto only (backend will overwrite)
  });

  useEffect(() => {
    if (isOpen) {
      fetchInstructors();
      fetchSubjects();
    }
  }, [isOpen]);

  const fetchInstructors = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/instructors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInstructors(res.data || []);
    } catch {
      toast.error("Failed to load instructors");
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/admin/subjects/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubjects(res.data.subjects || []);
    } catch {
      toast.error("Failed to load subjects");
    }
  };

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setStudentPreview([]);
  };

  // Preview students (top 10)
  const handlePreviewFile = async () => {
    if (!selectedFile) return toast.warn("Please choose an Excel file first");

    try {
      const xlsx = await import("xlsx");
      const reader = new FileReader();

      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = xlsx.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = xlsx.utils.sheet_to_json(sheet);

        setStudentPreview(json.slice(0, 10));
      };

      reader.readAsArrayBuffer(selectedFile);
    } catch {
      toast.error("Invalid Excel file format");
    }
  };

  // Submit the Class + Excel upload
  const handleSubmit = async () => {
    try {
      if (!form.subject_code) return toast.warn("Choose a subject first");
      if (!form.instructor_id) return toast.warn("Choose an instructor");
      if (!selectedFile) return toast.warn("Upload Excel class list");

      setLoading(true);
      const token = localStorage.getItem("token");

      // Ensure section is TEMP placeholder (backend overwrites)
      const payload = {
        ...form,
        section: "TEMP",
      };

      // 1️⃣ Create class
      const createRes = await axios.post(
        `${API_URL}/api/classes`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const classId = createRes.data._id;

      // 2️⃣ Upload Excel file for students
      const formData = new FormData();
      formData.append("file", selectedFile);

      await axios.post(
        `${API_URL}/api/classes/${classId}/upload-students`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success("🎉 Class created & students uploaded!");
      onAdded();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to create class");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
      <div className="bg-neutral-900 p-6 rounded-2xl shadow-2xl w-[500px] relative">

        <h2 className="text-xl font-bold text-emerald-400 mb-4">
          Add New Class
        </h2>

        {/* Select Subject */}
        <label className="block text-sm text-gray-300">Select Subject</label>
        <select
          name="subject_code"
          value={form.subject_code}
          onChange={(e) => {
            const code = e.target.value;
            const selected = subjects.find((s) => s.subject_code === code);

            if (selected) {
              setForm((prev) => ({
                ...prev,
                subject_code: selected.subject_code,
                subject_title: selected.subject_title,
                course: selected.course,
                year_level: selected.year_level,
                semester: selected.semester,
              }));
            }
          }}
          className="w-full bg-neutral-800 px-3 py-2 rounded-lg text-white mb-3"
        >
          <option value="">Select a Subject</option>
          {subjects.map((s) => (
            <option key={s._id} value={s.subject_code}>
              {s.subject_code} — {s.subject_title}
            </option>
          ))}
        </select>

        {/* Subject Info */}
        {form.subject_code && (
          <div className="bg-neutral-800 text-gray-300 text-sm p-3 rounded-lg space-y-1 mb-3">
            <p><b>Title:</b> {form.subject_title}</p>
            <p><b>Course:</b> {form.course}</p>
            <p><b>Year Level:</b> {form.year_level}</p>
            <p><b>Semester:</b> {form.semester}</p>
          </div>
        )}

        {/* Instructor */}
        <label className="block text-sm text-gray-300">Assign Instructor</label>
        <select
          name="instructor_id"
          value={form.instructor_id}
          onChange={handleChange}
          className="w-full bg-neutral-800 px-3 py-2 rounded-lg text-white mb-3"
        >
          <option value="">Select Instructor</option>
          {instructors.map((inst) => (
            <option key={inst.instructor_id} value={inst.instructor_id}>
              {inst.first_name} {inst.last_name}
            </option>
          ))}
        </select>

        {/* Excel Upload */}
        <label className="block text-sm text-gray-300">Upload Excel</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="w-full bg-neutral-800 px-3 py-2 rounded-lg text-white mb-2"
        />

        <button
          onClick={handlePreviewFile}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg mb-3"
        >
          Preview File
        </button>

        {studentPreview.length > 0 && (
          <div className="bg-neutral-800 p-3 rounded-lg max-h-40 overflow-y-auto text-xs text-gray-300 mb-3">
            <pre>{JSON.stringify(studentPreview, null, 2)}</pre>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white disabled:opacity-50"
        >
          {loading ? "Processing..." : "Create Class"}
        </button>

        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-400 hover:text-white text-lg"
        >
          ✕
        </button>

      </div>
    </div>,
    document.body
  );
};

export default AddClassModal;
