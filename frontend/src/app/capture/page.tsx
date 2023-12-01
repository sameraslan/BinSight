'use client'
import { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import { loadYoloV8n } from './model';
import { drawBoxes } from './drawing';
import { nonMaxSuppression } from './nms';

const TRASH_CLASSES = [39, 40, 41, 42, 43, 44, 45]; //bottle, cup etc

function TrashDetection() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [model, setModel] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [detectedBox, setDetectedBox] = useState(null);
  
  useEffect(() => {
    async function loadModel() {
      const model = await loadYoloV8n();
      setModel(model);
    }
    loadModel();
  }, []);

  const detectFrame = async () => {
    const video = webcamRef.current;
    const canvas = canvasRef.current;
    
    const [videoWidth, videoHeight] = [video.videoWidth, video.videoHeight];
    
    // Define ROI 
    const roiWidth = videoWidth / 2; 
    const roiHeight = videoHeight / 2;
    const roiX = (videoWidth - roiWidth) / 2;
    const roiY = (videoHeight - roiHeight) / 2;

    const frame = tf.tidy(() => {
      // Capture frame from video
      let img = tf.browser.fromPixels(video);

      // Crop ROI  
      img = img.slice([roiY, roiX, 0], [roiHeight, roiWidth, 3]); 

      // Preprocess
      img = img.div(255.0);
      // Add batch dimension
      img = img.expandDims(0); 
      return img;
    });
    
    // Detect objects
    const results = await model.execute(frame);
    
    // Postprocess detections
    const [boxes, scores, classes] = tf.split(results, [4, 1, 1], 2);
    const indices = tf.where(scores > 0.5);  
    const selectedBoxes = tf.gather_nd(boxes, indices);
    const selectedScores = tf.gather_nd(scores, indices);
    const selectedClasses = tf.gather_nd(classes, indices);

    // Run NMS    
    const detections = nonMaxSuppression(
      selectedBoxes.arraySync(), 
      selectedScores.arraySync(),
      selectedClasses.arraySync()
    );

    // Draw boxes
    drawBoxes(canvas, detections, TRASH_CLASSES); 

    tf.dispose(frame);
    tf.dispose(results);
    tf.dispose(selectedBoxes);
    tf.dispose(selectedScores);
    tf.dispose(selectedClasses);

    if(capturing) {
      // Check if trash detected
      if(detections.length > 0) {
        setCaptureCount(count => count + 1);  
      }

      // Save image if trash is stable
      if(captureCount > 15) {
        setDetectedBox(detections[0]); 
        setCapturing(false);
      } 
    }

    requestAnimationFrame(() => detectFrame());
  }

  useEffect(() => {
    if(!model) {
      return;
    }
    detectFrame();
  }, [model]);

  const handleCapture = () => {
    setCapturing(true);
    setCaptureCount(0);
    setDetectedBox(null);
  }

  // Triggered when stable trash detected
  const handleSave = () => {
    // Code to save cropped image using box coords    
  }

  return (
    <div>
      <Webcam ref={webcamRef} />
      <canvas ref={canvasRef} />

      <button onClick={handleCapture}>Capture Trash</button>  
      {detectedBox && (
        <button onClick={handleSave}>
          Save {detectedBox.className}
        </button>  
      )}
    </div>
  );
}

export default TrashDetection;