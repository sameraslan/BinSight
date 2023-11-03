import os, glob
import tqdm
import json
import shutil

# Load the COCO format annotation JSON file
with open('/data/yucheng/AI_System/Dataset/Reference/trashnet/data/one-indexed-files-notrash_train.txt', 'r') as f:
    train_images = f.readlines()
    train_images_name = [i.split(' ')[0].strip() for i in train_images]

with open('/data/yucheng/AI_System/Dataset/Reference/trashnet/data/one-indexed-files-notrash_val.txt', 'r') as f:
    val_images = f.readlines()
    val_images_name = [i.split(' ')[0].strip() for i in val_images]

with open('/data/yucheng/AI_System/Dataset/Reference/trashnet/data/one-indexed-files-notrash_test.txt', 'r') as f:
    test_images = f.readlines()
    test_images_name = [i.split(' ')[0].strip() for i in test_images]
import ipdb; ipdb.set_trace()
categories = ['cardboard', 'glass', 'metal', 'paper', 'plastic', 'trash']

# Move images to new folders and rename them
all_images = glob.glob('/data/yucheng/AI_System/Dataset/Reference/trashnet/data/dataset-resized/*/*.jpg')
for image in tqdm.tqdm(all_images):
    category_name = image.split('/')[-2].strip()
    image_name = image.split('/')[-1].strip()

    if image_name in train_images_name:
        subset = 'train'
    elif image_name in val_images_name:
        subset = 'val'
    elif image_name in test_images_name:
        subset = 'test'
    else:
        raise ValueError('Image not found in any subset')
    
    new_folder_name = os.path.join('/data/yucheng/AI_System/Dataset/TrashNet', subset, category_name)
    os.makedirs(new_folder_name, exist_ok=True)
    new_file_name = os.path.join(new_folder_name, image_name)

    shutil.copy('/data/yucheng/AI_System/Dataset/Reference/trashnet/data/dataset-resized/'+category_name+'/'+image_name, new_file_name)
