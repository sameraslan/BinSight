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

    // Function to detect objects in each frame
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
    
            // Calculate padding
            const padWidth = (model_dim[1] - model_dim[0]) / 2;
            const padding = [[0, 0], [padWidth, padWidth], [0, 0]];
    
            // Pad the image to make it square
            let paddedImg = img.pad(padding, 0); // Pad with zeros (black)
    
            paddedImg = paddedImg.div(255.0)
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

            renderBoxes(canvasRef, 0.80, boxes, scores, classes);
            tf.dispose(res);
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
                    ) : null}
                    <video ref={videoRef} style={{ width: '640px', height: '480px' }} autoPlay playsInline muted />
                    <canvas ref={canvasRef} style={{ position: 'absolute', width: '640px', height: '480px' }} />
                </Box>
            </VStack>
        </Center>
    );
}
