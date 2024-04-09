import { StreamingTextResponse } from 'ai'; // Replace with the correct import path
import { Pinecone } from '@pinecone-database/pinecone'
import OpenAI from "openai";

const openai = new OpenAI();


export async function POST(req: Request) {
  // API call logic
  const { messages } = await req.json();
  // Function to fix the content field in assistant's responses
const fixAssistantContent = (assistantMessage) => {
  const contentStrings = assistantMessage.content.match(/"content":"(.*?)"/g);
  if (contentStrings) {
    const contents = contentStrings.map((str) => {
      const match = str.match(/"content":"(.*?)"/);
      return match ? match[1] : null;
    });
    assistantMessage.content = contents.join('');
  }
};

// Loop through messages to fix assistant's content
messages.forEach((message) => {
  if (message.role === 'assistant') {
    fixAssistantContent(message);
  }
});

// console.log(messages);




const getLastUserQuestion = (messages) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return messages[i].content;
    }
  }
  return null; // Return null if no user question is found
};

// Get the last user question
const lastUserQuestion = getLastUserQuestion(messages);

// console.log(typeof(messages));
const pc = new Pinecone({ apiKey: "f7311e40-b282-4e72-913e-0c2d3230adcc" })
const index = pc.index("laws")

const embedding = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: lastUserQuestion,
  encoding_format: "float",
});

// console.log(embedding.data[0].embedding);


const queryResponse = await index.query({
    vector: embedding.data[0].embedding,
    topK: 1,
    includeValues: false,
    includeMetadata:true
});


console.log(queryResponse["matches"][0]["metadata"]["text"])
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Accept", "application/json");
  myHeaders.append("Authorization", "Bearer sk-92426c0957c64a869f5cf988d27b90ad");

  const raw = JSON.stringify({
    "question": "The history of the conversation is:" + JSON.stringify(messages) + "Now answer this: " + lastUserQuestion,
    "stream_data": true,
    "training_data": "The responses should be in normal text format only do not try to mimic the user by following the 'data:' format." + queryResponse["matches"][0]["metadata"]["text"],
    "preserve_history": true,
    
    "response_type": "string"
  });

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    
  };

  try {
    // Making the API call
    const response = await fetch("https://api.worqhat.com/api/ai/content/v2", requestOptions);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    console.log(response.body)
    
    


    // Returning the streaming response
    return new StreamingTextResponse(response.body);
  } catch (error) {
    console.error('Error:', error.message);

    // Handling the error with a regular text response
    return new Response('Internal Server Error', { status: 500 });
  }
}
