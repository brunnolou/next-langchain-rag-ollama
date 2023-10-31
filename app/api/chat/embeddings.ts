import { HuggingFaceTransformersEmbeddings } from "langchain/embeddings/hf_transformers";

export const embeddings = new HuggingFaceTransformersEmbeddings({
  modelName: "Xenova/gte-small",
});
