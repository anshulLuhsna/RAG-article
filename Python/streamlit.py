import streamlit as st
import requests
import json
import re
from typing import Any
from langchain_core.language_models.llms import LLM
from typing import Any, Mapping
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pinecone import Pinecone
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class CustomLLM(LLM):
    n: int 

    @property
    def _llm_type(self) -> str:
        return "custom"

    def _call(
        self,
        prompt,
        **kwargs: Any,
    ) -> str:
        human_match = re.search(r"Human: (.*?)(?=\n(?:Context|Topic|Training Data|Conversation History):|\Z)", prompt, re.DOTALL)
        message_match = re.search(r"Context: (.*?)(?=\n(?:Topic|Training Data|Conversation History):|\Z)", prompt, re.DOTALL)
        conversation_history_match = re.search(r"Conversation History:\n(.*?)(?=\n(?:Topic|Training Data):|\Z)", prompt, re.DOTALL)

        human_message = human_match.group(1).strip() if human_match else ""
        context_message = message_match.group(1).strip() if message_match else ""
        conversation_history_str = conversation_history_match.group(1).strip() if conversation_history_match else ""
     
        try:
            conversation_history_obj = json.loads(conversation_history_str)
        except json.JSONDecodeError:
            conversation_history_obj = []
            conversation_pairs = re.findall(r"{\s*'(.*?)'\s*:\s*'(.*?)'\s*}", conversation_history_str)
            for conversation_pair in conversation_pairs:
                conversation_history_obj.append({conversation_pair[0]: conversation_pair[1]})

        print(conversation_history_obj)

        url = "https://api.worqhat.com/api/ai/content/v2"

        payload = json.dumps({
            "question": human_message,
            "preserve_history": True,
            "stream_data": False,
            "conversation_history": conversation_history_obj,
            "response_type": "text",
            "training_data": context_message
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
        return {"n": self.n}

llm = CustomLLM(n=10)

def generate_response(prompt, topic, conversation_history):
    client = OpenAI()
    pc = Pinecone(api_key="2018ae0d-04e1-4dc7-9e9e-f9709089b55d")
    index = pc.Index("nextjs")

    response = client.embeddings.create(
        input=topic,
        model="text-embedding-3-small"
    )

    query_result = index.query(
        vector=response.data[0].embedding,
        top_k=1,
        include_metadata=True,
    )

    context = query_result['matches'][0]['metadata']['text']

    prompt_template = ChatPromptTemplate.from_template(prompt + "\n\nContext: {context}\n\nTopic: {topic}\n\nConversation History:\n{conversation_history}")

    output_parser = StrOutputParser()

    chain = prompt_template | llm | output_parser

    response_content = chain.invoke({"context": context, "topic": topic, "conversation_history": conversation_history})

    return json.loads(response_content)["content"]

def main():
    st.title("NextJS 13 new features bot")

    conversation_history = st.session_state.get("conversation_history", [])

    prompt = st.text_area("Enter your prompt")
    topic = st.text_input("Enter topic")

    if st.button("Generate Response"):
        if prompt and topic:
            response = generate_response(prompt, topic, conversation_history)
            conversation_history.append({prompt: response})
            st.session_state["conversation_history"] = conversation_history
            st.success("Generated Response:")
            st.write(response)
        else:
            st.warning("Please enter both prompt and topic.")


if __name__ == '__main__':
    main()
