import {
  StreamingTextResponse,
  Message,
  LangChainStream,
  streamToResponse,
} from "ai";
import { AIMessage, HumanMessage } from "langchain/schema";
import { ChatOllama } from "langchain/chat_models/ollama";
import {
  BytesOutputParser,
  StringOutputParser,
} from "langchain/schema/output_parser";
import { RunnableSequence } from "langchain/schema/runnable";
import { memory } from "./chat-context";
import { performQuestionAnswering } from "./retrival-qa";
import { getQdrantRetriever } from "./vector-store";
import { NextResponse } from "next/server";

// export const runtime = "edge";

export async function POST(req: Request, res: NextResponse) {
  const { messages } = (await req.json()) as { messages: Message[] };

  const retriever = await getQdrantRetriever();
  // const { stream, handlers, writer } = LangChainStream();

  const chain = RunnableSequence.from([
    {
      // Pipe the question through unchanged
      question: (input: { question: string }) => input.question,
      // Fetch the chat history, and return the history or null if not present
      chatHistory: async () => {
        const savedMemory = await memory.loadMemoryVariables({});
        const hasHistory = savedMemory.chatHistory.length > 0;
        return hasHistory ? savedMemory.chatHistory : null;
      },
      // Fetch relevant context based on the question
      context: async (input: { question: string }) => {
        const docs = await retriever.getRelevantDocuments(input.question);
        console.log("docs: ", docs);
        return docs;
      },
    },
    performQuestionAnswering,
    new BytesOutputParser(),
    // [handlers],
  ]);

  // const parser = new BytesOutputParser();
  const parser = new StringOutputParser();
  const { stream, handlers } = LangChainStream({
    onToken(token) {
      console.log("token: ", token);
    },
  });

  const readableStream = await chain.stream(
    {
      question: messages[messages.length - 1].content,
    },
    // [handlers],
    {
      callbacks: [
        {
          handleRetrieverEnd(documents, runId, parentRunId, tags) {
            console.log("documents, runId: ", documents, runId);
          },
          ...handlers,
          handleLLMNewToken(token, idx, runId, parentRunId, tags, fields) {
            console.log("token: ", token, idx);
            return handlers.handleLLMNewToken(token);
          },
        },
      ],
    }
  );

  // console.log("stream: ", stream);

  // const stream = await chain
  //   .pipe(parser)
  //   .stream(
  //     (messages as Message[]).map((m) =>
  //       m.role == "user"
  //         ? new HumanMessage(m.content)
  //         : new AIMessage(m.content)
  //     ),
  //   );

  // return new StreamingTextResponse(readableStream);

  return new StreamingTextResponse(readableStream, {
    headers: { "x-sources": "sources" },
  });
}
