'use client'

import React, { useRef } from "react";
import { Box, Center, VStack, Text, useTheme } from "@chakra-ui/react";
import { Camera } from "react-camera-pro";

export default function Home() {
    const camera = useRef(null);
    const theme = useTheme();
  
    // Custom error messages in case issue with webcam
    const errorMessages = {
      noCameraAccessible: "No camera device accessible. Please connect a camera.",
      permissionDenied: "Permission to access camera was denied.",
      switchCamera: "It is not possible to switch camera to different one because there is only one video device accessible.",
      canvas: "Canvas is not supported.",
    };
  
    // Bounding Box styles
    const boundingBoxStyles: React.CSSProperties = {
        position: "absolute",
        border: "2px solid red", // Set border width and color
        width: "70%", 
        height: "70%", 
        top: "50%", // Center vertically
        left: "50%", // Center horizontally
        transform: "translate(-50%, -50%)", 
        pointerEvents: "none", // Lets click events to pass through to the camera feed (might need for yolo somehow)
    };
  
    return (
        <Center h="100vh">
          <VStack spacing={4} w="60vw" align="stretch">
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
              p={4}
              borderRadius='xl'
            >
              <Camera ref={camera} errorMessages={errorMessages} aspectRatio={4 / 3} />
              {/* Overlays the bounding box */}
              <Box style={boundingBoxStyles} />
            </Box>
          </VStack>
        </Center>
      );
  }
