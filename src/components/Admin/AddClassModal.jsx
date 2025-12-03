import React, { useState } from "react";
import axios from "axios";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";

const API_URL = "https://frams-server-production.up.railway.app";

const AddClassModal = ({ isOpen, onClose, onAdded }) => {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  if (!isOpen) return null;

  const resetModal = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  // ------------------------------
  // FILE SELECT
  // ------------------------------
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setPreview(null);
  };

  // ------------------------------
  // STEP 1: PREVIEW PDF
  // ------------------------------
  const handlePreview = async () => {
    if (!selectedFile) return toast.warn("Please upload a PDF first.");

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await axios.post(`${API_URL}/api/classes/preview-pdf`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setPreview(res.data);
      toast.success("📄 Preview generated!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to preview PDF");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // STEP 2: CREATE CLASS + UPLOAD STUDENTS
  // ------------------------------
  const handleConfirm = async () => {
    if (!preview) return;

    if (!selectedFile)
      return toast.error("PDF file missing. Please re-upload.");

    if (!preview.instructor_id)
      return toast.error("Instructor not found in database!");

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // 1️⃣ CREATE CLASS FIRST
      const classPayload = {
        subject_code: preview.subject_code,
        subject_title: preview.subject_title,
        course: preview.course,
        year_level: preview.year_level,
        section: preview.section,
        instructor_id: preview.instructor_id,
      };

      const createRes = await axios.post(`${API_URL}/api/classes`, classPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const classId = createRes.data._id;

      // 2️⃣ UPLOAD STUDENTS
      const formData = new FormData();
      formData.append("file", selectedFile);

      await axios.post(`${API_URL}/api/classes/${classId}/upload-students`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("🎉 Class created and students added!");

      onAdded();
      onClose();
      resetModal();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create class");
    } finally {
      setLoading(false);
    }
  };

  const formatName = (name) => {
    if (!name) return "";
    return name
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  // ------------------------------
  // UI
  // ------------------------------
  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
      <div className="bg-neutral-900 p-6 rounded-2xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto relative">

        <h2 className="text-xl font-bold text-emerald-400 mb-4">
          Upload Class List (PDF)
        </h2>

        {/* STEP 1 */}
        {!preview && (
          <>
            <p className="text-gray-300 text-sm mb-3">
              The system will extract:
              <br />• Class Code
              <br />• Subject Code & Title
              <br />• Course & Section
              <br />• Instructor
              <br />• Valid Students (with full name)
            </p>

            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="w-full bg-neutral-800 px-3 py-2 rounded-lg text-white mb-4"
            />

            <button
              onClick={handlePreview}
              disabled={loading}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white disabled:opacity-50"
            >
              {loading ? "Reading PDF..." : "Upload & Preview"}
            </button>
          </>
        )}

        {/* STEP 2: PREVIEW */}
        {preview && (
          <div className="bg-neutral-800 p-4 rounded-xl text-gray-200 space-y-3">

            <h3 className="font-bold text-lg text-emerald-400">
              Extracted Class Information
            </h3>

            <p><b>Class Code:</b> {preview.class_code}</p>
            <p><b>Subject Code:</b> {preview.subject_code}</p>
            <p><b>Subject Title:</b> {preview.subject_title}</p>
            <p><b>Course & Section:</b> {preview.course} {preview.section}</p>
            <p><b>Year Level:</b> {preview.year_level}</p>
            <p><b>Semester:</b> {preview.semester}</p>
            <p><b>School Year:</b> {preview.school_year}</p>

            <p>
              <b>Instructor:</b> {preview.instructor_first_name}{" "}
              {preview.instructor_last_name}
              <br />
              <b>ID:</b>{" "}
              {preview.instructor_id ? preview.instructor_id : "❌ Not Found"}
            </p>

            {/* VALID STUDENTS w/ NAME */}
            <div>
              <b className="text-emerald-400">
                Valid Students ({preview.valid_students?.length || 0})
              </b>
              <div className="max-h-48 overflow-y-auto bg-neutral-900 p-2 rounded mt-1 text-sm border border-emerald-700/40">

                {preview.valid_students?.length > 0 ? (
                  preview.valid_students.map((stu, i) => (
                    <div key={i} className="text-emerald-300">
                      {stu.student_id} — {formatName(stu.first_name)} {formatName(stu.last_name)}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400">No valid students found.</div>
                )}

              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white"
            >
              {loading ? "Saving..." : "Confirm & Create Class"}
            </button>
          </div>
        )}

        {/* CLOSE */}
        <button
          onClick={() => { onClose(); resetModal(); }}
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
