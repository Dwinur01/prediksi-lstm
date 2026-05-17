import * as tf from '@tensorflow/tfjs';

/**
 * 1. Feature Engineering Helpers
 */
export const calculateSMA = (data, period) => {
  return data.map((_, i) => {
    const start = Math.max(0, i - period + 1);
    const subset = data.slice(start, i + 1);
    const sum = subset.reduce((a, b) => a + b, 0);
    return sum / subset.length;
  });
};

export const calculateEMA = (data, period) => {
  const k = 2 / (period + 1);
  let ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
};

/**
 * Differencing Helpers
 */
export const applyDifferencing = (rawValues) => {
  const diffs = [0]; // First element has 0 difference since no previous element
  for (let i = 1; i < rawValues.length; i++) {
    diffs.push(rawValues[i] - rawValues[i - 1]);
  }
  return diffs;
};

export const reverseDifferencing = (diffValue, previousActualValue) => {
  return previousActualValue + diffValue;
};

/**
 * 2. Multivariate Normalization
 */
export const prepareMultivariateData = (data, emaPeriod = 5) => {
  const rawValues = data.map(d => parseInt(d.tickets_sold) || 0);
  const diffValues = applyDifferencing(rawValues);

  const ma3 = calculateSMA(diffValues, 3);
  const ma4 = calculateSMA(diffValues, 4);
  const ema = calculateEMA(diffValues, emaPeriod);
  
  // Seasonality: Month Index (1-12)
  const months = data.map(d => {
    const week = parseInt(d.week) || 1;
    return Math.ceil(week / 4.33);
  });

  // Gabungkan fitur: [Diff, MA3, MA4, EMA, Month]
  const features = diffValues.map((v, i) => [v, ma3[i], ma4[i], ema[i], months[i]]);
  
  // Hitung Min-Max per kolom untuk normalisasi independen
  const mins = [
    Math.min(...diffValues), 
    Math.min(...ma3), 
    Math.min(...ma4), 
    Math.min(...ema),
    1 // Min for month is always 1
  ];
  const maxs = [
    Math.max(...diffValues), 
    Math.max(...ma3), 
    Math.max(...ma4), 
    Math.max(...ema),
    12 // Max for month is always 12
  ];
  
  const normalizedFeatures = features.map(row => 
    row.map((val, colIdx) => {
      const range = maxs[colIdx] - mins[colIdx];
      return range === 0 ? 0 : (val - mins[colIdx]) / range;
    })
  );

  return { normalizedFeatures, mins, maxs, ma3, ma4, ema, diffValues, months };
};

export const denormalizeData = (normalizedValue, min, max) => {
  return normalizedValue * (max - min) + min;
};

/**
 * 3. Create Sequences for LSTM (Multivariate)
 */
export const createSequences = (normalizedFeatures, windowSize) => {
  const X = [];
  const y = [];
  
  for (let i = 0; i < normalizedFeatures.length - windowSize; i++) {
    X.push(normalizedFeatures.slice(i, i + windowSize));
    y.push(normalizedFeatures[i + windowSize][0]); // Target is normalized Diff
  }
  
  return { X, y };
};

/**
 * 4. Build LSTM Model
 */
export const buildModel = (windowSize, learningRate) => {
  const model = tf.sequential();
  
  // Bidirectional LSTM
  model.add(tf.layers.bidirectional({
    layer: tf.layers.lstm({
      units: 64,
      returnSequences: false,
      activation: 'tanh'
    }),
    inputShape: [windowSize, 5] // 5 fitur input (Diff, MA3, MA4, EMA, Month)
  }));
  
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 1 }));
  
  const optimizer = tf.train.adam(learningRate);
  model.compile({ optimizer, loss: 'meanSquaredError' });
  
  return model;
};

/**
 * 5. Train Model
 */
export const trainModel = async (model, X, y, epochs, batchSize = 16, onEpochEnd) => {
  const xs = tf.tensor3d(X);
  const ys = tf.tensor2d(y, [y.length, 1]);
  
  const initialLR = model.optimizer.learningRate;
  
  await model.fit(xs, ys, {
    epochs: epochs,
    batchSize: batchSize,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        // Learning Rate Decay: reduce by 5% every 2 epochs
        if (epoch > 0 && epoch % 2 === 0) {
          model.optimizer.learningRate = model.optimizer.learningRate * 0.95;
        }
        if (onEpochEnd) onEpochEnd(epoch, logs.loss);
      }
    }
  });
  
  // Restore initial LR for future runs if needed
  model.optimizer.learningRate = initialLR;
  
  xs.dispose();
  ys.dispose();
  return model;
};

/**
 * 6. Predict
 */
export const predict = (model, X) => {
  const xs = tf.tensor3d(X);
  const preds = model.predict(xs);
  const result = Array.from(preds.dataSync());
  xs.dispose();
  preds.dispose();
  return result; // These are normalized diffs
};

