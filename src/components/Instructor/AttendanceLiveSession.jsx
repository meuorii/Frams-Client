import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import {
  FilesetResolver,
  FaceLandmarker,
} from "@mediapipe/tasks-vision";

const AttendanceLiveSession = () => {
  const { classId } = useParams();
  const activeClassId = classId;
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [recognized, setRecognized] = useState([]);
  const [isStarting, setIsStarting] = useState(true);
  const landmarkerRef = useRef(null);

  // ✅ Load FaceLandmarker and initialize camera
  useEffect(() => {
    if (!activeClassId) {
      console.log("⏹ No activeClassId yet — waiting before starting camera...");
      return;
    }

    let cancelled = false;
    let stream;

    const init = async () => {
      try {
        console.log("⚙️ Initializing FaceLandmarker...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );

        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          },
          runningMode: "VIDEO",
          numFaces: 5,
        });

        landmarkerRef.current = faceLandmarker;

        console.log("🟨 Requesting camera permission...");
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) return;

        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            resolve();
          };
        });

        setIsStarting(false);
        console.log("🎥 Camera started successfully!");
        startDetectionLoop(faceLandmarker);
      } catch (err) {
        console.error("💥 Initialization failed:", err);
        alert("Camera or model initialization failed. Please reload.");
      }
    };

    init();

    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [activeClassId]);

  // 🎯 Main detection loop
  const startDetectionLoop = (faceLandmarker) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const processFrame = () => {
      if (!video || !faceLandmarker) return;
      const startTimeMs = performance.now();
      const results = faceLandmarker.detectForVideo(video, startTimeMs);

      // Draw video frame
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      // Draw bounding boxes and crop faces
      if (results?.faceLandmarks?.length > 0) {
        console.log(`🧩 Detected ${results.faceLandmarks.length} face(s)`);

        const facesToSend = [];
        for (const landmarks of results.faceLandmarks) {
          const xs = landmarks.map((p) => p.x * canvas.width);
          const ys = landmarks.map((p) => p.y * canvas.height);
          const xMin = Math.min(...xs);
          const yMin = Math.min(...ys);
          const xMax = Math.max(...xs);
          const yMax = Math.max(...ys);
          const w = xMax - xMin;
          const h = yMax - yMin;

          const padding = 20;
          const x = Math.max(0, canvas.width - xMax - padding);
          const y = Math.max(0, yMin - padding);
          const width = Math.min(canvas.width, w + padding * 2);
          const height = Math.min(canvas.height, h + padding * 2);

          ctx.strokeStyle = "lime";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, width, height);

          const face = cropFace(video, canvas.width - x - width, y, width, height);
          if (face) facesToSend.push(face);
        }

        // Send to backend (rate-limited)
        if (
          facesToSend.length > 0 &&
          activeClassId &&
          (!AttendanceLiveSession.lastSent ||
            Date.now() - AttendanceLiveSession.lastSent > 3000)
        ) {
          AttendanceLiveSession.lastSent = Date.now();
          sendFaces(facesToSend);
        }
      }

      requestAnimationFrame(processFrame);
    };

    requestAnimationFrame(processFrame);
  };

  // 🚀 Send detected faces to backend
  const sendFaces = async (facesToSend) => {
    console.log(`📤 Sending ${facesToSend.length} cropped faces to backend...`);
    try {
      const res = await axios.post(
        "https://frams-server-production.up.railway.app/api/face/multi-recognize",
        { faces: facesToSend, class_id: activeClassId }
      );

      console.log("✅ Backend responded:", res.data);

      if (res.data?.logged?.length > 0) {
        // 🧠 Enrich data for consistent UI fields
        const enrichedData = res.data.logged.map((s) => ({
          student_id: s.student_id,
          first_name: s.first_name || "",
          last_name: s.last_name || "",
          status: s.status || "Unknown",
          // Show backend time or generate fallback
          time:
            s.time ||
            new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
          // Include subject info (fallback from top-level if backend sends it)
          subject_code: s.subject_code || res.data.subject_code || "",
          subject_title: s.subject_title || res.data.subject_title || "",
        }));

        // 🧩 Update state with enriched data
        setRecognized(enrichedData);
      }
    } catch (err) {
      console.error("❌ Recognition error:", err);
    }
  };


  // ✂️ Crop face
  const cropFace = (video, x, y, w, h) => {
    const tmp = document.createElement("canvas");
    const ctx = tmp.getContext("2d");
    tmp.width = w;
    tmp.height = h;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(video, x, y, w, h, 0, 0, w, h);
    return tmp.toDataURL("image/jpeg");
  };

  return (
    <div className="flex flex-col md:flex-row bg-neutral-950 text-white p-6 rounded-2xl shadow-lg gap-6">
      {/* Left: Camera */}
      <div className="relative w-full md:w-3/4 rounded-xl overflow-hidden border border-white/10">
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
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-gray-300">
            Initializing camera...
          </div>
        )}
      </div>

      {/* Right: Logs */}
      <div className="w-full md:w-1/4 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
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
