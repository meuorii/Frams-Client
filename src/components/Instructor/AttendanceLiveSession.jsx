import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  FilesetResolver,
  FaceLandmarker,
} from "@mediapipe/tasks-vision";
import { toast } from "react-toastify";

// ⚡ Global model preloader — loads once and reuses for all sessions
let visionPromise = FilesetResolver.forVisionTasks(
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
);

let landmarkerPromise = visionPromise.then(async (vision) =>
  FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "/models/face_landmarker.task", // ✅ Local model path
    },
    runningMode: "VIDEO",
    numFaces: 5,
  })
);

const AttendanceLiveSession = ({ classId, onStopSession }) => {
  const activeClassId = classId;
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [recognized, setRecognized] = useState([]);
  const [isStarting, setIsStarting] = useState(true);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [isStopping, setIsStopping] = useState(false);
  const landmarkerRef = useRef(null);
  const isDetectingRef = useRef(true);
  const timerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const toastedIdsRef = useRef(new Set());
  const isProcessingFrame = useRef(false); 
  
  // ✅ Start timer when camera initializes
  const startTimer = () => {
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const diff = Date.now() - start;
      const minutes = String(Math.floor(diff / 60000)).padStart(2, "0");
      const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setElapsedTime(`${minutes}:${seconds}`);
    }, 1000);
  };

  // ✅ Stop timer (clear interval)
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // ✅ Load FaceLandmarker and initialize camera
  useEffect(() => {
    if (!activeClassId) {
      console.log("⏹ No activeClassId yet — waiting before starting camera...");
      return;
    }

    let stream;

    const init = async () => {
      try {
        console.log("⚙️ Initializing FaceLandmarker (optimized parallel setup)...");

        // ✅ Load model + camera in parallel
        const [faceLandmarker, userStream] = await Promise.all([
          landmarkerPromise,
          navigator.mediaDevices.getUserMedia({ video: true }),
        ]);

        landmarkerRef.current = faceLandmarker;
        stream = userStream;

        videoRef.current.srcObject = userStream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            resolve();
          };
        });

        setIsStarting(false);
        startTimer();
        console.log("🎥 Camera & FaceLandmarker ready!");
        await new Promise((res) => setTimeout(res, 500));
        startDetectionLoop(faceLandmarker);
      } catch (err) {
        console.error("💥 Initialization failed:", err);
        alert("Camera or model initialization failed. Please reload.");
      }
    };

    init();

    return () => {
      stopTimer();
      toastedIdsRef.current.clear();
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [activeClassId]);

  // 🎯 Main detection loop
  const startDetectionLoop = (faceLandmarker) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    let lastDetectionTime = 0;
    const DETECTION_INTERVAL = 33;

    const processFrame = async (now) => {
      if (
        !isDetectingRef.current ||
        !video ||
        !faceLandmarker ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        requestAnimationFrame(processFrame);
        return;
      }

      if (now - lastDetectionTime < DETECTION_INTERVAL) {
        requestAnimationFrame(processFrame);
        return;
      }
      lastDetectionTime = now;

      const startTimeMs = performance.now();
      let results = null;

      try {
        results = faceLandmarker.detectForVideo(video, startTimeMs);
      } catch (e) {
        console.warn("⚠️ Mediapipe skipped frame:", e.message);
        requestAnimationFrame(processFrame);
        return;
      }

      const ctx = canvas.getContext("2d");
      const width = video.videoWidth;
      const height = video.videoHeight;
      canvas.width = width;
      canvas.height = height;

      // 🧩 Clear canvas instead of redrawing the video
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      //ctx.scale(-1, 1);
      //ctx.translate(-width, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "medium";

      // 🟩 Draw bounding boxes only (not the video)
      if (results?.faceLandmarks?.length > 0) {
        console.log(`🧩 Detected ${results.faceLandmarks.length} face(s)`);
        const facesToSend = [];

        for (const landmarks of results.faceLandmarks) {
          const xs = landmarks.map((p) => p.x * width);
          const ys = landmarks.map((p) => p.y * height);
          const xMin = Math.min(...xs);
          const yMin = Math.min(...ys);
          const xMax = Math.max(...xs);
          const yMax = Math.max(...ys);
          const w = xMax - xMin;
          const h = yMax - yMin;

          const padding = 20;
          const x = Math.max(0, xMin - padding);
          const y = Math.max(0, yMin - padding);
          const boxW = Math.min(width - x, w + padding * 2);
          const boxH = Math.min(height - y, h + padding * 2);

          if (boxW <= 1 || boxH <= 1) continue;

          ctx.strokeStyle = "lime";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, boxW, boxH);

          // ✂️ Crop face
          const face = cropFace(video, x, y, width, height);
          if (face) facesToSend.push(face);
        }

        // 🧠 Send cropped faces to backend (rate-limited)
        if (facesToSend.length > 0 && !isProcessingFrame.current) {
          const now = Date.now();
          if (!AttendanceLiveSession.lastSent || now - AttendanceLiveSession.lastSent > 500) {
            AttendanceLiveSession.lastSent = now;
            isProcessingFrame.current = true;
            sendFaces(facesToSend)
              .catch((err) => console.error("❌ Recognition error:", err))
              .finally(() => {
                isProcessingFrame.current = false;
              });
          }
        }
      }

      ctx.restore();

      // 🎞 Continue loop smoothly (~60 FPS)
      if (isDetectingRef.current) requestAnimationFrame(processFrame);
    };

    requestAnimationFrame(processFrame);
  };

  // 🚀 Send detected faces to backend
  const sendFaces = async (facesToSend) => {
    if (!isDetectingRef.current || isStopping) {
      console.log("🚫 Skipping sendFaces — detection stopped");
      return;
    }

    abortControllerRef.current = new AbortController();

    console.log(`📤 Sending ${facesToSend.length} cropped faces to backend...`);
    try {
      const res = await axios.post(
        "https://frams-server-production.up.railway.app/api/face/multi-recognize",
        { faces: facesToSend, class_id: activeClassId },
        { signal: abortControllerRef.current.signal } 
      );

      console.log("✅ Backend responded:", res.data);

      if (res.data?.logged?.length > 0) {
        const enrichedData = res.data.logged.map((s) => ({
          student_id: s.student_id,
          first_name: s.first_name || "",
          last_name: s.last_name || "",
          status: s.status || "Unknown",
          // 🕒 Keep the exact recognition time (backend or first detection)
          time:
            s.time ||
            new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
          subject_code: s.subject_code || res.data.subject_code || "",
          subject_title: s.subject_title || res.data.subject_title || "",
        }));

        // ✅ Merge only new faces (no auto-removal)
        setRecognized((prev) => {
          const updated = [...prev];
          enrichedData.forEach((newFace) => {
            const exists = updated.find(
              (f) => f.student_id === newFace.student_id
            );
            if (!exists) {
              updated.push(newFace); // Add only if not already logged
            }
          });
          return updated;
        });

        res.data.logged.forEach((student) => {
          if (!toastedIdsRef.current.has(student.student_id)) {
            toastedIdsRef.current.add(student.student_id);
            toast.success(`${student.first_name} recognized`, { autoClose: 1000 });
          }
        });
      }
    } catch (err) {
      console.error("❌ Recognition error:", err);
    }
  };


  // ✂️ Crop face
  const cropFace = (video, x, y, boxW, boxH) => {
    const tmp = document.createElement("canvas");
    const ctx = tmp.getContext("2d");
    const targetSize = 160;
    tmp.width = targetSize;
    tmp.height = targetSize;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(video, x, y, boxW, boxH, 0, 0, targetSize, targetSize);
    return tmp.toDataURL("image/png");
  };

  const handleStopSession = async () => {
    try {
      setIsStopping(true);
      console.log("🛑 Stopping attendance session for:", activeClassId);

      isDetectingRef.current = false;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      stopTimer();
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }

      const res = await axios.post(
        `https://frams-server-production.up.railway.app/api/attendance/stop-session`,
        { class_id: activeClassId }   // ✅ send the classId in body
      );

      if (res.data?.success && res.data.class?.class_id) {
        // ✅ store last class id
        localStorage.setItem("lastClassId", res.data.class.class_id);
        toast.success("✅ Session stopped successfully!");
        console.log("✅ Stop session response:", res.data);
      }

      // Go to summary
      if (onStopSession) onStopSession();
    } catch (err) {
      console.error("❌ Error stopping attendance session:", err);
      toast.error("Failed to stop attendance session.");
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div className="flex flex-row items-start bg-neutral-950 text-white p-6 rounded-2xl shadow-lg gap-6">
      {/* Left: Camera */}
      <div className="relative flex-[3] rounded-xl overflow-hidden border border-white/10">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-auto rounded-xl transform scale-x-[-1]"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-sm font-mono border border-white/20 shadow">
          ⏱ {elapsedTime}
        </div>
        {/* 🛑 Stop Session Button */}
        <div className="absolute bottom-4 right-4">
          <button
            onClick={handleStopSession}
            disabled={isStopping}
            className={`${
              isStopping ? "opacity-50 cursor-not-allowed" : "hover:bg-red-700"
            } bg-red-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition-all duration-300`}
          >
            🛑 {isStopping ? "Stopping..." : "Stop Session"}
          </button>
        </div>
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-gray-300">
            Initializing camera...
          </div>
        )}
      </div>

      {/* Right: Logs */}
      <div className="flex-[1] bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
        {/* Header with subject info */}
        <h3 className="text-lg font-semibold text-emerald-300 mb-1">
          Recent Detections
        </h3>

        {/* Subject and date */}
        <p className="text-xs text-gray-400">
          {recognized.length > 0 && recognized[0].subject_code
            ? `${recognized[0].subject_code} – ${recognized[0].subject_title}`
            : "No subject info"}
        </p>
        <span className="text-[11px] text-gray-500">
          {new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>

        <hr className="my-3 border-white/10" />

        {recognized.length === 0 ? (
          <p className="text-gray-400 text-sm italic">
            No faces recognized yet...
          </p>
        ) : (
          <ul className="space-y-2 max-h-[500px] overflow-y-auto">
            {recognized.map((r, i) => (
              <li
                key={i}
                className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/10 hover:bg-white/10 transition"
              >
                <div>
                  <p className="font-semibold text-white text-sm">
                    {r.first_name} {r.last_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {r.student_id} •{" "}
                    <span className="text-gray-300 font-mono">
                      {r.time || "—"}
                    </span>
                  </p>
                </div>

                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    r.status === "Late"
                      ? "bg-yellow-500 text-black"
                      : r.status === "Present"
                      ? "bg-emerald-500 text-black"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AttendanceLiveSession;
