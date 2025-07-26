"use client";
import React, { useEffect, useRef, useState } from "react";

// Enhanced Pro Theme Colors
const THEME = {
  background: "bg-gradient-to-br from-[#18181b] via-[#23272f] to-[#1e293b]",
  card: "bg-[#23272f] border border-[#2d3748] shadow-xl",
  accent: "bg-gradient-to-r from-[#6366f1] to-[#06b6d4]",
  accentText: "text-white",
  text: "text-[#e5e7eb]",
  button: "rounded px-4 py-2 font-semibold transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#06b6d4]",
  buttonPrimary: "bg-gradient-to-r from-[#6366f1] to-[#06b6d4] text-white",
  buttonSecondary: "bg-[#23272f] text-[#e5e7eb] border border-[#6366f1]",
  buttonDanger: "bg-gradient-to-r from-[#ef4444] to-[#f59e42] text-white",
  buttonWarning: "bg-gradient-to-r from-[#f59e42] to-[#fbbf24] text-white",
  buttonDownload: "bg-gradient-to-r from-[#a21caf] to-[#6366f1] text-white",
  select: "bg-[#18181b] border border-[#6366f1] text-[#e5e7eb] rounded px-2 py-1",
};

const FILTERS = [
  { name: "None", value: "none" },
  { name: "Grayscale", value: "grayscale(100%)" },
  { name: "Sepia", value: "sepia(100%)" },
  { name: "Invert", value: "invert(100%)" },
  { name: "Blur", value: "blur(4px)" },
  { name: "Brightness", value: "brightness(1.5)" },
  { name: "Contrast", value: "contrast(2)" },
];

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [filter, setFilter] = useState(FILTERS[1].value);
  const [recording, setRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [recordTime, setRecordTime] = useState(0);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save video to IndexedDB
  const saveVideoToIndexedDB = (blob: Blob) => {
    const request = indexedDB.open("cameraProDB", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("videos")) {
        db.createObjectStore("videos");
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("videos", "readwrite");
      const store = tx.objectStore("videos");
      store.put(blob, "latest");
      tx.oncomplete = () => db.close();
    };
  };

  // Load video from IndexedDB on mount
  useEffect(() => {
    const request = indexedDB.open("cameraProDB", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("videos")) {
        db.createObjectStore("videos");
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("videos", "readonly");
      const store = tx.objectStore("videos");
      const getReq = store.get("latest");
      getReq.onsuccess = () => {
        if (getReq.result) {
          setVideoBlob(getReq.result as Blob);
          setVideoUrl(URL.createObjectURL(getReq.result as Blob));
        }
        db.close();
      };
    };
  }, []);

  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // Set audio to false to mute the mic
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreaming(true);
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.filter = filter;
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        setCaptured(canvasRef.current.toDataURL("image/png"));
      }
    }
  };

  const downloadPhoto = () => {
    if (captured) {
      const link = document.createElement("a");
      link.href = captured;
      link.download = "filtered-photo.png";
      link.click();
    }
  };

  const startRecording = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      setRecordedChunks([]);
      setRecordTime(0);
      // Start timer
      recordIntervalRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };
      recorder.onstop = () => {
        if (recordIntervalRef.current) {
          clearInterval(recordIntervalRef.current);
        }
        setRecordTime(0);
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        setVideoBlob(blob);
        setVideoUrl(URL.createObjectURL(blob));
        saveVideoToIndexedDB(blob);
      };
      recorder.start();
      setRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
    }
  };

  const downloadVideo = () => {
    if (videoUrl) {
      const link = document.createElement("a");
      link.href = videoUrl;
      link.download = "recorded-video.webm";
      link.click();
    }
  };

  return (
    <div className={`${THEME.background} min-h-screen flex flex-col items-center justify-center py-10`}>
      <div className={`${THEME.card} rounded-xl p-8 flex flex-col items-center gap-8 w-full max-w-xl`}>
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent drop-shadow-lg mb-2">
          Camera Pro Studio
        </h1>
        <div className="flex flex-col items-center gap-2 w-full">
          <video
            ref={videoRef}
            style={{ width: 400, filter }}
            autoPlay
            className="rounded-lg border-2 border-[#6366f1] shadow-lg"
          />
          <div className="flex gap-2 mt-2 items-center">
            <label htmlFor="filter" className="font-semibold text-[#a5b4fc]">Filter:</label>
            <select
              id="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={THEME.select}
            >
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-4 justify-center w-full">
          <button
            onClick={startCamera}
            className={`${THEME.button} ${THEME.buttonPrimary}`}
            disabled={streaming}
          >
            Start Camera
          </button>
          <button
            onClick={capturePhoto}
            className={`${THEME.button} ${THEME.buttonSecondary}`}
            disabled={!streaming}
          >
            Capture Photo
          </button>
          <button
            onClick={downloadPhoto}
            className={`${THEME.button} ${THEME.buttonDownload}`}
            disabled={!captured}
          >
            Download Photo
          </button>
          {!recording ? (
            <button
              onClick={startRecording}
              className={`${THEME.button} ${THEME.buttonDanger}`}
              disabled={!streaming}
            >
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className={`${THEME.button} ${THEME.buttonWarning}`}
            >
              Stop Recording
            </button>
          )}
          <button
            onClick={downloadVideo}
            className={`${THEME.button} ${THEME.buttonDownload}`}
            disabled={!videoUrl}
          >
            Download Video
          </button>
        </div>
        {recording && (
          <div className="text-[#fbbf24] font-mono text-lg">
            Recording... {recordTime}s
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: "none" }} />
        {captured && (
          <div className="flex flex-col items-center gap-2 w-full">
            <h2 className="text-lg font-semibold text-[#a5b4fc]">Filtered Photo</h2>
            <img
              src={captured}
              alt="Filtered"
              style={{ filter, width: 400 }}
              className="rounded-lg border-2 border-[#6366f1] shadow"
            />
          </div>
        )}
        {videoUrl && (
          <div className="flex flex-col items-center gap-2 w-full">
            <h2 className="text-lg font-semibold text-[#a5b4fc]">Recorded Video</h2>
            <video
              key={videoUrl}
              src={videoUrl}
              controls
              autoPlay
              style={{ width: 400 }}
              className="rounded-lg border-2 border-[#6366f1] shadow"
            />
          </div>
        )}
      </div>
    </div>
  );
}
