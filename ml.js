import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js to fetch models from the Hugging Face Hub (via CDN)
env.allowLocalModels = false;
env.useBrowserCache = true; // Cache the 22MB model in IndexedDB so it's only downloaded once!

// Disable multi-threading and proxy to avoid loading Workers from blob URLs in MV3 extension
if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
}

let extractor = null;

export async function getEmbeddingPipeline() {
  if (!extractor) {
    console.log('ContextFlow ML: Loading all-MiniLM-L6-v2 model into browser cache...');
    // Create an update event for UI
    if (window.onMLProgress) window.onMLProgress(10);
    
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      progress_callback: (data) => {
        if (window.onMLProgress) window.onMLProgress(data);
      }
    });
    console.log('ContextFlow ML: Model loaded successfully.');
  }
  return extractor;
}

export async function computeEmbedding(text) {
  const pipe = await getEmbeddingPipeline();
  // We use mean pooling and normalize to get cosine-ready vectors
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += Math.pow(vecA[i], 2);
    normB += Math.pow(vecB[i], 2);
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Expose globally so graph-advanced.js can use it seamlessly
window.ML = {
  getEmbeddingPipeline,
  computeEmbedding,
  cosineSimilarity
};
