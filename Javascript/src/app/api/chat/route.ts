import { StreamingTextResponse } from 'ai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { CustomLLM } from './custom_llm'; 
import { PromptTemplate } from "@langchain/core/prompts";


const llm = new CustomLLM({
  apiKey: "sk-27b8b8f2bdb142518417ea2f18937263",
});

let vectorStore;
let context = ""

const promptTemplate = PromptTemplate.fromTemplate(`question : {message} \n\ncontext: {context}\n\n history: {messages}`)
const chain = promptTemplate.pipe(llm);



export async function POST(req: Request) {
  const { messages, extractedText } = await req.json();

  const hasAssistantMessages = messages.some(message => message.role === 'assistant');
  console.log(hasAssistantMessages)
  if (!vectorStore || !hasAssistantMessages) {
    console.log("vectorDB created")
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    if (extractedText) {
      const docs = await textSplitter.createDocuments([extractedText]);
      vectorStore = await MemoryVectorStore.fromDocuments(docs, new OpenAIEmbeddings());
    } else {
      console.log('Extracted text is empty or null');
     
    }
  }

  const fixAssistantContent = (assistantMessage) => {
    if (assistantMessage.content) {
      const contentStrings = assistantMessage.content.match(/"content":"(.*?)"/g);
      if (contentStrings) {
        const contents = contentStrings.map((str) => {
          const match = str.match(/"content":"(.*?)"/);
          return match ? match[1] : null;
        });
        assistantMessage.content = contents.join('');
      }
    } else {
      console.log('assistantMessage.content is undefined');
    }
  };

  messages.forEach((message) => {
    if (message.role === 'assistant') {
      fixAssistantContent(message);
    }
  });

  const getLastUserQuestion = (messages) => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].content;
      }
    }
    return null;
  };

  const lastUserQuestion = getLastUserQuestion(messages);

  if (vectorStore) {
    const searchResults = await vectorStore.similaritySearch(lastUserQuestion, 1);
    // console.log('Context:', searchResults[0].pageContent);
    context = searchResults[0].pageContent
  } else {
    console.log('Vector store is not initialized');
    // Handle case when vectorStore is undefined
  }

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Accept", "application/json");
  myHeaders.append("Authorization", "Bearer ");

  const raw = JSON.stringify({
    "question": lastUserQuestion,
    "stream_data": true,
    "training_data": context,
    "preserve_history": true,
    "conversation_history": messages,
    "response_type": "text",
  
  });

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
  };

  try {
    // const response = await fetch("https://api.worqhat.com/api/ai/content/v2", requestOptions);

    // if (!response.ok) {
    //   throw new Error(`HTTP error! Status: ${response.status}`);
    // }

    const stream = await chain.stream({
      message: lastUserQuestion,
      context: context,
      messages: JSON.stringify(messages)
    });
   
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Error:', error.message);
    return new Response('Internal Server Error', { status: 500 });
  }
}
