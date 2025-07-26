import React, { useRef, useState } from 'react';

const FILTER = 'grayscale(100%)';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [captured, setCaptured] = useState<string | null>(null);

  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.filter = FILTER;
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        setCaptured(canvasRef.current.toDataURL('image/png'));
      }
    }
  };

  return (
    <div>
      <h1>Camera App with Filter</h1>
      <video ref={videoRef} style={{ width: 400 }} autoPlay />
      <br />
      <button onClick={startCamera}>Start Camera</button>
      <button onClick={capturePhoto}>Capture Photo</button>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div>
        {captured && (
          <div>
            <h2>Filtered Photo</h2>
            <img src={captured} alt="Filtered" style={{ filter: FILTER, width: 400 }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;