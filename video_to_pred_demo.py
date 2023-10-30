import cv2
import numpy as np
from ultralytics import YOLO
import time
import os
from PIL import Image, ImageTk
import torch
from torch.autograd import Variable
import torchvision.transforms as transforms
from efficientnet_pytorch import EfficientNet
from PyQt5.QtWidgets import QApplication, QLabel, QVBoxLayout, QPushButton, QWidget
from PyQt5.QtGui import QPixmap, QImage
from PyQt5.QtCore import Qt


# Constants
OBJECT_NAMES = {0: 'person', 1: 'bicycle', 2: 'car', 3: 'motorcycle', 4: 'airplane', 5: 'bus', 
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
                76: 'scissors', 77: 'teddy bear', 78: 'hair drier', 79: 'toothbrush'}

'''
Considering these as "trash" when calculating stability (mainly as an approximation for now):
'bottle'
'wine glass'
'cup'
'fork'
'knife'
'spoon'
'banana'
'apple'
'sandwich'
'orange'
'broccoli'
'carrot'
'hot dog'
'pizza'
'donut'
'cake'
'book'
'vase'
'toothbrush'
'''

TRASH_CLASS_IDS = [39, 40, 41, 42, 43, 44, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 73, 75, 79]

def detect_trash():
    model = YOLO('yolov8n.pt')
    cap = cv2.VideoCapture(1)
    
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    total_frames_to_capture = fps * 5
    frames_captured = 0

    stability_counts = {}
    previous_bboxes = {}

    saved_frame_path = None
    while frames_captured < total_frames_to_capture:
        ret, frame = cap.read()
        if not ret:
            break

        # run inference on frame
        results = model(frame)

        # extract bboxes, confs, and classes
        if results and len(results) > 0:
            boxes = results[0].boxes.xyxy.cpu()
            confs = results[0].boxes.conf.cpu()
            clss = results[0].boxes.cls.cpu()

            for box, conf, cls in zip(boxes, confs, clss):
                cls_idx = int(cls)
                print("Predicted class:", cls_idx, " with confidence:", conf)
                if cls_idx in TRASH_CLASS_IDS and conf > 0.5:
                    print("Predicted trash class:", cls, " with confidence:", conf)
                    x1, y1, x2, y2 = map(int, box)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    
                    current_bbox = [x1, y1, x2, y2]
                    if cls_idx in previous_bboxes:
                        dist = np.linalg.norm(np.array(previous_bboxes[cls_idx]) - np.array(current_bbox))
                        if dist < 50: 
                            stability_counts[cls_idx] = stability_counts.get(cls_idx, 0) + 1
                    else:
                        stability_counts[cls_idx] = 0
                    
                    previous_bboxes[cls_idx] = current_bbox

                    if stability_counts.get(cls_idx, 0) > 5:
                        object_name = OBJECT_NAMES[cls_idx]
                        cropped_frame = frame[y1:y2, x1:x2]  # Crop the image to the bounding box
                        saved_frame_path = f"./test_images/stable_frame_{object_name}.jpg"
                        cv2.imwrite(saved_frame_path, cropped_frame)
                        cap.release()
                        cv2.destroyAllWindows()
                        return saved_frame_path, cropped_frame, object_name  # Return path of saved frame
        
        cv2.imshow("Frame", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

        frames_captured += 1

    cap.release()
    cv2.destroyAllWindows()
    return saved_frame_path, None, None

def load_model(model_name, num_classes, checkpoint_path):
    model = EfficientNet.from_pretrained(model_name, num_classes=num_classes)
    checkpoint = torch.load(checkpoint_path, map_location=torch.device('cpu'))
    new_checkpoint = {}
    for k, v in checkpoint['state_dict'].items():
        new_checkpoint[k.replace('efficient_net.', '')] = v
    model.load_state_dict(new_checkpoint)
    model.eval()
    return model

def predict_image(image, model, device):
    test_transforms = transforms.Compose([transforms.Resize((260, 260)), transforms.ToTensor()])
    image_tensor = test_transforms(image).float().to(device)
    image_tensor = image_tensor.unsqueeze_(0)
    input_img = Variable(image_tensor)
    input_img = input_img.to(device)
    model.to(device)
    output = model(input_img)
    prob = torch.nn.functional.softmax(output, dim=1)
    index = output.data.cpu().numpy().argmax()
    confidence = prob[0][index].item()
    return index, confidence

def display_result(cropped_frame, predicted_class, object_name, confidence):
    app = QApplication([])
    
    # Convert the OpenCV image format (BGR) to QImage (RGB)
    cropped_frame_rgb = cv2.cvtColor(cropped_frame, cv2.COLOR_BGR2RGB)
    height, width, channel = cropped_frame_rgb.shape
    bytesPerLine = 3 * width
    q_img = QImage(cropped_frame_rgb.data, width, height, bytesPerLine, QImage.Format_RGB888)
    pixmap = QPixmap.fromImage(q_img)

    # Create the main window
    window = QWidget()
    window.setWindowTitle("Prediction Result")
    layout = QVBoxLayout()

    # Add the image
    img_label = QLabel()
    img_label.setPixmap(pixmap)
    layout.addWidget(img_label)

    # Adding result below the image
    result_label = QLabel(f"Predicted Trash Class: {predicted_class}\nPredicted Object: {object_name}")
    layout.addWidget(result_label)

    # Quit button
    quit_button = QPushButton("Quit")
    quit_button.clicked.connect(app.exit)
    layout.addWidget(quit_button)

    window.setLayout(layout)
    window.show()
    
    app.exec_()

def predict_and_display(model, cropped_frame, object_name, device="cpu"):
    image = Image.fromarray(cv2.cvtColor(cropped_frame, cv2.COLOR_BGR2RGB))
    index, confidence = predict_image(image, model, device)
    classes = ['Bio', 'Glass', 'Metals and Plastics', 'Non-recyclable', 'Paper']
    predicted_class = classes[index]
    # Convert the cropped frame to a temporary file path for display
    temp_path = "./test_images/temp_cropped_frame.jpg"
    cv2.imwrite(temp_path, cropped_frame)
    display_result(cropped_frame, predicted_class, object_name, confidence)

if __name__ == '__main__':
    model = load_model(model_name='efficientnet-b2', num_classes=5, checkpoint_path='./classifier/lightning_logs/version_0/checkpoints/effnet.ckpt')
    detected_frame_path, detected_cropped_frame, object_name = detect_trash()
    if detected_frame_path:
        predict_and_display(model, detected_cropped_frame, object_name, device="cpu")
