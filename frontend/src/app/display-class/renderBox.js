import labels from "./labels.json";

function xywh2xyxy(x){
  //Convert boxes from [x, y, w, h] to [x1, y1, x2, y2] where xy1=top-left, xy2=bottom-right
  var y = [];
  y[0] = x[0] - x[2] / 2  //top left x
  y[1] = x[1] - x[3] / 2  //top left y
  y[2] = x[0] + x[2] / 2  //bottom right x
  y[3] = x[1] + x[3] / 2  //bottom right y
  return y;
}

export const renderBoxes = (canvasRef, threshold, boxes_data, scores_data, classes_data) => {
  const ctx = canvasRef.current.getContext("2d");

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clean canvas

  // font configs
  const font = "18px sans-serif";
  ctx.font = font;
  ctx.textBaseline = "top";

  for (let i = 0; i < scores_data.length; ++i) {
    if (scores_data[i] > threshold) {
      const canvasElement = canvasRef.current;
      const model_dim = [canvasElement.height, canvasElement.width];

      const klass = labels[classes_data[i]];
      const score = (scores_data[i] * 100).toFixed(1);

      // console.log(klass, "-", scores_data[i])

      let [x1, y1, x2, y2] = xywh2xyxy(boxes_data[i]);

      const heightRatio = model_dim[0] / 640; 
      const widthRatio = model_dim[1] / 640;
      // console.log("RATIO:", heightRatio, widthRatio)

      x1 *= widthRatio;
      x2 *= widthRatio;
      y1 *= heightRatio;
      y2 *= heightRatio;

      const width = x2 - x1;
      const height = y2 - y1;

      // console.log(`Drawing box for ${klass}: x1=${x1}, y1=${y1}, width=${width}, height=${height}, score=${score}`);

      // Draw the bounding box.
      ctx.strokeStyle = "#B033FF";
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, width, height);

      // Draw the label background.
      ctx.fillStyle = "#B033FF";
      const textWidth = ctx.measureText(klass + " - " + score + "%").width;
      const textHeight = parseInt(font, 10); // base 10
      ctx.fillRect(x1 - 1, y1 - (textHeight + 2), textWidth + 2, textHeight + 2);

      // Draw labels
      ctx.fillStyle = "#ffffff";
      ctx.fillText(klass + " - " + score + "%", x1 - 1, y1 - (textHeight + 2));
    }
  }
};
