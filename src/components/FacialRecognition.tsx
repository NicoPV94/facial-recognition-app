'use client';

import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import styles from './FacialRecognition.module.css';

interface FacialRecognitionProps {
  onFaceDetected: (data: Float32Array | string) => void;
  mode: 'login' | 'register' | 'photo';
  stopRef?: React.MutableRefObject<(() => void) | undefined>;
}

interface VideoConstraints extends MediaTrackConstraints {
  facingMode?: string;
  width?: { ideal: number };
  height?: { ideal: number };
  deviceId?: { exact: string };
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
      console.log('Starting camera initialization...');
      
      // Check for browser compatibility in different ways
      if (!navigator.mediaDevices) {
        console.log('mediaDevices not found, trying to access getUserMedia directly');
        // @ts-ignore - for older browsers
        navigator.mediaDevices = {};
      }

      // Handle legacy versions
      if (!navigator.mediaDevices.getUserMedia) {
        console.log('getUserMedia not found, setting up legacy support');
        navigator.mediaDevices.getUserMedia = function(constraints) {
          // @ts-ignore - for older browsers
          const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
          
          if (!getUserMedia) {
            console.error('No getUserMedia implementation found');
            return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
          }

          return new Promise((resolve, reject) => {
            getUserMedia.call(navigator, constraints, resolve, reject);
          });
        }
      }

      console.log('Attempting to enumerate video devices...');
      let constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 360 },
          height: { ideal: 270 }
        } as VideoConstraints,
        audio: false
      };

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('Available devices:', devices);
        
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Video devices:', videoDevices);

        if (videoDevices.length > 0) {
          const frontCamera = videoDevices.find(device => 
            device.label.toLowerCase().includes('front') || 
            device.label.toLowerCase().includes('facetime') ||
            device.label.toLowerCase().includes('user')
          );

          if (frontCamera) {
            console.log('Front camera found:', frontCamera.label);
            (constraints.video as VideoConstraints) = {
              ...(constraints.video as VideoConstraints),
              deviceId: { exact: frontCamera.deviceId }
            };
          }
        }
      } catch (enumError) {
        console.log('Error enumerating devices, falling back to default constraints:', enumError);
      }

      console.log('Requesting camera with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera access granted');
      
      if (!videoRef.current) {
        throw new Error('Video element not found during stream initialization');
      }
      
      videoRef.current.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        if (!videoRef.current) {
          reject(new Error('Video element not found during metadata setup'));
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
      const errorMessage = err instanceof Error ? err.message : 
        'Error accessing camera. Please ensure camera permissions are granted and you are using a secure connection (HTTPS).';
      setError(errorMessage);
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
      if (!video || !canvas || hasDetectedFace.current || !video.readyState || video.readyState < 4) {
        return;
      }

      try {
        // Ensure video is actually playing and has loaded metadata
        if (video.paused || video.ended || !isVideoReady) {
          return;
        }

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
    if (isVideoReady && videoRef.current?.readyState === 4) {
      console.log('Video is ready, starting face detection');
      handlePlay();
    }
  }, [isVideoReady]);

  // Initialize camera after models are loaded
  useEffect(() => {
    if (!isModelLoaded) return;

    let isMounted = true;

    const init = async () => {
      try {
        await initializeCamera();
        
        // Wait for video to be fully loaded
        if (videoRef.current) {
          videoRef.current.onloadeddata = () => {
            if (isMounted && videoRef.current?.readyState === 4) {
              setIsVideoReady(true);
            }
          };
        }
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