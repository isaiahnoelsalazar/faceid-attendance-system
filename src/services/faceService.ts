import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

export const loadModels = async () => {
  console.log('Loading face-api models from:', MODEL_URL);
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    console.log('Face-api models loaded successfully');
  } catch (error) {
    console.error('Error loading face-api models:', error);
    throw error;
  }
};

export const getFaceDescriptor = async (videoElement: HTMLVideoElement) => {
  const detection = await faceapi
    .detectSingleFace(videoElement)
    .withFaceLandmarks()
    .withFaceDescriptor();
  
  return detection ? detection.descriptor : null;
};

export const compareFaces = (descriptor1: number[], descriptor2: number[]) => {
  const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
  return distance < 0.6; // Standard threshold
};
