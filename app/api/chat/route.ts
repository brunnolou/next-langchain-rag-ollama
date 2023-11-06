import { StreamingTextResponse, Message } from "ai";
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

  // Extract a standalone question to later query the vector db.
  const answer = await contextSearchModel.call(
    parseMessages([
      ...messages,
      {
        id: "0",
        role: "system",
        content: `Given the following conversation and a follow-up question, rephrase the follow-up question to be a standalone question. Reply only with the question, nothing else.
----------
Standalone question:`,
      },
    ])
  );
  console.log("====================================");
  console.log("Standalone question:", answer.content);

  let systemInstructions = "";

  // Get the standalone question and search the vector db.
  const context = await searchVectorDB(answer.content, 3);

  systemInstructions = `You are a legal assistant expert on the Swiss Code of Obligations.
Base you answers exclusively on the provided context from the Swiss Code of Obligations.
Ignore
Mention the article(s) and the source link(s) that you based you answer.
----

CONTEXT:
${context
  .map(
    (x) => `
## ${x?.payload?.article}
${x?.payload?.content}

--

[Source link](${x?.payload?.link})
`
  )
  .join("----\n")}`;

  // Call and stream the LLM with the instructions, context and user messages.
  const stream = await chatModel
    .pipe(new BytesOutputParser())
    .stream(
      parseMessages([
        { id: "instructions", role: "system", content: systemInstructions },
        ...messages,
      ])
    );

  return new StreamingTextResponse(stream);
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
