import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import AOS from "aos";
import "aos/dist/aos.css";
import { FaUserTie, FaUser, FaEnvelope, FaLock, FaIdBadge } from "react-icons/fa";

const InstructorRegisterComponent = () => {
  const [formData, setFormData] = useState({
    instructor_id: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🚀 DIRECT REGISTER — NO OTP
  const handleRegister = async () => {
    const { password, confirm_password } = formData;

    if (password !== confirm_password) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      const res = await axios.post(
        "https://frams-server-production.up.railway.app/api/instructor/register",
        formData
      );

      if (res.status === 201) {
        toast.success("Registration successful!");
        navigate("/instructor/login");

        setFormData({
          instructor_id: "",
          first_name: "",
          last_name: "",
          email: "",
          password: "",
          confirm_password: "",
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 relative overflow-hidden px-4 py-10">
      {/* Background Glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/20 blur-[160px] rounded-full"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-600/20 blur-[160px] rounded-full"></div>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-2xl p-10 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl"
        data-aos="fade-up"
      >
        <h2 className="text-3xl font-extrabold text-center mb-2 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
          Instructor Registration
        </h2>
        <p className="text-center text-gray-300 mb-8">
          Create your instructor account.
        </p>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Instructor ID */}
          <div className="relative">
            <FaIdBadge className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="instructor_id"
              placeholder="Instructor ID"
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-neutral-900/40 border border-neutral-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white placeholder-gray-400"
              onChange={handleChange}
              value={formData.instructor_id}
            />
          </div>

          {/* First Name */}
          <div className="relative">
            <FaUser className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="first_name"
              placeholder="First Name"
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-neutral-900/40 border border-neutral-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white placeholder-gray-400"
              onChange={handleChange}
              value={formData.first_name}
            />
          </div>

          {/* Last Name */}
          <div className="relative">
            <FaUser className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="last_name"
              placeholder="Last Name"
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-neutral-900/40 border border-neutral-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white placeholder-gray-400"
              onChange={handleChange}
              value={formData.last_name}
            />
          </div>

          {/* Email */}
          <div className="relative">
            <FaEnvelope className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-neutral-900/40 border border-neutral-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white placeholder-gray-400"
              onChange={handleChange}
              value={formData.email}
            />
          </div>

          {/* Password */}
          <div className="relative">
            <FaLock className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-neutral-900/40 border border-neutral-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white placeholder-gray-400"
              onChange={handleChange}
              value={formData.password}
            />
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <FaLock className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              name="confirm_password"
              placeholder="Confirm Password"
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-neutral-900/40 border border-neutral-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white placeholder-gray-400"
              onChange={handleChange}
              value={formData.confirm_password}
            />
          </div>
        </div>

        {/* Register Button */}
        <button
          onClick={handleRegister}
          className="w-full mt-8 py-3 rounded-lg font-semibold text-lg shadow-lg transition-all
            bg-gradient-to-r from-emerald-500 to-green-600 text-white 
            hover:scale-105 hover:shadow-emerald-500/40"
        >
          Register Account
        </button>
      </div>
    </div>
  );
};

export default InstructorRegisterComponent;
