import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getInstructorProfile } from "../../services/api";

export default function InstructorProfile({ setActiveTab }) {
  const [loading, setLoading] = useState(true);
  const [prof, setProf] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getInstructorProfile();

        // Normalize fields based on your backend response
        const normalized = {
          instructor_id: data?.instructor_id || "",
          name: data?.name || "",
          email: data?.email || "",
          face_registered: data?.face_registered === "Yes", // true/false
        };

        setProf(normalized);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="animate-pulse h-40 rounded-2xl bg-white/5 w-3/4" />
        <ToastContainer position="top-center" theme="dark" />
      </div>
    );

  if (!prof)
    return (
      <div className="p-6 text-red-400 text-center">
        Unable to load instructor profile.
      </div>
    );

  return (
    <div className="p-6">
      <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Instructor Profile</h2>
          </div>

          <span
            className={`px-4 py-2 rounded-full text-xs font-medium ${
              prof.face_registered
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-600/30"
                : "bg-yellow-600/20 text-yellow-300 border border-yellow-600/30"
            }`}
          >
            {prof.face_registered ? "Face Registered" : "Face Not Registered"}
          </span>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Instructor ID */}
          <div className="rounded-xl bg-white/5 p-6">
            <div className="text-white/60 text-sm">Instructor ID</div>
            <div className="text-lg text-white font-medium">{prof.instructor_id}</div>
          </div>

          {/* Name */}
          <div className="rounded-xl bg-white/5 p-6">
            <div className="text-white/60 text-sm">Name</div>
            <div className="text-lg text-white font-medium">{prof.name}</div>
          </div>

          {/* Email */}
          <div className="rounded-xl bg-white/5 p-6">
            <div className="text-white/60 text-sm">Email</div>
            <div className="text-lg text-white font-medium">{prof.email}</div>
          </div>
        </div>

        {/* Register Face Button */}
        <div className="mt-8 text-center">
          {!prof.face_registered ? (
            <button
              className="px-6 py-3 rounded-xl bg-emerald-600 text-white text-lg font-semibold hover:bg-emerald-500 transition-all duration-300"
              onClick={() => setActiveTab("register-face")}
            >
              Register Face
            </button>
          ) : (
            <button
              className="px-6 py-3 rounded-xl bg-gray-700 text-white text-lg font-semibold hover:bg-gray-600 transition-all duration-300"
              onClick={() => setActiveTab("register-face")}
            >
              Re-register Face
            </button>
          )}
        </div>
      </div>

      <ToastContainer position="top-center" theme="dark" />
    </div>
  );
}
