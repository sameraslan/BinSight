import os
import tqdm
import csv
import shutil

# Load the COCO format annotation JSON file
image_dict = {}
with open('/data/yucheng/AI_System/Dataset/Reference/v4/validation_annotations.csv', newline='') as csvfile:
    spamreader = csv.reader(csvfile, delimiter=',', quotechar='|')
    for row in spamreader:
        image_dict[row[1].split('/')[-1]] = row[2]

for image_name, category_name in tqdm.tqdm(image_dict.items()):
    
    new_folder_name = os.path.join('/data/yucheng/AI_System/Dataset/WasteSorting/val', category_name)
    os.makedirs(new_folder_name, exist_ok=True)
    shutil.copy('/data/yucheng/AI_System/Dataset/Reference/v4/valid/'+image_name, new_folder_name)
    