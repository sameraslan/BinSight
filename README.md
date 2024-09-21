# BinSight 👁️♻️🗑️

BinSight is an AI-driven waste classification system aimed at promoting proper waste disposal and recycling. Using real-time visual recognition, the system classifies waste items and provides users with appropriate disposal instructions, making it easier for individuals to make informed recycling decisions. The system was deployed at Johns Hopkins University using Raspberry Pi hardware for on-site, real-time inference.

<div align="center">
   <img src="https://github.com/user-attachments/assets/751854a5-d900-4ca4-8644-9bdd9b3e6980" width="100%">
   <br>
</div>

Try out BinSight [here](https://bin-sight.vercel.app/).

## Installation

### 1. Clone the repository:
`git clone https://github.com/your-repo/BinSight.git cd BinSight`

### 2. Install required packages:
To install all necessary packages into your environment, run:
`pip install -r requirements.txt`

### 3. Setup the frontend:
Navigate to the frontend folder and install required dependencies:
`cd frontend npm install # if this is the first time running frontend`

To start the frontend:
`npm run dev`

### 4. Start the backend:
Ensure the Flask backend is running to handle classification requests:
`cd backend python app.py`

### 5. Deploy on Raspberry Pi (Optional):
BinSight is optimized for running on Raspberry Pi 4 for real-time waste classification. Once the backend and frontend are running, connect a camera to capture images of waste items and navigate to the deployed website to interact with the system in real-time.


## Project Overview

BinSight uses a vision-based Convolutional Neural Network (EfficientNet-B2) to classify waste items into categories such as trash, recycle, compost, and paper. The system features a user-friendly frontend for easy interaction, with visual feedback based on the classification confidence level. The system was deployed at Johns Hopkins University to assist with proper waste sorting on campus.

### Key Features:
- Real-time waste classification powered by EfficientNet-B2
- Lightweight, cost-effective setup using Raspberry Pi 4 for on-site deployment
- Simple, intuitive user interface built with Next.js and React
- Confidence-based classification feedback to guide users on uncertain classifications

### Technologies Used:
- **Machine Learning:** EfficientNet-B2 for waste classification, Yolo-v8 (for earlier versions)
- **Frontend:** Next.js, React, Chakra UI
- **Backend:** Flask API
- **Hardware:** Raspberry Pi 4, Raspberry Pi Camera 3
- **Datasets:** TACO, TrashNet, CompostNet, custom-curated dataset for local recycling rules

## System Pipeline

1. **Capture Waste Image**: The system uses a webcam or Raspberry Pi Camera to capture images of the waste item.
2. **Image Processing & Classification**: The captured image is processed by a Flask API, and the EfficientNet-B2 model predicts the appropriate bin category.
3. **Feedback**: The classification result is displayed on the frontend, guiding the user to the correct disposal bin. Confidence levels are indicated with messages to inform users of classification accuracy.
4. **Real-time Use**: The system resets after each classification, ready for the next user.

## User Evaluation

BinSight was evaluated through a user study conducted at Johns Hopkins University, comparing traditional bin labels with the BinSight system. Users found the system more informative and confidence-boosting for their waste disposal decisions, despite occasional latency issues that were addressed in later updates.

## Future Improvements

- Enhancing model performance by curating additional datasets for more accurate classification
- Implementing object detection for improved frame selection and faster processing
- Deploying motion sensors for energy efficiency and system activation only when necessary

Read our project paper [here](https://github.com/user-attachments/files/17085732/MLSD_FinalReport_BinSight.pdf)
