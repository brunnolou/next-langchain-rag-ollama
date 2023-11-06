import { pipeline, env } from "@xenova/transformers";

import path from "path";

env.cacheDir = path.join(process.cwd(), "models");

export async function getEmbeddings(query: string) {
  const featureExtraction = await pipeline(
    "feature-extraction",
    "Xenova/gte-small"
  );

  const { data: embeddings } = await featureExtraction(query, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(embeddings) as number[];
}
