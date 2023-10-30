import os
import argparse
from PIL import Image, ImageTk
import torch
from torch.autograd import Variable
import torchvision.transforms as transforms
from efficientnet_pytorch import EfficientNet
import tkinter as tk
from tkinter import Label, PhotoImage

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

def display_result(input_image, predicted_class, confidence):
    root = tk.Tk()
    root.title("Prediction Result")

    # Load the image
    pil_image = Image.open(input_image)
    
    # Resize the image to fit the window
    max_size = (800, 600)
    pil_image.thumbnail(max_size, Image.Resampling.LANCZOS)
    img = ImageTk.PhotoImage(pil_image)
    img_label = Label(root, image=img)
    img_label.pack(padx=20, pady=20)

    # Adding result below the image
    result_label = Label(root, text=f"Predicted Class: {predicted_class}\nConfidence: {confidence:.2f}", padx=10, pady=10)
    result_label.pack(pady=20)

    # Quit button
    quit_button = tk.Button(root, text="Quit", command=root.quit)
    quit_button.pack(pady=20)

    root.mainloop()

def get_args_parser():
    parser = argparse.ArgumentParser(
        'Predict class for given image using trained network')
    parser.add_argument(
        '--input_image',
        help='path to the input image',
        required=True)
    parser.add_argument(
        '--model_name', default='efficientnet-b2', type=str,
        help='Name of model to use (default: "efficientnet-b2")')
    parser.add_argument(
        '--num-classes', type=int, default=5, metavar='NUM',
        help='number of classes to classify (default: 5)')
    parser.add_argument(
        '--checkpoint',
        help='path to directory to the saved checkpoint',
        default='./classifier/lightning_logs/version_0/checkpoints/effnet.ckpt')
    parser.add_argument('--device', help='specify device to use',
                        default="cpu", type=str)
    return parser

if __name__ == '__main__':
    args = get_args_parser().parse_args()
    test_transforms = transforms.Compose([transforms.Resize((260, 260)), transforms.ToTensor()])
    model = load_model(args.model_name, args.num_classes, args.checkpoint)
    image = Image.open(args.input_image)
    index, confidence = predict_image(image, model, args.device)
    classes = ['Bio', 'Glass', 'Metals-and-plastics', 'Non-recyclable', 'Paper']
    predicted_class = classes[index]
    display_result(args.input_image, predicted_class, confidence)
