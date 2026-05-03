import * as tf from '@tensorflow/tfjs';

// 1. Min-Max Normalization
export const normalizeData = (data) => {
  if (data.length === 0) return { normalized: [], min: 0, max: 0 };
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Avoid division by zero if all values are same
  const normalized = data.map(val => (val - min) / range);
  return { normalized, min, max };
};

export const denormalizeData = (normalizedData, min, max) => {
  return normalizedData.map(val => val * (max - min) + min);
};

// 2. Create Sequences for LSTM
export const createSequences = (data, windowSize) => {
  const X = [];
  const y = [];
  for (let i = 0; i < data.length - windowSize; i++) {
    X.push(data.slice(i, i + windowSize));
    y.push(data[i + windowSize]);
  }
  return { X, y };
};

// 3. Build LSTM Model
export const buildModel = (windowSize, learningRate) => {
  const model = tf.sequential();
  
  model.add(tf.layers.lstm({
    units: 50,
    inputShape: [windowSize, 1],
    returnSequences: false
  }));
  
  model.add(tf.layers.dense({ units: 1 }));
  
  const optimizer = tf.train.adam(learningRate);
  model.compile({ optimizer, loss: 'meanSquaredError' });
  
  return model;
};

// 4. Train Model
export const trainModel = async (model, X, y, epochs, onEpochEnd) => {
  const flatX = X.flat();
  const xs = tf.tensor3d(flatX, [X.length, X[0].length, 1]);
  const ys = tf.tensor2d(y, [y.length, 1]);
  
  await model.fit(xs, ys, {
    epochs: epochs,
    batchSize: 4, // Small batch size for small dataset
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (onEpochEnd) onEpochEnd(epoch, logs.loss);
      }
    }
  });
  
  xs.dispose();
  ys.dispose();
  return model;
};

// 5. Predict
export const predict = (model, X) => {
  const flatX = X.flat();
  const xs = tf.tensor3d(flatX, [X.length, X[0].length, 1]);
  const preds = model.predict(xs);
  const result = Array.from(preds.dataSync());
  xs.dispose();
  preds.dispose();
  return result;
};

// 6. Calculate Accuracy Metrics
export const calculateMetrics = (actual, predicted) => {
  let mse = 0;
  let mape = 0;
  let n = actual.length;
  
  for (let i = 0; i < n; i++) {
    const error = actual[i] - predicted[i];
    mse += Math.pow(error, 2);
    if (actual[i] !== 0) {
      mape += Math.abs(error / actual[i]);
    }
  }
  
  mse = mse / n;
  const rmse = Math.sqrt(mse);
  mape = (mape / n) * 100;
  
  return {
    mse: mse.toFixed(4),
    rmse: rmse.toFixed(4),
    mape: mape.toFixed(2)
  };
};

// 7. Manual Forward Pass for Table Display (Step-by-Step approximation)
// tfjs does not easily expose internal gate states. 
// We extract the first layer weights and do a manual calculation for the first sequence to show it in the table.
export const getManualLSTMCalculation = async (model, firstSequence) => {
  const lstmLayer = model.layers[0];
  const weights = lstmLayer.getWeights(); 
  // weights[0] = kernel, weights[1] = recurrentKernel, weights[2] = bias
  
  const kernel = await weights[0].array();
  const bias = await weights[2].array();
  
  const kernelFlat = kernel.flat();
  const biasFlat = bias.flat();
  
  // Dalam tfjs urutan gerbang LSTM adalah: i (input), f (forget), c (candidate), o (output)
  // Jumlah units = 50 (disetel di fungsi buildModel)
  const units = 50;
  
  const extractGateWeights = (gateIndex) => {
    return {
      kernel: kernelFlat[gateIndex * units]?.toFixed(6) || "0.0000",
      bias: biasFlat[gateIndex * units]?.toFixed(6) || "0.0000"
    };
  };

  return {
    sequenceUsed: firstSequence.flat().map(v => v.toFixed(4)),
    inputGate: extractGateWeights(0),
    forgetGate: extractGateWeights(1),
    candidateGate: extractGateWeights(2),
    outputGate: extractGateWeights(3)
  };
};
