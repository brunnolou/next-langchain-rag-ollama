import { Document } from "langchain/document";
import { BufferMemory } from "langchain/memory";
import { BaseMessage } from "langchain/schema";

export const memory = new BufferMemory({
  memoryKey: "chatHistory",
  inputKey: "question", // The key for the input to the chain
  outputKey: "text", // The key for the final conversational output of the chain
  returnMessages: true, // If using with a chat model (e.g. gpt-3.5 or gpt-4)
});

export const serializeDocs = (docs: Array<Document>): string =>
  docs.map((doc) => doc.pageContent).join("\n");

export const serializeChatHistory = (chatHistory: Array<BaseMessage>): string =>
  chatHistory
    .map((chatMessage) => {
      if (chatMessage._getType() === "human") {
        return `Human: ${chatMessage.content}`;
      } else if (chatMessage._getType() === "ai") {
        return `Assistant: ${chatMessage.content}`;
      } else {
        return `${chatMessage.content}`;
      }
    })
    .join("\n");
