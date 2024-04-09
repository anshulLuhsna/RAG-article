from flask import Flask, request, jsonify
from typing import Any, List, Mapping, Optional
import requests
import json
from langchain_core.outputs import ChatGenerationChunk
from langchain_core.callbacks.manager import CallbackManagerForLLMRun, AsyncCallbackManagerForLLMRun
from typing import Any, Iterator, List, Optional, AsyncIterator
from langchain_core.language_models.llms import LLM
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    FunctionMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pinecone import Pinecone
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

class CustomLLM(LLM):
    n: int

    @property
    def _llm_type(self) -> str:
        return "custom"

    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        if stop is not None:
            raise ValueError("stop kwargs are not permitted.")

        url = "https://api.worqhat.com/api/ai/content/v2"
        
        payload = json.dumps({
            "question": prompt,
            "training_data": "My name is jonny",
            "stream_data": False
        })
        
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer sk-92426c0957c64a869f5cf988d27b90ad'
        }
        
        response = requests.post(url, headers=headers, data=payload)
        
        return response.text

    @property
    def _identifying_params(self) -> Mapping[str, Any]:
        """Get identifying parameters."""
        return {"n": self.n}

llm = CustomLLM(n=10)

@app.route('/generate_response', methods=['POST'])
def generate_response():
    data = request.get_json()
    print(data)
    
    if 'prompt' in data and 'topic' in data:
        prompt_text = data['prompt']
        topic = data['topic']
        
        client = OpenAI()
        pc = Pinecone(api_key="2018ae0d-04e1-4dc7-9e9e-f9709089b55d")
        index = pc.Index("nextjs")
        
        response = client.embeddings.create(
            input=topic,
            model="text-embedding-3-small"
        )
        
        query_result = index.query(
        
            vector = response.data[0].embedding,
            top_k=1,
            include_metadata=True,
        )
        print(query_result)
        context = query_result['matches'][0]['metadata']['text']
        # page = query_result['matches'][0]['metadata']['page']
        # print(page)
        print(context)
        
        # Create prompt with retrieved context
        prompt_template = ChatPromptTemplate.from_template(prompt_text + "\n\nContext: {context}\n\nTopic: {topic}")

        
        output_parser = StrOutputParser()
        
        chain = prompt_template | llm | output_parser
        
        response_content = chain.invoke({"context": context, "topic": topic})
        
        return jsonify({"response": json.loads(response_content)["content"]})
    
    return jsonify({"error": "Missing 'prompt' 'topic' in request body"}), 400

if __name__ == '__main__':
    app.run(debug=True)
