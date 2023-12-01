import cv2
import numpy as np
from ultralytics import YOLO
import time

OBJECT_NAMES = {
    0: 'person', 1: 'bicycle', 2: 'car', 3: 'motorcycle', 4: 'airplane', 5: 'bus', 
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
    76: 'scissors', 77: 'teddy bear', 78: 'hair drier', 79: 'toothbrush'
}

# items not considered as trash
NOT_TRASH_CLASS_IDS = {
    # 'person': [0],
    'vehicles': [1, 2, 3, 4, 5, 6, 7, 8],
    'street_objects': [9, 10, 11, 12, 13],
    'animals': [14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
    'clothing': [24, 26, 27, 28],
    'electronics': [62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72],
    'large_items': [38, 56, 57, 58, 59, 60, 61]
}

NOT_TRASH_CLASS_IDS_FLAT = [item for sublist in NOT_TRASH_CLASS_IDS.values() for item in sublist]
TRASH_CLASS_IDS = [id for id, _ in OBJECT_NAMES.items() if id not in NOT_TRASH_CLASS_IDS_FLAT]
print(TRASH_CLASS_IDS)

def detect_trash():
    model = YOLO('yolov8n.pt')
    cap = cv2.VideoCapture(1)

    # Attempt to grab a frame to get video properties
    ret, frame = cap.read()
    if not ret:
        print("Failed to capture video.")
        cap.release()
        return None, None, None
    height, width = frame.shape[:2]

    # Calculate ROI dimensions for 1/4 of the frame area
    roi_area = (width * height) / 4
    roi_width = int(np.sqrt(roi_area * (width / height)))
    roi_height = int(roi_width * (height / width))

    # Calculate the top-left corner of the ROI
    roi_x1 = (width - roi_width) // 2
    roi_y1 = (height - roi_height) // 2
    roi_x2 = roi_x1 + roi_width
    roi_y2 = roi_y1 + roi_height

    roi_factor = 1/4

    fps = int(cap.get(cv2.CAP_PROP_FPS))
    total_frames_to_capture = fps * 5
    frames_captured = 0

    stability_counts = {}
    previous_bboxes = {}

    saved_frame_path = None

    # Dynamic stability threshold based on the size of the ROI
    distance_threshold = np.sqrt(roi_area) * 0.1

    while frames_captured < total_frames_to_capture:
        ret, frame = cap.read()
        if not ret:
            break

        # Highlight the ROI on the frame
        cv2.rectangle(frame, (roi_x1, roi_y1), (roi_x2, roi_y2), (255, 0, 0), 2)

        # Process only the ROI
        roi_frame = frame[roi_y1:roi_y2, roi_x1:roi_x2]
        results = model(roi_frame)

        if results and len(results) > 0:
            boxes = results[0].boxes.xyxy.cpu()
            confs = results[0].boxes.conf.cpu()
            clss = results[0].boxes.cls.cpu()

            for box, conf, cls in zip(boxes, confs, clss):
                cls_idx = int(cls)
                if cls_idx in TRASH_CLASS_IDS and conf > 0.5:
                    # Translate box coordinates to full frame
                    x1, y1, x2, y2 = map(int, box)
                    x1 += roi_x1
                    y1 += roi_y1
                    x2 += roi_x1
                    y2 += roi_y1

                    bbox_area = (x2 - x1) * (y2 - y1)
                    roi_area = (roi_x2 - roi_x1) * (roi_y2 - roi_y1)
                    if bbox_area < roi_area * roi_factor:  # Check if bbox takes up quarter of the ROI
                        continue  # Skip this object as it doesn't meet the size requirement

                    current_bbox = [x1, y1, x2, y2]
                    if cls_idx in previous_bboxes:
                        dist = np.linalg.norm(np.array(previous_bboxes[cls_idx]) - np.array(current_bbox))
                        if dist < distance_threshold:
                            stability_counts[cls_idx] = stability_counts.get(cls_idx, 0) + 1
                    else:
                        stability_counts[cls_idx] = 0

                    previous_bboxes[cls_idx] = current_bbox

                    if stability_counts.get(cls_idx, 0) > 5:
                        object_name = OBJECT_NAMES[cls_idx]
                        # Save the ROI part of the frame where the object was detected
                        cropped_frame = frame[y1:y2, x1:x2]
                        saved_frame_path = f"./test_images/stable_frame_{object_name}.jpg"
                        cv2.imwrite(saved_frame_path, cropped_frame)
                        cap.release()
                        cv2.destroyAllWindows()
                        return saved_frame_path, cropped_frame, object_name

        # Show the frame with the ROI highlighted
        cv2.imshow("Frame", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

        frames_captured += 1

    cap.release()
    cv2.destroyAllWindows()
    return saved_frame_path, None, None

if __name__ == '__main__':
    saved_frame_path, cropped_frame, object_name = detect_trash()
    if saved_frame_path:
        print("Saved frame path:", saved_frame_path)
        cv2.imshow("Cropped frame", cropped_frame)
        cv2.waitKey(0)
        cv2.destroyAllWindows()
    else:
        print("No stable trash object detected.")
