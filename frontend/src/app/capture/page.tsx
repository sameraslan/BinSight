'use client';
import React, { useRef, useState, useEffect } from 'react';
import { Box, Center, VStack, Text } from '@chakra-ui/react';

export default function Home() {
    const videoRef = useRef(null);
    const analysisCanvasRef = useRef(null); // Canvas for frame analysis
    const roiCanvasRef = useRef(null); // Separate canvas for displaying ROI
    const [capturedImage, setCapturedImage] = useState(null);
    let previousFrameData = null;
    let stableDuration = 0;
    const stabilityThreshold = 10; // Threshold for change detection
    const stabilityDurationRequired = 3000; // Duration in milliseconds
    const checkInterval = 500; // Interval for checking frames in milliseconds

    useEffect(() => {
        const videoElement = videoRef.current;
        const analysisCanvasElement = analysisCanvasRef.current;
        const setupVideoAndCanvas = () => {
            if (videoElement && analysisCanvasElement) {
                analysisCanvasElement.width = videoElement.videoWidth;
                analysisCanvasElement.height = videoElement.videoHeight;
                drawROI();
            }
        };

        if (navigator.mediaDevices.getUserMedia && videoElement) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    videoElement.srcObject = stream;
                    videoElement.play();
                })
                .catch(err => console.error("Error accessing webcam:", err));
            
            videoElement.addEventListener('loadedmetadata', setupVideoAndCanvas);
        }

        const intervalId = setInterval(() => {
            if (videoElement.readyState === 4) {
                captureAndCompareFrame();
                if (stableDuration >= stabilityDurationRequired) {
                    captureCurrentFrame();
                    clearInterval(intervalId);
                }
            }
        }, checkInterval);

        return () => {
            if (videoElement.srcObject) {
                videoElement.srcObject.getTracks().forEach(track => track.stop());
            }
            videoElement.removeEventListener('loadedmetadata', setupVideoAndCanvas);
        };
    }, []);

    const drawROI = () => {
        const roiCanvasElement = roiCanvasRef.current;
        const videoElement = videoRef.current;
        if (roiCanvasElement && videoElement) {
            roiCanvasElement.width = videoElement.videoWidth;
            roiCanvasElement.height = videoElement.videoHeight;

            const ctx = roiCanvasElement.getContext('2d');
            const roiSize = 0.5;
            const roiWidth = videoElement.videoWidth * roiSize;
            const roiHeight = videoElement.videoHeight * roiSize;
            const roiX = (videoElement.videoWidth - roiWidth) / 2;
            const roiY = (videoElement.videoHeight - roiHeight) / 2;

            ctx.clearRect(0, 0, roiCanvasElement.width, roiCanvasElement.height);
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(roiX, roiY, roiWidth, roiHeight);
        }
    };

    const captureAndCompareFrame = () => {
        const videoElement = videoRef.current;
        const analysisCanvasElement = analysisCanvasRef.current;

        if (videoElement && analysisCanvasElement) {
            const context = analysisCanvasElement.getContext('2d');
            const width = videoElement.videoWidth;
            const height = videoElement.videoHeight;

            context.drawImage(videoElement, 0, 0, width, height);
            const currentFrameData = context.getImageData(0, 0, width, height);

            if (previousFrameData) {
                const diff = frameDifference(currentFrameData, previousFrameData);
                if (diff < stabilityThreshold) {
                    stableDuration += checkInterval;
                } else {
                    stableDuration = 0;
                }
            }

            previousFrameData = currentFrameData;
        }
    };

    const frameDifference = (currentFrame, previousFrame) => {
        let diff = 0;
        for (let i = 0; i < currentFrame.data.length; i += 4) {
            // Calculating difference in color values (RGBA)
            diff += Math.abs(currentFrame.data[i] - previousFrame.data[i]); // R
            diff += Math.abs(currentFrame.data[i + 1] - previousFrame.data[i + 1]); // G
            diff += Math.abs(currentFrame.data[i + 2] - previousFrame.data[i + 2]); // B
        }
        return diff / (currentFrame.data.length / 4); // Average difference
    };

    const captureCurrentFrame = () => {
        const videoElement = videoRef.current;
        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = videoElement.videoWidth;
        captureCanvas.height = videoElement.videoHeight;
        const captureCtx = captureCanvas.getContext('2d');

        // Define and draw the ROI
        const roiSize = 0.5; // Middle 1/4th of the screen
        const roiWidth = captureCanvas.width * roiSize;
        const roiHeight = captureCanvas.height * roiSize;
        const roiX = (captureCanvas.width - roiWidth) / 2;
        const roiY = (captureCanvas.height - roiHeight) / 2;

        // Capture only the ROI part
        captureCtx.drawImage(videoElement, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);
        const imageDataUrl = captureCanvas.toDataURL('image/png');

        setCapturedImage(imageDataUrl);
    };

    useEffect(() => {
        // Draw the ROI bounding box on the ROI canvas
        const roiCanvasElement = roiCanvasRef.current;
        const videoElement = videoRef.current;
        if (roiCanvasElement && videoElement) {
            const ctx = roiCanvasElement.getContext('2d');
            const roiSize = 0.5; // Middle 1/4th of the screen
            const roiWidth = videoElement.videoWidth * roiSize;
            const roiHeight = videoElement.videoHeight * roiSize;
            const roiX = (videoElement.videoWidth - roiWidth) / 2;
            const roiY = (videoElement.videoHeight - roiHeight) / 2;

            roiCanvasElement.width = videoElement.videoWidth;
            roiCanvasElement.height = videoElement.videoHeight;

            ctx.strokeStyle = '#FF0000'; // Red color for ROI
            ctx.lineWidth = 2; // Thickness of the ROI rectangle
            ctx.strokeRect(roiX, roiY, roiWidth, roiHeight);
        }
    }, [videoRef]);
    
    return (
        <Center h="100vh">
            <VStack spacing={4} align="stretch">
                <Text fontSize="2xl" fontWeight="bold" textAlign="center">
                    Hi! Place your waste item in the box.
                </Text>
                <Box display="flex" justifyContent="center" alignItems="center" w="full" h="auto" position="relative" p={8}>
                    {capturedImage ? (
                        <img src={capturedImage} alt="Captured frame" />
                    ) : (
                        <>
                            <video ref={videoRef} style={{ width: '640px', height: '480px' }} autoPlay playsInline muted />
                            <canvas ref={analysisCanvasRef} style={{ display: 'none' }} />
                            <canvas ref={roiCanvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '640px', height: '480px' }} />
                        </>
                    )}
                </Box>
            </VStack>
        </Center>
    );
}