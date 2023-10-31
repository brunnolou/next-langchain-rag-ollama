import { QdrantVectorStore } from "langchain/vectorstores/qdrant";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { embeddings } from "./embeddings";

export const getVectorStore = () =>
  QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL,
    collectionName: process.env.QDRANT_COLLECTION_NAME,
  });

export const getQdrantRetriever = async () => {
  const vectorStore = await getVectorStore();
  const retriever = vectorStore.asRetriever();

  return retriever;
};
