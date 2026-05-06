import * as tf from '@tensorflow/tfjs';

/**
 * 1. Feature Engineering Helpers
 */

// Simple Moving Average dengan penanganan akumulatif untuk minggu awal
export const calculateSMA = (data, period) => {
  return data.map((_, i) => {
    const start = Math.max(0, i - period + 1);
    const subset = data.slice(start, i + 1);
    const sum = subset.reduce((a, b) => a + b, 0);
    return sum / subset.length;
  });
};

// Exponential Moving Average
export const calculateEMA = (data, period) => {
  const k = 2 / (period + 1);
  let ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
};

/**
 * 2. Multivariate Normalization
 */
export const prepareMultivariateData = (rawValues, emaPeriod = 5) => {
  const ma3 = calculateSMA(rawValues, 3);
  const ma4 = calculateSMA(rawValues, 4);
  const ema = calculateEMA(rawValues, emaPeriod);

  // Gabungkan fitur: [Asli, MA3, MA4, EMA]
  const features = rawValues.map((v, i) => [v, ma3[i], ma4[i], ema[i]]);
  
  // Hitung Min-Max per kolom untuk normalisasi independen
  const mins = [
    Math.min(...rawValues), 
    Math.min(...ma3), 
    Math.min(...ma4), 
    Math.min(...ema)
  ];
  const maxs = [
    Math.max(...rawValues), 
    Math.max(...ma3), 
    Math.max(...ma4), 
    Math.max(...ema)
  ];
  
  const normalizedFeatures = features.map(row => 
    row.map((val, colIdx) => {
      const range = maxs[colIdx] - mins[colIdx];
      return range === 0 ? 0 : (val - mins[colIdx]) / range;
    })
  );

  return { normalizedFeatures, mins, maxs, ma3, ma4, ema };
};

export const denormalizeData = (normalizedValue, min, max) => {
  // Hanya digunakan untuk output (target tunggal: tiket terjual)
  return normalizedValue * (max - min) + min;
};

/**
 * 3. Create Sequences for LSTM (Multivariate)
 */
export const createSequences = (normalizedFeatures, windowSize) => {
  const X = [];
  const y = [];
  
  // Target tetap kolom index 0 (nilai asli tiket terjual)
  for (let i = 0; i < normalizedFeatures.length - windowSize; i++) {
    X.push(normalizedFeatures.slice(i, i + windowSize));
    y.push(normalizedFeatures[i + windowSize][0]);
  }
  
  return { X, y };
};

/**
 * 4. Build LSTM Model
 */
export const buildModel = (windowSize, learningRate) => {
  const model = tf.sequential();
  
  model.add(tf.layers.lstm({
    units: 64, // Ditingkatkan sedikit karena fitur bertambah
    inputShape: [windowSize, 4], // 4 fitur input
    returnSequences: false,
    activation: 'tanh'
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
export const trainModel = async (model, X, y, epochs, onEpochEnd) => {
  // X: [samples, windowSize, 4]
  const xs = tf.tensor3d(X);
  // y: [samples, 1]
  const ys = tf.tensor2d(y, [y.length, 1]);
  
  await model.fit(xs, ys, {
    epochs: epochs,
    batchSize: 4,
    shuffle: true,
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

/**
 * 6. Predict
 */
export const predict = (model, X) => {
  const xs = tf.tensor3d(X);
  const preds = model.predict(xs);
  const result = Array.from(preds.dataSync());
  xs.dispose();
  preds.dispose();
  return result;
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
    const lstmLayer = model.layers[0];
    const weights = lstmLayer.getWeights(); 
    const kernelArray = await weights[0].array();
    const biasArray = await weights[2].array();
    
    const units = 64;
    const getGateSample = (matrix, gateIndex) => {
      // Ambil 2 baris pertama (fitur) dan 5 kolom pertama dari gate tersebut
      return matrix.slice(0, 2).map(row => 
        row.slice(gateIndex * units, gateIndex * units + 5)
      );
    };

    return {
      inputGate: getGateSample(kernelArray, 0),
      forgetGate: getGateSample(kernelArray, 1),
      candidateGate: getGateSample(kernelArray, 2),
      outputGate: getGateSample(kernelArray, 3),
      bias: biasArray.slice(0, 10) // 10 nilai bisa disusun 2x5
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
export const multiStepForecast = async (model, lastWindowNormalized, steps, mins, maxs, emaPeriod) => {
  let currentWindow = JSON.parse(JSON.stringify(lastWindowNormalized)); // [windowSize][4]
  const predictions = [];
  
  const k = 2 / (emaPeriod + 1);

  for (let i = 0; i < steps; i++) {
    const inputTensor = tf.tensor3d([currentWindow]);
    const predNormalized = (await model.predict(inputTensor).dataSync())[0];
    inputTensor.dispose();

    // Denormalisasi untuk mendapatkan nilai asli
    const predActual = Math.round(predNormalized * (maxs[0] - mins[0]) + mins[0]);
    
    predictions.push({
      weekOffset: i + 1,
      value: predActual,
      normalized: predNormalized
    });

    // Update window untuk langkah berikutnya
    // Geser window (hapus yang paling lama)
    const nextWindow = currentWindow.slice(1);
    
    // Hitung MA/EMA baru untuk titik prediksi ini
    const lastOriginals = nextWindow.map(row => row[0]);
    lastOriginals.push(predNormalized);
    
    const newMA3 = lastOriginals.slice(-3).reduce((a, b) => a + b, 0) / Math.min(lastOriginals.length, 3);
    const newMA4 = lastOriginals.slice(-4).reduce((a, b) => a + b, 0) / Math.min(lastOriginals.length, 4);
    
    const prevEMA = currentWindow[currentWindow.length - 1][3];
    const newEMA = predNormalized * k + prevEMA * (1 - k);

    nextWindow.push([predNormalized, newMA3, newMA4, newEMA]);
    currentWindow = nextWindow;
  }
  
  return predictions;
};
