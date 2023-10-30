import os

def rename_folders(path):
    for foldername in os.listdir(path):
        newname = foldername.replace(" ", "_")
        os.rename(os.path.join(path, foldername), os.path.join(path, newname))

# Example usage:
rename_folders("/data/yucheng/AI_System/BinSight/utils/")
