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

    // Generating conditional messages
    const generateInformativeMessage = (label, score) => {
        const messages = {
            idle: "Ready for eco-action! Position your item when you're set.",
            lowConfidence: "Almost there! Try adjusting the item's position or lighting for a clearer view.",
            recycle: {
                medium: "Looks like a recyclable item. Check for recycling symbols and numbers!",
                high: "Nicely done! This looks recyclable.",
                note: "Tip: Clean and dry items before recycling. Look for symbols like PET (1) or HDPE (2) for proper sorting."
            },
            trash: {
                medium: "This might be trash. Double-check, especially for hard-to-recycle plastics.",
                high: "Correct! This belongs in the trash.",
                note: "Remember: Not all plastics are recyclable. For instance, 'PS' (Polystyrene) should go to trash."
            },
            compost: {
                medium: "Seems compostable. Ensure it's organic matter like food scraps.",
                high: "Great! It's suitable for composting.",
                note: "Compost enriches soil. Include food waste and biodegradable products, but avoid plastics."
            },
            paper: {
                medium: "This appears to be paper. Verify if it's recyclable like newspapers or cardboard.",
                high: "Right on! It's a paper item.",
                note: "Recycling tip: Keep paper clean and dry. Newspapers, magazines, and cardboard are usually recyclable."
            }
        };

        if (score < 0.5) return messages.lowConfidence;
        if (score >= 0.5 && score < 0.7) return messages[label].medium;
        if (score >= 0.7) return { main: messages[label].high, note: messages[label].note };
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
        const message = generateInformativeMessage(label, score);
        const isHighConfidence = score >= 0.7;
        const icons = { /* ... as before ... */ };
    
        return (
            <Center>
                <Box maxW='lg' borderWidth='1px' borderRadius='lg' overflow='hidden' textAlign='center'>
                    <Center bg='gray.100' p='4'>
                        {icons[label]}
                    </Center>
                    <Box p='6'>
                        <Heading size='xl'>{label.toUpperCase()}</Heading>
                        <Badge mt='1' fontSize='2em' colorScheme='green'>
                            {Math.round(score * 100)}% Match
                        </Badge>
                        <Text mt='3' fontSize='lg'>{isHighConfidence ? message.main : message}</Text>
                        {isHighConfidence && <Text mt='2' fontSize='md' fontStyle='italic'>{message.note}</Text>}
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
                {response && response.status === 'idle' && page === "capture" ? (
                <>
                <Text fontSize="2xl" fontWeight="bold" textAlign="center">
                    Ready for eco-action! Position your item when you're set.
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