/**
 * 7. Accuracy Metrics
 */
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
  
  if (n === 0) return { mse: 0, rmse: 0, mape: 0 };
  
  mse = mse / n;
  const rmse = Math.sqrt(mse);
  mape = (mape / n) * 100;
  
  return {
    mse: mse.toFixed(4),
    rmse: rmse.toFixed(4),
    mape: mape.toFixed(2)
  };
};

/**
 * 8. Transparency Info (Weights)
 */
export const getManualLSTMCalculation = async (model) => {
  try {
    const bidirectionalLayer = model.layers[0];
    const weights = bidirectionalLayer.getWeights(); 
    // weights[0] = forward_kernel, weights[1] = forward_recurrent, weights[2] = forward_bias
    const kernelArray = await weights[0].array();
    const biasArray = await weights[2].array();
    
    const units = 64;
    const getGateSample = (matrix, gateIndex) => {
      // Ambil semua 5 baris (fitur) dan 5 kolom pertama dari gate tersebut
      return matrix.slice(0, 5).map(row => 
        row.slice(gateIndex * units, gateIndex * units + 5)
      );
    };

    return {
      inputGate: getGateSample(kernelArray, 0),
      forgetGate: getGateSample(kernelArray, 1),
      candidateGate: getGateSample(kernelArray, 2),
      outputGate: getGateSample(kernelArray, 3),
      bias: biasArray.slice(0, 10) // 10 nilai bias
    };
  } catch (e) {
    return null;
  }
};

/**
 * 9. Data Quality Audit & Anomaly Detection
 */
export const auditDataQuality = (data) => {
  if (data.length < 2) return { status: 'error', issues: ['Data terlalu sedikit'] };
  
  const issues = [];
  const rawValues = data.map(d => parseInt(d.tickets_sold));
  
  // 1. Cek Celah Minggu (Gaps)
  for (let i = 1; i < data.length; i++) {
    const prev = data[i-1];
    const curr = data[i];
    if (curr.year === prev.year && curr.week !== prev.week + 1) {
      issues.push(`Celah data ditemukan antara Minggu ${prev.week} dan ${curr.week} (${curr.year})`);
    }
  }

  // 2. Deteksi Anomali (Z-Score > 3)
  const mean = rawValues.reduce((a, b) => a + b, 0) / rawValues.length;
  const stdDev = Math.sqrt(rawValues.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / rawValues.length);
  
  rawValues.forEach((val, i) => {
    const zScore = Math.abs((val - mean) / (stdDev || 1));
    if (zScore > 2.5) {
      issues.push(`Anomali terdeteksi: Minggu ${data[i].week} (${val} tiket) terlalu jauh dari rata-rata`);
    }
  });

  return {
    status: issues.length > 0 ? 'warning' : 'healthy',
    issues,
    stats: { mean: Math.round(mean), stdDev: Math.round(stdDev) }
  };
};

/**
 * 10. Multi-Step Forecasting (Future Prediction)
 */
export const multiStepForecast = async (model, lastWindowNormalized, steps, mins, maxs, emaPeriod, lastActualValue, currentWeek) => {
  let currentWindow = JSON.parse(JSON.stringify(lastWindowNormalized)); // [windowSize][5]
  const predictions = [];
  
  const k = 2 / (emaPeriod + 1);
  let prevActual = lastActualValue;
  let weekCounter = currentWeek;

  for (let i = 0; i < steps; i++) {
    const inputTensor = tf.tensor3d([currentWindow]);
    const predNormalizedDiff = (await model.predict(inputTensor).dataSync())[0];
    inputTensor.dispose();

    // Denormalisasi untuk mendapatkan nilai difference asli
    const predDiff = Math.round(predNormalizedDiff * (maxs[0] - mins[0]) + mins[0]);
    
    // Reverse differencing to get the actual projection
    const predActual = prevActual + predDiff;
    
    predictions.push({
      weekOffset: i + 1,
      value: predActual,
      normalized: predNormalizedDiff
    });

    // Update for next step
    prevActual = predActual;
    weekCounter++;
    const nextMonth = Math.ceil(weekCounter / 4.33);
    const nextMonthNormalized = (nextMonth - 1) / 11; // normalisasi 1-12 ke 0-1

    // Update window untuk langkah berikutnya
    const nextWindow = currentWindow.slice(1);
    
    const lastOriginalDiffs = nextWindow.map(row => row[0]);
    lastOriginalDiffs.push(predNormalizedDiff);
    
    const newMA3 = lastOriginalDiffs.slice(-3).reduce((a, b) => a + b, 0) / Math.min(lastOriginalDiffs.length, 3);
    const newMA4 = lastOriginalDiffs.slice(-4).reduce((a, b) => a + b, 0) / Math.min(lastOriginalDiffs.length, 4);
    
    const prevEMA = currentWindow[currentWindow.length - 1][3];
    const newEMA = predNormalizedDiff * k + prevEMA * (1 - k);

    nextWindow.push([predNormalizedDiff, newMA3, newMA4, newEMA, nextMonthNormalized]);
    currentWindow = nextWindow;
  }
  
  return predictions;
};
