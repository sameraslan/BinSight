import cv2
import numpy as np
from ultralytics import YOLO
import time

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

# load yolov8
model = YOLO('yolov8n.pt')
cap = cv2.VideoCapture(0)

fps = int(cap.get(cv2.CAP_PROP_FPS))
total_frames_to_capture = fps * 5
frames_captured = 0

previous_bbox = None
stability_count = 0
stability_counts = {}
previous_bboxes = {}

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
                    cv2.imwrite(f"stable_frame_{object_name}.jpg", frame)
                    cap.release()
                    cv2.destroyAllWindows()
                    exit()  # terminate when stable frame detected

    cv2.imshow("Frame", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

    time.sleep(0.1) # 0.1 second delay => 10 fps
    frames_captured += 1

cap.release()
cv2.destroyAllWindows()
