'use client'

import React, { useRef, useState, useEffect } from "react";
import { Box, Center, VStack, Text, useTheme } from "@chakra-ui/react";
import { Camera } from "react-camera-pro";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import { non_max_suppression } from "./nonMaxSuppression";
import { renderBoxes } from "./renderBox";

export default function Home() {
  const camera = useRef(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();
  const [model, setModel] = useState<tf.GraphModel | null>(null);

  // Custom error messages in case issue with webcam
  const errorMessages = {
    noCameraAccessible: "No camera device accessible. Please connect a camera.",
    permissionDenied: "Permission to access camera was denied.",
    switchCamera: "It is not possible to switch camera to different one because there is only one video device accessible.",
    canvas: "Canvas is not supported.",
  };

  const threshold = 0.5; // Set threshold for confidence score
  const modelName = "yolov7";

  // Load the model
  useEffect(() => {
    tf.loadGraphModel(`/models/${modelName}_web_model/model.json`)
      .then((loadedModel) => {
        setModel(loadedModel);
        // Can add a warm-up here if needed
      })
      .catch((error) => console.error(error));
  }, []);

  // The detection function
  const detectFrame = async () => {
    if (camera.current && model) {
      const video = camera.current.video;
      const model_dim = [640, 640]; // Adjust for model input size
      tf.engine().startScope();
      
      // Prepare the input tensor
      const input = tf.tidy(() => {
        return tf.image
          .resizeBilinear(tf.browser.fromPixels(video), model_dim)
          .div(255.0)
          .expandDims(0);
      });

      // Run the model
      const res = await model.executeAsync(input);
      const detections = non_max_suppression(res.arraySync()[0]);
      renderBoxes(canvasRef.current, threshold, detections);

      tf.dispose(res);
      tf.engine().endScope();
      requestAnimationFrame(detectFrame); // Continue the loop
    }
  };

  // Start the detection loop when the model is loaded
  useEffect(() => {
    if (model) {
      detectFrame();
    }
  }, [model]);

  // Bounding Box styles
  const boundingBoxStyles: React.CSSProperties = {
    position: "absolute",
    border: "2px solid red",
    width: "70%",
    height: "70%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
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
          {/* Canvas for rendering the boxes */}
          <canvas ref={canvasRef} style={{ position: 'absolute' }} />
        </Box>
      </VStack>
    </Center>
  );
}

