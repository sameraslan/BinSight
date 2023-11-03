import os
import argparse
import numpy as np
from matplotlib import pyplot as plt

import torch
from torch.autograd import Variable
from torch.utils.data.sampler import SubsetRandomSampler
import torchvision
import torchvision.transforms as transforms

from efficientnet_pytorch import EfficientNet

def get_random_images(data_dir, test_transforms, num=10):
    data = torchvision.datasets.ImageFolder(data_dir,
                                            transform=test_transforms)
    classes = data.classes
    indices = list(range(len(data)))
    np.random.shuffle(indices)
    idx = indices[:num]
    sampler = SubsetRandomSampler(idx)
    loader = torch.utils.data.DataLoader(data,
                                         sampler=sampler, batch_size=num)
    dataiter = iter(loader)
    images, labels = dataiter.next()
    return images, labels, classes


def predict_image(image, model, device):
    image_tensor = test_transforms(image).float().to(device)
    image_tensor = image_tensor.unsqueeze_(0)
    input_img = Variable(image_tensor)
    input_img = input_img.to(device)
    model.to(device)
    output = model(input_img)
    index = output.data.cpu().numpy().argmax()
    return index


def get_args_parser():
    parser = argparse.ArgumentParser(
        'Train and test network for classification task')
    parser.add_argument(
        '--data_img',
        help='path to base directory with data',
        default='/data/yucheng/AI_System/Dataset/WasteSorting/test')
    parser.add_argument('--out', help='path to result',
                        default='/data/yucheng/AI_System/Reference/detect-waste/classifier/lightning_logs/version_1/', type=str)
    parser.add_argument(
        '--model_name', default='efficientnet-b2', type=str,
        help='Name of model to train (default: "efficientnet-b0)"')
    parser.add_argument(
        '--num-classes', type=int, default=3, metavar='NUM',
        help='number of classes to classify (default: 7)')
    parser.add_argument(
        '--classes', type=list, 
        # default = ['Bio', 'Glass', 'Metals-and-plastics',
        #         'Non-recyclable', 'Paper']
        default = ['compost', 'recycle', 'trash']
        , 
        help='number of classes to classify (default: 7)')
    
    
    parser.add_argument(
        '--checkpoint',
        help='path to directory to the saved checkpoint',
        default='/data/yucheng/AI_System/Reference/detect-waste/classifier/lightning_logs/version_1/checkpoints/epoch=14_val_acc=0.8525.ckpt')
    
    parser.add_argument('--name', default='test.png',
                        help='path to save test images', type=str)
    parser.add_argument('--num', help='number of images to display',
                        default=5, type=int)
    parser.add_argument('--device', help='specify device to use',
                        default="cpu", type=str)
    
    
    return parser


if __name__ == '__main__':

    parser = get_args_parser()
    args = parser.parse_args()
    
    to_pil = transforms.ToPILImage()
    test_transforms = transforms.Compose([transforms.Resize((260, 260)),
                                            transforms.ToTensor(),
                                            ])
    model = EfficientNet.from_pretrained(
            args.model_name,
            num_classes=args.num_classes)
    checkpoint = torch.load(args.checkpoint)

    new_checkpoint = {}
    for k, v in checkpoint['state_dict'].items():
        new_checkpoint[k.replace('efficient_net.', '')] = v
    
    model.load_state_dict(new_checkpoint)
    model.eval()
    images, labels, gt_cl = get_random_images(args.data_img,
                                                test_transforms, args.num)
    fig = plt.figure(figsize=(10, 10))
    for ii in range(len(images)):
        image = to_pil(images[ii])
        index = predict_image(image, model, args.device)
        sub = fig.add_subplot(len(images), 1, ii + 1)
        res = int(labels[ii]) == index
        sub.set_title("GT: " + str(gt_cl[labels[ii]]) +
                        ", Pred: " + str(args.classes[index]))
        plt.axis('off')
        plt.imshow(image)
    plt.savefig(os.path.join(args.out, args.name))