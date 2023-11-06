import { QdrantClient } from "@qdrant/js-client-rest";

import { getEmbeddings } from "./embeddings";

export const getQdrantClient = () =>
  new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_KEY,
  });

export const searchVectorDB = async (query: string, limit = 8) => {
  const client = getQdrantClient();
  const embeddings = await getEmbeddings(query);

  const collectionName = process.env.QDRANT_COLLECTION_NAME;

  if (!collectionName)
    throw new Error("Please set QDRANT_COLLECTION_NAME env var.");

  return client.search(collectionName, {
    vector: embeddings,
    limit,
    with_payload: true,
  });
};
