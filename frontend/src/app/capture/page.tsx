'use client'
import React, { useRef, useState, useEffect } from 'react';
import { Box, Center, VStack, Text, useTheme } from '@chakra-ui/react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import { Webcam } from './webcam'; // Update the path as per your project structure
import { renderBoxes } from './renderBox';
import { non_max_suppression } from './nonMaxSuppression';

export default function Home() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const theme = useTheme();
    const [loading, setLoading] = useState({ loading: true, progress: 0 });
    const modelName = 'yolov7';
    const [previousDetections, setPreviousDetections] = useState({});
    const [stabilityCounts, setStabilityCounts] = useState({});
    const [capturedImage, setCapturedImage] = useState(null);

    const ROI_FACTOR = 1/4; // Example: Use 1/4th of the frame as ROI
    const STABILITY_THRESHOLD = 5; // Number of frames an object must be stable
    const DISTANCE_THRESHOLD = 50; // Threshold for object movement to be considered stable (in pixels)

    const OBJECT_NAMES = {
        0: 'person', 1: 'bicycle', 2: 'car', 3: 'motorcycle', 4: 'airplane', 5: 'bus', 
        6: 'train', 7: 'truck', 8: 'boat', 9: 'traffic light', 10: 'fire hydrant', 
        11: 'stop sign', 12: 'parking meter', 13: 'bench', 14: 'bird', 15: 'cat',
        16: 'dog', 17: 'horse', 18: 'sheep', 19: 'cow', 20: 'elephant',
        21: 'bear', 22: 'zebra', 23: 'giraffe', 24: 'backpack', 25: 'umbrella', 
        26: 'handbag', 27: 'tie', 28: 'suitcase', 29: 'frisbee', 30: 'skis', 
        31: 'snowboard', 32: 'sports ball', 33: 'kite', 34: 'baseball bat', 35: 'baseball glove', 
        36: 'skateboard', 37: 'surfboard', 38: 'tennis racket', 39: 'bottle', 40: 'wine glass',
        41: 'cup', 42: 'fork', 43: 'knife', 44: 'spoon', 45: 'bowl',
        46: 'banana', 47: 'apple', 48: 'sandwich', 49: 'orange', 50: 'broccoli',
        51: 'carrot', 52: 'hot dog', 53: 'pizza', 54: 'donut', 55: 'cake',
        56: 'chair', 57: 'couch', 58: 'potted plant', 59: 'bed', 60: 'dining table',
        61: 'toilet', 62: 'tv', 63: 'laptop', 64: 'mouse', 65: 'remote',
        66: 'keyboard', 67: 'cell phone', 68: 'microwave', 69: 'oven', 70: 'toaster',
        71: 'sink', 72: 'refrigerator', 73: 'book', 74: 'clock', 75: 'vase',
        76: 'scissors', 77: 'teddy bear', 78: 'hair drier', 79: 'toothbrush'
    };

    const NOT_TRASH_CLASS_IDS = {
        'person': [0],
        'vehicles': [1, 2, 3, 4, 5, 6, 7, 8],
        'street_objects': [9, 10, 11, 12, 13],
        'animals': [14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
        'clothing': [24, 26, 27, 28],
        'electronics': [62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72],
        'large_items': [38, 56, 57, 58, 59, 60, 61]
    };
    

    const NOT_TRASH_CLASS_IDS_FLAT = Object.values(NOT_TRASH_CLASS_IDS).flat();
    const TRASH_CLASS_IDS = Object.keys(OBJECT_NAMES).filter(id => !NOT_TRASH_CLASS_IDS_FLAT.includes(parseInt(id)));

    const detectFrame = async (model, videoRef, canvasRef) => {
        const videoElement = videoRef.current;
        const canvasElement = canvasRef.current;
        if (videoElement && canvasElement) {
            canvasElement.width = videoElement.clientWidth;
            canvasElement.height = videoElement.clientHeight;
        }
    
        const model_dim = [480, 640];
        tf.engine().startScope();
        const input = tf.tidy(() => {
            let img = tf.browser.fromPixels(videoRef.current)
                        .resizeNearestNeighbor([model_dim[1], model_dim[0]]) // Resize to 640x480
            const padWidth = (model_dim[1] - model_dim[0]) / 2;
            const padding = [[0, 0], [padWidth, padWidth], [0, 0]];
            let paddedImg = img.pad(padding, 0).div(255.0)
                                .transpose([2, 0, 1])
                                .expandDims(0);
            return paddedImg;
        });
    
        await model.executeAsync(input).then((res) => {
            res = res.arraySync()[0];
            var detections = non_max_suppression(res);
            const boxes = detections.map(d => d.slice(0, 4));
            const scores = detections.map(d => d[4]);
            const classes = detections.map(d => d[5]);

            if (!canvasRef.current) return;
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;
    
            // Clear previous drawings
            ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

            // Draw ROI
            const roiWidth = videoRef.current.clientWidth * Math.sqrt(ROI_FACTOR);
            const roiHeight = videoRef.current.clientHeight * Math.sqrt(ROI_FACTOR);
            const roiX = (videoRef.current.clientWidth - roiWidth) / 2;
            const roiY = (videoRef.current.clientHeight - roiHeight) / 2;    
    
            ctx.strokeStyle = '#FF0000'; // Red color for ROI
            ctx.lineWidth = 2; // Thickness of the ROI rectangle
            ctx.strokeRect(roiX, roiY, roiWidth, roiHeight);
    
            const newDetections = {};
            detections.forEach((detection, i) => {
                const [x1, y1, x2, y2, score, classId] = detection;
                if (!TRASH_CLASS_IDS.includes(classId.toString())) {
                    return;
                }
            
                // Calculate ROI dimensions based on the current video dimensions
                const roiWidth = videoRef.current.clientWidth * Math.sqrt(ROI_FACTOR);
                const roiHeight = videoRef.current.clientHeight * Math.sqrt(ROI_FACTOR);
                const roiX = (videoRef.current.clientWidth - roiWidth) / 2;
                const roiY = (videoRef.current.clientHeight - roiHeight) / 2;
            
                if (x1 >= roiX && y1 >= roiY && x2 <= (roiX + roiWidth) && y2 <= (roiY + roiHeight)) {

                    // Draw the bounding box
                    renderBoxes(canvasRef, 0.80, boxes, scores, classes);

                    const key = `class-${classId}`;
                    newDetections[key] = detection;
                    if (previousDetections[key]) {
                        const prevDetection = previousDetections[key];
                        const distance = Math.sqrt(Math.pow(prevDetection[0] - x1, 2) + Math.pow(prevDetection[1] - y1, 2));
                        if (distance < DISTANCE_THRESHOLD) {
                            stabilityCounts[key] = (stabilityCounts[key] || 0) + 1;
                            if (stabilityCounts[key] > STABILITY_THRESHOLD) {
                                console.log(`Stable object detected: ${OBJECT_NAMES[classId]}`);

                                // Capture stable frame
                                const captureCanvas = document.createElement('canvas');
                                captureCanvas.width = videoElement.videoWidth;
                                captureCanvas.height = videoElement.videoHeight;
                                const captureCtx = captureCanvas.getContext('2d');
                                captureCtx.drawImage(videoElement, 0, 0, captureCanvas.width, captureCanvas.height);
                                const imageDataUrl = captureCanvas.toDataURL('image/png');

                                // Set the captured image and stop further capture
                                setCapturedImage(imageDataUrl);

                                // Reset stability count to avoid multiple captures
                                stabilityCounts[key] = 0;

                                // Optionally, you can stop the requestAnimationFrame loop here
                                return; // This stops the detectFrame loop
                            }
                        } else {
                            stabilityCounts[key] = 0;
                        }
                    }
                }
            });

            tf.dispose(res);
    
            setPreviousDetections(newDetections);
        });
    
        requestAnimationFrame(() => detectFrame(model, videoRef, canvasRef));
        tf.engine().endScope();
    };

    // Effect hook to load the YOLOv7 model
    useEffect(() => {
        const webcam = new Webcam();

        tf.loadGraphModel(`${window.location.origin}/${modelName}_web_model/model.json`, {
            onProgress: (fractions) => {
                setLoading({ loading: true, progress: fractions });
            },
        }).then(async (yolov7) => {
            // Warmup the model before using real data
            const dummyInput = tf.ones(yolov7.inputs[0].shape);
            await yolov7.executeAsync(dummyInput).then((warmupResult) => {
                tf.dispose(warmupResult);
                tf.dispose(dummyInput);

                setLoading({ loading: false, progress: 1 });
                webcam.open(videoRef, () => detectFrame(yolov7, videoRef, canvasRef));
            });
        });
    }, []);

    return (
        <Center h="100vh">
            <VStack spacing={4} align="stretch">
                <Text fontSize="2xl" fontWeight="bold" textAlign="center">
                    Hi! Place your item in the box
                </Text>
                <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    w="full"
                    h="auto"
                    position="relative"
                    bg={theme.colors.primary[500]}
                    p={8}
                    borderRadius="xl"
                >
                    {loading.loading ? (
                        <div>Loading model... {Math.floor(loading.progress * 100)}%</div>
                    ) : capturedImage ? (
                        // Display the captured image
                        <img src={capturedImage} alt="Captured frame" />
                    ) : (
                        // Display the webcam and canvas for capturing
                        <>
                            <video ref={videoRef} style={{ width: '640px', height: '480px' }} autoPlay playsInline muted />
                            <canvas ref={canvasRef} style={{ position: 'absolute', width: '640px', height: '480px' }} />
                        </>
                    )}
                </Box>
            </VStack>
        </Center>
    );
}


