import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { createPortal } from "react-dom";

const API_URL = "https://frams-server-production.up.railway.app";

const AddClassModal = ({ isOpen, onClose, onAdded }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [instructors, setInstructors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [studentPreview, setStudentPreview] = useState([]);

  // 🧩 Form state
  const [form, setForm] = useState({
    subject_code: "",
    subject_title: "",
    course: "",
    year_level: "",
    semester: "",
    section: "",
    instructor_id: "",
  });

  // 🧩 Fetch instructors + subjects when modal opens
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
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
      toast.error("Failed to load subjects");
    }
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setStudentPreview([]);
  };

  // 🧩 Preview Excel before uploading
  const handlePreviewFile = async () => {
    if (!selectedFile) return toast.warn("Please choose an Excel file first");
    try {
      const xlsx = await import("xlsx");
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = xlsx.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = xlsx.utils.sheet_to_json(sheet);
        setStudentPreview(json.slice(0, 10)); // show top 10 rows
      };
      reader.readAsArrayBuffer(selectedFile);
    } catch {
      toast.error("Invalid Excel file");
    }
  };

  // 🧩 Submit all steps (Create → Assign → Upload)
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Step 1: Create class
      const createRes = await axios.post(`${API_URL}/api/classes`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newClass = createRes.data;
      const classId = newClass._id;
      toast.success("✅ Class created successfully");

      // Step 2: Upload Excel if provided
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        await axios.post(`${API_URL}/api/classes/${classId}/upload-students`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("✅ Students uploaded successfully");
      }

      setLoading(false);
      onAdded(); // refresh list
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to create class or upload students");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
      <div className="bg-neutral-900 p-6 rounded-2xl shadow-2xl w-[500px] relative">
        <h2 className="text-xl font-bold text-emerald-400 mb-4">
          {step === 1 && "Step 1: Class Information"}
          {step === 2 && "Step 2: Assign Instructor"}
          {step === 3 && "Step 3: Upload Student List"}
          {step === 4 && "Review & Confirm"}
        </h2>

        {/* ===========================
            STEP 1: SELECT SUBJECT + SECTION
        ============================ */}
        {step === 1 && (
          <div className="space-y-3">
            {/* ✅ Select Subject */}
            <label className="block text-sm text-gray-300">Select Subject</label>
            <select
              name="subject_code"
              value={form.subject_code}
              onChange={(e) => {
                const selectedCode = e.target.value;
                const selectedSubj = subjects.find(
                  (s) => s.subject_code === selectedCode
                );
                if (selectedSubj) {
                  setForm({
                    ...form,
                    subject_code: selectedSubj.subject_code,
                    subject_title: selectedSubj.subject_title,
                    course: selectedSubj.course,
                    year_level: selectedSubj.year_level,
                    semester: selectedSubj.semester,
                  });
                } else {
                  setForm({
                    ...form,
                    subject_code: "",
                    subject_title: "",
                    course: "",
                    year_level: "",
                    semester: "",
                  });
                }
              }}
              className="w-full bg-neutral-800 px-3 py-2 rounded-lg text-white"
            >
              <option value="">Select a Subject</option>
              {subjects.map((s) => (
                <option key={s._id} value={s.subject_code}>
                  {s.subject_code} — {s.subject_title}
                </option>
              ))}
            </select>

            {/* ✅ Auto-filled details (readonly) */}
            {form.subject_code && (
              <div className="space-y-1 text-gray-300 text-sm bg-neutral-800 p-3 rounded-lg">
                <p>
                  <b>Title:</b> {form.subject_title}
                </p>
                <p>
                  <b>Course:</b> {form.course}
                </p>
                <p>
                  <b>Year Level:</b> {form.year_level}
                </p>
                <p>
                  <b>Semester:</b> {form.semester}
                </p>
              </div>
            )}

            {/* ✅ Manual Section Input */}
            <div className="mt-3">
              <label className="block text-sm text-gray-300">Section</label>
              <input
                name="section"
                value={form.section}
                onChange={handleChange}
                placeholder="Enter Section (e.g. A, B, C)"
                className="w-full bg-neutral-800 px-3 py-2 rounded-lg text-white"
                required
              />
            </div>
          </div>
        )}

        {/* ===========================
            STEP 2: ASSIGN INSTRUCTOR
        ============================ */}
        {step === 2 && (
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Assign Instructor
            </label>
            <select
              name="instructor_id"
              value={form.instructor_id}
              onChange={handleChange}
              className="w-full bg-neutral-800 text-white px-3 py-2 rounded-lg"
            >
              <option value="">Select Instructor</option>
              {instructors.map((inst) => (
                <option key={inst.instructor_id} value={inst.instructor_id}>
                  {inst.first_name} {inst.last_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ===========================
            STEP 3: UPLOAD STUDENT LIST
        ============================ */}
        {step === 3 && (
          <div className="space-y-3">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="w-full bg-neutral-800 px-3 py-2 rounded-lg text-white"
            />
            <button
              onClick={handlePreviewFile}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
            >
              Preview File
            </button>
            {studentPreview.length > 0 && (
              <div className="bg-neutral-800 p-3 rounded-lg max-h-40 overflow-y-auto text-xs text-gray-300">
                <pre>{JSON.stringify(studentPreview, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {/* ===========================
            STEP 4: REVIEW & CONFIRM
        ============================ */}
        {step === 4 && (
          <div className="text-gray-300 space-y-2 text-sm">
            <p><b>Subject Code:</b> {form.subject_code}</p>
            <p><b>Subject Title:</b> {form.subject_title}</p>
            <p><b>Course:</b> {form.course}</p>
            <p><b>Year Level:</b> {form.year_level}</p>
            <p><b>Section:</b> {form.section}</p>
            <p><b>Semester:</b> {form.semester}</p>
            <p><b>Instructor ID:</b> {form.instructor_id || "None"}</p>
            <p><b>Students to Upload:</b> {selectedFile ? selectedFile.name : "No file uploaded"}</p>
          </div>
        )}

        {/* 🔹 Navigation buttons */}
        <div className="flex justify-between items-center mt-6">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600"
            >
              ← Back
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white disabled:opacity-50"
            >
              {loading ? "Processing..." : "Finish & Save"}
            </button>
          )}
        </div>

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
