'use client';

import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import styles from './FacialRecognition.module.css';

interface FacialRecognitionProps {
  onFaceDetected: (data: Float32Array | string) => void;
  mode: 'login' | 'register' | 'photo';
  stopRef?: React.MutableRefObject<(() => void) | undefined>;
}

export default function FacialRecognition({ onFaceDetected, mode, stopRef }: FacialRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  const hasDetectedFace = useRef(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const detectorOptions = useRef(new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }));

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
      
      hasDetectedFace.current = false;
      setIsVideoReady(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const photoData = canvas.toDataURL('image/jpeg');
    onFaceDetected(photoData);
  };

  const initializeCamera = async () => {
    try {
      setError(null);
      console.log('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { min: 360, ideal: 360, max: 360 },
          height: { min: 270, ideal: 270, max: 270 }
        },
        audio: false
      });
      
      console.log('Camera access granted');
      
      if (!videoRef.current) {
        console.error('Video element not found during stream initialization');
        return;
      }
      
      videoRef.current.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        if (!videoRef.current) {
          console.error('Video element not found during metadata setup');
          reject(new Error('Video element not found'));
          return;
        }

        const video = videoRef.current;

        const handleCanPlay = () => {
          console.log('Video can play');
          video.play()
            .then(() => {
              console.log('Video playback started');
              setIsVideoReady(true);
              resolve();
            })
            .catch((err) => {
              console.error('Video playback error:', err);
              reject(err);
            });
        };

        video.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          if (video.readyState >= 3) {
            handleCanPlay();
          } else {
            video.oncanplay = handleCanPlay;
          }
        };

        video.onerror = (e) => {
          console.error('Video element error:', e);
          reject(new Error('Video element encountered an error'));
        };

        // Add timeouts
        setTimeout(() => {
          if (!video.readyState) {
            reject(new Error('Video loading timeout'));
          }
        }, 10000);
      });

      if (mode === 'photo') {
        setTimeout(capturePhoto, 1000);
      }
    } catch (err) {
      console.error('Camera initialization error:', err);
      setError(err instanceof Error ? err.message : 'Error accessing camera. Please ensure camera permissions are granted.');
    }
  };

  // Load models first
  useEffect(() => {
    let isMounted = true;

    const loadModels = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Loading face-api models...');
        
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

        console.log('Models loaded successfully');

        if (isMounted) {
          setIsModelLoaded(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Model loading error:', err);
        if (isMounted) {
          setError('Error loading facial recognition models. Please refresh the page.');
          setIsLoading(false);
        }
      }
    };

    loadModels();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize camera after models are loaded
  useEffect(() => {
    if (!isModelLoaded) return;

    let isMounted = true;

    const init = async () => {
      try {
        await initializeCamera();
      } catch (err) {
        console.error('Camera initialization failed:', err);
        if (isMounted) {
          setError('Failed to initialize camera. Please refresh and try again.');
        }
      }
    };

    init();

    if (stopRef) {
      stopRef.current = stopVideo;
    }

    return () => {
      console.log('Cleaning up video resources');
      isMounted = false;
      stopVideo();
    };
  }, [isModelLoaded, mode]);

  const handlePlay = () => {
    if (!videoRef.current || !canvasRef.current || hasDetectedFace.current || mode === 'photo' || !isVideoReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 360;
    canvas.height = video.videoHeight || 270;
    
    const displaySize = { width: canvas.width, height: canvas.height };
    faceapi.matchDimensions(canvas, displaySize);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      if (!video || !canvas || hasDetectedFace.current) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        return;
      }

      try {
        const detections = await faceapi
          .detectSingleFace(video, detectorOptions.current)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detections) {
          hasDetectedFace.current = true;
          onFaceDetected(detections.descriptor);
          stopVideo();
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }
      } catch (err) {
        console.error('Face detection error:', err);
        setError('Error detecting face. Please try again.');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }, 100);
  };

  useEffect(() => {
    if (isVideoReady) {
      console.log('Video is ready, starting face detection');
      handlePlay();
    }
  }, [isVideoReady]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading camera...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width={360}
        height={270}
        className={styles.video}
        style={{ 
          visibility: isVideoReady ? 'visible' : 'hidden',
          backgroundColor: 'transparent'
        }}
      />
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={360}
        height={270}
      />
      <div className={styles.faceGuide}>
        <div className={styles.faceCircle} />
      </div>
      {error ? (
        <div className={styles.error}>
          <p className={styles.errorText}>{error}</p>
        </div>
      ) : (
        <div className={styles.statusMessage}>
          <p className={styles.statusText}>
            {isLoading ? 'Loading camera...' : 
             !isVideoReady ? 'Initializing camera...' :
             mode === 'register' ? 'Center your face in the circle' : 
             mode === 'login' ? 'Looking for your face...' : 
             'Taking photo...'}
          </p>
        </div>
      )}
    </div>
  );
} 