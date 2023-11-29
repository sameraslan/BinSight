import requests
from PIL import Image

import requests
from io import BytesIO
from PIL import Image

image_path = '/data/yucheng/AI_System/BinSight/classifier/test.jpg'
image = Image.open(image_path)

image_io = BytesIO()
image.save(image_io, format='JPEG')
image_io.seek(0)

url = 'http://127.0.0.1:5000/predict'
# url = 'http://10.203.124.128:5000/predict'
files = {'file': ('image.jpg', image_io, 'image/jpeg')}
response = requests.post(url, files=files)

if response.status_code == 200:
    result = response.json()
    predicted_class = result['class']
    predicted_prob = result['prob']
    print(f'Predicted Class: {predicted_class}, Predicted Probability: {predicted_prob}')
else:
    print(f'Error: {response.text}')
