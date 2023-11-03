import os
import tqdm
import json
import shutil

# Load the COCO format annotation JSON file
with open('/data/yucheng/AI_System/Reference/detect-waste/annotations/annotations_detectwaste_train.json', 'r') as f:
    annotations = json.load(f)

# Create a dictionary to map category IDs to category names
categories = {}
for category in annotations['categories']:
    categories[category['id']] = category['supercategory']
# 
# Move images to new folders and rename them

image_id_to_category_id = {item['image_id']: item['category_id'] for item in annotations['annotations']}

for image in tqdm.tqdm(annotations['images']):
    
    category_name = categories[image_id_to_category_id[image['id']]]
    original_folder_name = os.path.basename(os.path.dirname(image['file_name']))
    new_folder_name = os.path.join('/data/yucheng/AI_System/Dataset/DetectWaste/train', category_name)
    os.makedirs(new_folder_name, exist_ok=True)
    new_file_name = os.path.join(new_folder_name, original_folder_name + '_' + os.path.basename(image['file_name']))
    shutil.copy('/data/yucheng/AI_System/Dataset/Reference/TACO/data/'+image['file_name'], new_file_name)
    image['file_name'] = new_file_name
