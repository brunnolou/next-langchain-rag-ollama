import { Document } from "langchain/document";
import { LLMChain } from "langchain/chains";
import { ChatOllama } from "langchain/chat_models/ollama";
import { BaseMessage } from "langchain/schema";
import { questionGeneratorTemplate, questionPrompt } from "./prompts";
import { memory, serializeChatHistory, serializeDocs } from "./chat-context";

const model = new ChatOllama({
  baseUrl: process.env.OLLAMA_BASE_URL,
  model: "mistral",
});

const fasterChain = new LLMChain({
  llm: model,
  prompt: questionGeneratorTemplate,
});

const slowerChain = new LLMChain({
  llm: model,
  prompt: questionPrompt,
});

export const performQuestionAnswering = async (input: {
  question: string;
  chatHistory: Array<BaseMessage> | null;
  context: Array<Document>;
}): Promise<{ result: string; sourceDocuments: Array<Document> }> => {
  let newQuestion = input.question;

  // Serialize context and chat history into strings
  const serializedDocs = serializeDocs(input.context);
  const chatHistoryString = input.chatHistory
    ? serializeChatHistory(input.chatHistory)
    : null;

  if (chatHistoryString) {
    // Call the faster chain to generate a new question
    const { text } = await fasterChain.invoke({
      chatHistory: chatHistoryString,
      context: serializedDocs,
      question: input.question,
    });

    newQuestion = text;
  }

  const response = await slowerChain.invoke({
    chatHistory: chatHistoryString ?? "",
    context: serializedDocs,
    question: newQuestion,
  });

  // Save the chat history to memory
  await memory.saveContext(
    { question: input.question },
    { text: response.text }
  );

  console.log("response.text: ", response.text);
  return {
    result: response.text,
    sourceDocuments: input.context,
  };
};
