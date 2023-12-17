'use client';
import React, { useRef, useState, useEffect } from 'react';
import { Box, Center, Image, VStack, Heading, Badge, Text, Spinner, Skeleton, useToast, useTheme } from '@chakra-ui/react';
import uploadImage from 'src/services/upload';
import { useRouter } from 'next/navigation';
import { 
    MdCompost, MdDescription, MdDelete 
  } from 'react-icons/md';
import { FaRecycle } from "react-icons/fa";

interface ClassificationData {
    label: string;
    score: number;
}

const icons: { [key in string]: JSX.Element } = {
    compost: <MdCompost style={{ fontSize: '20em', color:'#1A365D' }} />,
    paper: <MdDescription style={{ fontSize: '20em', color:'#1A365D' }} />,
    recycle: <FaRecycle style={{ fontSize: '20em', color:'#1A365D' }} />,
    trash: <MdDelete style={{ fontSize: '20em', color:'#1A365D' }} />
};

export default function Home() {
    let previousFrameData: ImageData | null = null;
    let stableDuration = 0;
    const videoRef = useRef<HTMLVideoElement>(null);
    const roiCanvasRef = useRef<HTMLCanvasElement>(null);
    const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
    const intervalIdRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const stabilityThreshold: number = 25;
    const stabilityDurationRequired: number = 1500;
    const checkInterval: number = 500;
    const toast = useToast();
    const [videoLoaded, setVideoLoaded] = useState<boolean>(false);
    const [page, setPage] = useState("capture");
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [response, setResponse] = useState({ status: 'idle', data: null });
    const router = useRouter();
    const theme = useTheme();


    const handleLogoClick = () => {
        router.push('/');
    };

    useEffect(() => {
        if (response && response.status === 'success' && page === "display") {
            // Reset previousFrameData (may have been the cause of buffering issues?)
            previousFrameData = null;

            const timeoutId = setTimeout(() => {
                setPage("capture");
                setResponse({ status: 'idle', data: null })
                setCapturedImage(null);
            }, 7500);

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
            if (videoElement && videoElement.readyState === 4) {
                captureAndCompareFrame();
                if (stableDuration >= stabilityDurationRequired) {
                    setPage("loading")
                    setVideoLoaded(false);
                    captureCurrentFrame();
                    clearInterval(intervalIdRef.current);
                }
            }
        }, checkInterval);

        return () => {
            clearInterval(intervalIdRef.current);
            if (videoElement && videoElement.srcObject instanceof MediaStream) {
                videoElement.srcObject.getTracks().forEach(track => track.stop());
            }
            videoElement && videoElement.removeEventListener('loadedmetadata', setupVideoAndCanvas);
        };
    }, [page]);

    const drawROI = () => {
        const roiCanvasElement = roiCanvasRef.current;
        const videoElement = videoRef.current;
        if (roiCanvasElement && videoElement) {
            setVideoLoaded(true);
            const ctx = roiCanvasElement.getContext('2d');
            const roiSize = 0.7;
            const roiWidth = videoElement.videoWidth * roiSize;
            const roiHeight = videoElement.videoHeight * roiSize;
            const roiX = (videoElement.videoWidth - roiWidth) / 2;
            const roiY = (videoElement.videoHeight - roiHeight) / 2;

            const borderRadius = 5; // You can adjust this value for desired corner roundness

            if (ctx) {
                ctx.clearRect(0, 0, roiCanvasElement.width, roiCanvasElement.height);
                ctx.strokeStyle = '#90CDF4';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(roiX + borderRadius, roiY);
                ctx.lineTo(roiX + roiWidth - borderRadius, roiY);
                ctx.arcTo(roiX + roiWidth, roiY, roiX + roiWidth, roiY + borderRadius, borderRadius);
                ctx.lineTo(roiX + roiWidth, roiY + roiHeight - borderRadius);
                ctx.arcTo(roiX + roiWidth, roiY + roiHeight, roiX + roiWidth - borderRadius, roiY + roiHeight, borderRadius);
                ctx.lineTo(roiX + borderRadius, roiY + roiHeight);
                ctx.arcTo(roiX, roiY + roiHeight, roiX, roiY + roiHeight - borderRadius, borderRadius);
                ctx.lineTo(roiX, roiY + borderRadius);
                ctx.arcTo(roiX, roiY, roiX + borderRadius, roiY, borderRadius);
                ctx.stroke();
            }
        }
    };

    const captureAndCompareFrame = () => {
        const videoElement = videoRef.current;
        const analysisCanvasElement = analysisCanvasRef.current;

        if (videoElement && analysisCanvasElement) {
            const context = analysisCanvasElement.getContext('2d');
            const width = videoElement.videoWidth;
            const height = videoElement.videoHeight;

            context && context.drawImage(videoElement, 0, 0, width, height);
            const currentFrameData = context && context.getImageData(0, 0, width, height);

            if (previousFrameData && currentFrameData) {
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

    const messages = {
        idle: "Ready for eco-action! Position your item in the red box when you're ready.",
        lowConfidence: "Almost there! Try adjusting the item's position or lighting for a clearer view. Remember: when in doubt, trash it.",
        recycle: {
            medium: "Looks like a recyclable item. Check for recycling symbols and numbers!",
            high: "Nicely done! This looks recyclable.",
            note: "Tip: Clean and dry items before recycling. Look for symbols like PET (1) or HDPE (2) for proper sorting."
        },
        trash: {
            medium: "This might be trash. Double-check, especially for hard-to-recycle plastics.",
            high: "Nice! This belongs in the trash.",
            note: "Remember: Some plastics are not recyclable. For instance, 'PS' (Polystyrene) should go to trash."
        },
        compost: {
            medium: "Seems compostable. Ensure if it's organic matter like food scraps.",
            high: "Great! It's suitable for composting.",
            note: "Compost enriches soil. Include food waste and biodegradable products, but avoid plastics."
        },
        paper: {
            medium: "This appears to be paper. Verify if it's recyclable like newspapers or cardboard.",
            high: "Right on! It's a paper item.",
            note: "Recycling tip: Keep paper clean and dry. Newspapers, magazines, and cardboard are usually recyclable."
        }
    };

    type MessageLabel = keyof typeof messages;
    const generateInformativeMessage = (label: string, score: number): { main: string, note: string } => {
        if (label in messages) {
            const message = messages[label as MessageLabel];
    
            // Check if message is an object with medium, high, and note properties
            if (typeof message === 'object') {
                // When label points to an object with medium, high, and note properties.
                if (score < 0.6) {
                    return { main: messages.lowConfidence, note: '' };
                } else if (score >= 0.6 && score < 0.8) {
                    return { main: message.medium, note: '' };
                } else {
                    return { main: message.high, note: message.note };
                }
            } else {
                // For 'idle' and 'lowConfidence', which are strings
                return { main: message as string, note: '' };
            }
        } else {
            // Handle the case where label is not a valid key
            // Return a default message or handle the error as needed
            return { main: '', note: '' };
        }
    };

    const frameDifference = (currentFrame: ImageData, previousFrame: ImageData) => {
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
            tempCtx && tempCtx.drawImage(videoElement, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);
    
            // Convert the drawn ROI to an image URL
            const imageDataUrl = tempCanvas.toDataURL('image/jpeg');
    
            // Update the state with the captured image
            setCapturedImage(imageDataUrl);
            clearInterval(intervalIdRef.current); // Clear interval after capturing frame
        } else {
            console.error('Video element is not ready for capturing frames.');
        }
    };
    
    const ClassificationDisplay: React.FC<{ classificationData: ClassificationData, capturedImageUrl?: string }> = ({ classificationData, capturedImageUrl }) => {
        const {label, score} = classificationData;
        const message = generateInformativeMessage(label, score);

        return (
            <Center>
                <Box maxW='3xl' maxH='3xl' borderWidth='1px' borderRadius='lg' overflow='hidden' textAlign='center'>
                    <Center bg='gray.100' p='4'>
                        {icons[label]}
                    </Center>
                    {capturedImageUrl ? (
                        <Image 
                            src={capturedImageUrl}
                            alt="Captured item"
                            objectFit="contain"
                            maxH="300px" // Adjust size
                            p='4'
                        />
                    ): null}
                    <Box p='6'>
                        <Heading color='blue.900' size='4xl'>{label.toUpperCase()}</Heading>
                        <Text color='blue.900' mt='3' fontSize='4xl'>{message.main ? message.main : ''}</Text>
                        {message.note && <Text color='blue.900' mt='2' fontSize='4xl' fontStyle='italic'>{message.note}</Text>}
                    </Box>
                </Box>
            </Center>
        );
    };
      
    useEffect(() => {
        if (capturedImage) {
            // Convert Data URL to Blob, then to File
            fetch(capturedImage as RequestInfo)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], "captured-image.jpeg", { type: "image/jpeg" });
                    uploadImage(file, setResponse, setPage);
                })
                .catch(console.error);
        }
    }, [capturedImage]);
    
    return (
        <Box position="relative" h="100vh">
            <Box 
                position="absolute" 
                top={0} 
                left={0} 
                p={4} 
                onClick={handleLogoClick} 
                cursor="pointer"
                width={{ base: '6rem', sm: '6rem', md: '8rem', lg: '10rem', xl: '12rem' }}
            >
                <Image
                    src="/binsightlogo.png"
                    objectFit="contain"
                    alt="Binsight Logo"
                    // fallback={<Skeleton 
                    //     startColor="blue.400" 
                    //     endColor="blue.900" 
                    //     fadeDuration={0} 
                    //     width={{ base: '6rem', sm: '6rem', md: '8rem', lg: '10rem', xl: '12rem' }}
                    //     height={{ base: '6rem', sm: '6rem', md: '8rem', lg: '10rem', xl: '12rem' }}
                    //     borderRadius="10px"
                    // />}
                />
            </Box>
            <Center h="100vh">
                <VStack spacing={4} align="stretch">
                    {response && response.status === 'idle' && page === "capture" ? (
                    <>
                    <Text color="blue.900" fontSize="4xl" fontWeight="bold" textAlign="center">
                        Ready for eco-action! Position your item in the light blue box when you&apos;re set.
                    </Text>
                    <Box display="flex" justifyContent="center" alignItems="center" w="full" h="auto" position="relative" p={8}>
                        {capturedImage ? (
                            <img src={capturedImage} alt="Captured frame" />
                        ) : (
                            <>
                                {!videoLoaded && (
                                    <Skeleton 
                                    startColor="blue.400" 
                                    endColor="blue.900" 
                                    fadeDuration={0} 
                                    w="640px" 
                                    h="480px" 
                                    borderRadius="10px"
                                />
                                )}
                                <video
                                    ref={videoRef}
                                    style={{ 
                                        width: '640px', 
                                        height: '480px', 
                                        display: videoLoaded ? 'block' : 'none',
                                        borderRadius: '10px',
                                        zIndex: 1
                                    }}
                                    autoPlay
                                    playsInline
                                    muted
                                />
                                <canvas 
                                    ref={roiCanvasRef} 
                                    style={{ 
                                        position: 'absolute', 
                                        zIndex: 1, 
                                        borderRadius: '10px',
                                    }} 
                                />
                                <canvas ref={analysisCanvasRef} style={{ display: 'none' }} />
                                {videoLoaded && (
                                <Box 
                                    position="absolute"
                                    zIndex={0} 
                                    width="650px" 
                                    height="490px" 
                                    bgColor="blue.500" 
                                    borderRadius="12px" 
                                    top="50%" 
                                    left="50%" 
                                    transform="translate(-50%, -50%)"
                                />)}
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
                        <ClassificationDisplay 
                            classificationData={response.data} 
                            capturedImageUrl={capturedImage} 
                        />
                    ) : null}
                </VStack>
            </Center>
        </Box>
    );
}