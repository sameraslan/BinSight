'use client';
import React, { useRef, useState, useEffect } from 'react';
import { Box, Center, VStack, Heading, Badge, Text, Spinner, useToast } from '@chakra-ui/react';
import uploadImage from 'src/services/upload';
import { 
    MdCompost, MdDescription, MdDelete 
  } from 'react-icons/md';
import { FaRecycle } from "react-icons/fa";


export default function Home() {
    let previousFrameData = null;
    let stableDuration = 0;
    const videoRef = useRef(null);
    const roiCanvasRef = useRef(null); // Canvas for displaying ROI
    const analysisCanvasRef = useRef(null); // Canvas for frame analysis
    const intervalIdRef = useRef(null);
    const stabilityThreshold = 10;
    const stabilityDurationRequired = 2500;
    const checkInterval = 500;
    const toast = useToast();
    const [page, setPage] = useState("capture");
    const [capturedImage, setCapturedImage] = useState(null);
    const [response, setResponse] = useState({ status: 'idle', data: null });

    useEffect(() => {
        if (response && response.status === 'success' && page === "display") {
            const timeoutId = setTimeout(() => {
                setPage("capture");
                setResponse({ status: 'idle', data: null })
                setCapturedImage(null);
            }, 5000);

            // Cleanup timeout on component unmount or if dependencies change
            return () => clearTimeout(timeoutId);
        }

        if (page === "error") {
            toast({
                title: "Error",
                description: "Couldn't get you your classification! Please try again :)",
                status: "error",
                duration: 2000,
                isClosable: true,
                position: "bottom-left"
            });

            const timeoutId = setTimeout(() => {
                setResponse({ status: 'idle', data: null })
                setPage("capture");
                setCapturedImage(null);
            }, 2000);

            return () => clearTimeout(timeoutId);
        }
    }, [page]);

    useEffect(() => {
        const videoElement = videoRef.current;
        const roiCanvasElement = roiCanvasRef.current;
        const analysisCanvasElement = analysisCanvasRef.current;

        const setupVideoAndCanvas = () => {
            if (videoElement && roiCanvasElement && analysisCanvasElement) {
                roiCanvasElement.width = videoElement.videoWidth;
                roiCanvasElement.height = videoElement.videoHeight;
                analysisCanvasElement.width = videoElement.videoWidth;
                analysisCanvasElement.height = videoElement.videoHeight;
                drawROI();
            }
        };

        if (page != "capture") {
            return;
        }

        if (navigator.mediaDevices.getUserMedia && videoElement) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    videoElement.srcObject = stream;
                    videoElement.play();
                })
                .catch(err => console.error("Error accessing webcam:", err));

            videoElement.addEventListener('loadedmetadata', setupVideoAndCanvas);
        }

        intervalIdRef.current = setInterval(() => {
            if (videoElement.readyState === 4) {
                captureAndCompareFrame();
                if (stableDuration >= stabilityDurationRequired) {
                    setPage("loading")
                    captureCurrentFrame();
                    clearInterval(intervalIdRef.current);
                }
            }
        }, checkInterval);

        return () => {
            clearInterval(intervalIdRef.current);
            if (videoElement.srcObject) {
                videoElement.srcObject.getTracks().forEach(track => track.stop());
            }
            videoElement.removeEventListener('loadedmetadata', setupVideoAndCanvas);
        };
    }, [page]);

    const drawROI = () => {
        const roiCanvasElement = roiCanvasRef.current;
        const videoElement = videoRef.current;
        if (roiCanvasElement && videoElement) {
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
                // console.log('Frame difference:', diff); 
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
            diff += Math.abs(currentFrame.data[i] - previousFrame.data[i]);
            diff += Math.abs(currentFrame.data[i + 1] - previousFrame.data[i + 1]);
            diff += Math.abs(currentFrame.data[i + 2] - previousFrame.data[i + 2]);
        }
        return diff / (currentFrame.data.length / 4);
    };

    const captureCurrentFrame = () => {
        const videoElement = videoRef.current;
        if (videoElement && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            // Create a temporary canvas for capturing the ROI
            const tempCanvas = document.createElement('canvas');
            const roiSize = 0.5;
            const roiWidth = videoElement.videoWidth * roiSize;
            const roiHeight = videoElement.videoHeight * roiSize;
            const roiX = (videoElement.videoWidth - roiWidth) / 2;
            const roiY = (videoElement.videoHeight - roiHeight) / 2;
    
            // Set the temporary canvas size to the ROI size
            tempCanvas.width = roiWidth;
            tempCanvas.height = roiHeight;
            const tempCtx = tempCanvas.getContext('2d');
    
            // Draw only the ROI onto the temporary canvas
            tempCtx.drawImage(videoElement, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);
    
            // Convert the drawn ROI to an image URL
            const imageDataUrl = tempCanvas.toDataURL('image/jpeg');
    
            // Update the state with the captured image
            setCapturedImage(imageDataUrl);
            clearInterval(intervalIdRef.current); // Clear interval after capturing frame
        } else {
            console.error('Video element is not ready for capturing frames.');
        }
    };

    const capitalizeFirstLetter = (string) => {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    const ClassificationDisplay = ({ classificationData }) => {
        const {label, score} = classificationData;
        // let label = 'recycle';
        // let score = 0.9;
    
        const icons = {
            compost: <MdCompost style={{ fontSize: '3em' }} />,
            paper: <MdDescription style={{ fontSize: '3em' }} />,
            recycle: <FaRecycle style={{ fontSize: '3em' }} />,
            trash: <MdDelete style={{ fontSize: '3em' }} />
        };
    
        const icon = icons[label];
    
        return (
            <Center>
                <Box maxW='lg' borderWidth='1px' borderRadius='lg' overflow='hidden' textAlign='center'>
                    <Center bg='gray.100' p='4'>
                        {icon}
                    </Center>
                    <Box p='6'>
                        <Heading size='xl'>{label.toUpperCase()}</Heading>
                        <Badge mt='1' fontSize='2em' colorScheme='green'>
                            {Math.round(score * 100)}% Match
                        </Badge>
                    </Box>
                </Box>
            </Center>
        );
    };
      
    useEffect(() => {
        if (capturedImage) {
            // Convert Data URL to Blob, then to File
            fetch(capturedImage)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], "captured-image.jpeg", { type: "image/jpeg" });
                    uploadImage(file, setResponse, setPage);
                })
                .catch(console.error);
        }
    }, [capturedImage]);
    
    return (
        <Center h="100vh">
            <VStack spacing={4} align="stretch">
                {/* <ClassificationDisplay classificationData={{label: 'compost', score: .9}} /> */}
                {response && response.status === 'idle' && page === "capture" ? (
                <>
                <Text fontSize="2xl" fontWeight="bold" textAlign="center">
                    Hi! Place your waste item in the red box.
                </Text>
                <Box display="flex" justifyContent="center" alignItems="center" w="full" h="auto" position="relative" p={8}>
                    {capturedImage ? (
                        <img src={capturedImage} alt="Captured frame" />
                    ) : (
                        <>
                            <video ref={videoRef} style={{ width: '640px', height: '480px' }} autoPlay playsInline muted />
                            <canvas ref={roiCanvasRef} style={{ position: 'absolute', width: '640px', height: '480px', zIndex: 1 }} />
                            <canvas ref={analysisCanvasRef} style={{ display: 'none' }} />
                        </>
                    )}
                </Box>
                </>
                ) : null}
                {page === "loading" && (
                    <Center>
                    <Spinner 
                        size='xl'
                        speed='0.65s'
                    />
                    </Center>
                )}
                {response && response.status === 'success' && response.data && page === "display" ? (
                    <ClassificationDisplay classificationData={response.data} />
                ) : null}
            </VStack>
        </Center>
    );
}