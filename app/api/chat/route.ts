import {
  StreamingTextResponse,
  Message,
  experimental_StreamData,
  createStreamDataTransformer,
} from "ai";
import { AIMessage, HumanMessage, SystemMessage } from "langchain/schema";
import { ChatOllama } from "langchain/chat_models/ollama";
import { BytesOutputParser } from "langchain/schema/output_parser";
import { searchVectorDB } from "./vector-db";

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: Message[] };

  const contextSearchModel = new ChatOllama({
    baseUrl: process.env.OLLAMA_BASE_URL,
    model: process.env.OLLAMA_MODEL_NAME,
    temperature: 0,
  });

  const chatModel = new ChatOllama({
    baseUrl: process.env.OLLAMA_BASE_URL,
    model: process.env.OLLAMA_MODEL_NAME,
    temperature: 0.5,
  });

  const data = new experimental_StreamData();

  // Extract a standalone question to later query the vector db.
  const answer = await contextSearchModel.call(
    parseMessages([
      ...messages,
      {
        id: "0",
        role: "system",
        content: `Given the following conversation and a follow-up question, rephrase the follow-up question to be a standalone keyword-based question. Reply only with the question, nothing else.
----------
Standalone question:`,
      },
    ])
  );
  console.log("\n====================================");
  console.log("Standalone question:", answer.content);

  let systemInstructions = "";

  // Get the standalone question and search the vector db.
  const topDocumentsLimit = 3;
  const context = await searchVectorDB(answer.content, topDocumentsLimit);

  data.append(JSON.stringify({ context }));

  const contextString = context
    .map(
      (x) => `
## ${x?.payload?.article}
${x?.payload?.content}

---

[Source link](${x?.payload?.link})
`
    )
    .join("----\n");

  console.log("Context String:", contextString);

  systemInstructions = `You are a legal assistant expert on the Swiss Code of Obligations.
Answer questions related to contract law, employment regulations, or corporate obligations.
Base your answers exclusively on the provided top ${topDocumentsLimit} articles from the Swiss Code of Obligations.
Please provide a summary of the relevant article(s), along with the source link(s) for reference.
If an answer is not explicitly covered in the provided context, please indicate so.
----

CONTEXT: ${contextString}`;

  // Call and stream the LLM with the instructions, context and user messages.
  const stream = await chatModel
    .pipe(new BytesOutputParser())
    .stream(
      parseMessages([
        { id: "instructions", role: "system", content: systemInstructions },
        ...messages,
      ]),
      { callbacks: [{ handleLLMEnd: () => data.close() }] }
    );

  return new StreamingTextResponse(
    stream.pipeThrough(createStreamDataTransformer(true)),
    {},
    data
  );
}

function parseMessages(messages: Message[]) {
  return messages.map((m) =>
    m.role == "user"
      ? new HumanMessage(m.content)
      : m.role == "system"
      ? new SystemMessage(m.content)
      : new AIMessage(m.content)
  );
}
