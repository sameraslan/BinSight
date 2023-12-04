import argparse
from PIL import Image
from flask import Flask, request, jsonify
import albumentations as A
from albumentations.pytorch.transforms import ToTensorV2
import numpy as np

import torch
from torchvision import transforms
from torch.autograd import Variable


from efficientnet_pytorch import EfficientNet
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.app_context().push()

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

def get_args_parser():
    parser = argparse.ArgumentParser(
        'Train and test network for classification task')
    parser.add_argument(
        '--model_name', default='efficientnet-b2', type=str,
        help='Name of model to train (default: "efficientnet-b0)"')
    parser.add_argument(
        '--num-classes', type=int, default=4, metavar='NUM',
        help='number of classes to classify (default: 7)')
    parser.add_argument(
        '--classes', type=list, 
        default = ['compost', 'paper', 'recycle', 'trash'], 
        help='number of classes to classify (default: 7)')
    parser.add_argument(
        '--checkpoint',
        help='path to directory to the saved checkpoint',
        default='./lightning_logs/version_2/checkpoints/epoch=14_val_acc=0.8923.ckpt')
    
    parser.add_argument('--device', help='specify device to use',
                        default="cpu", type=str)
    
    
    return parser


@app.route('/predict', methods=['POST'])
def predict():
    try:
        file = request.files['file']
        img = Image.open(file)
        
        index, confidence = predict_image(img, model, args.device)
        class_name = args.classes[index]

        result = {'label': class_name, 'score': float(confidence)}
        print(result)
        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)})

def get_augmentation(transform):
    return lambda img: transform(image=np.array(img))


if __name__ == '__main__':
    parser = get_args_parser()
    args = parser.parse_args()

    model = EfficientNet.from_pretrained(
                args.model_name,
                num_classes=args.num_classes)
    checkpoint = torch.load(args.checkpoint, map_location=args.device)
    new_checkpoint = {}
    for k, v in checkpoint['state_dict'].items():
        new_checkpoint[k.replace('efficient_net.', '')] = v

    model.load_state_dict(new_checkpoint)
    model.eval()
    model.to(args.device)

    test_transforms = transforms.Compose([transforms.Resize((260, 260)),
                                            transforms.ToTensor(),
                                            ])
    
    to_pil = transforms.ToPILImage()
    
    # file = 'test_recycle_1.jpg'
    # file = 'test_paper_2.jpg'
    # img = Image.open(file)  # PIL image
    
    # index, confidence = predict_image(img, model, args.device)
    # print(args.classes[index], confidence)

    app.run(debug=True, port=1117)
