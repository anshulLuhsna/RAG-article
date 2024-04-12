"use client";
import { useChat } from "ai/react";
import BotChat from "./BotChat";
import UserChat from "./UserChat";
import { useEffect, useRef, useState } from "react";
import { FileInput, Label } from "flowbite-react";

const OpenAI = (props) => {
  const [firstResponse, setFirstResponse] = useState(false)
  const handleFirstResponse = () => {
    console.log("responseeee")
    setFirstResponse(true)
  }
  const handleFinish = () => {
    console.log("helloooo");
  };
  const messageContainerRef = useRef(null);
  const [extractedText, setExtractedText] = useState(null);
  const { messages, input, append, handleInputChange, handleSubmit } = useChat({
    onFinish: handleFinish,
    onResponse: handleFirstResponse,
    body: { extractedText: extractedText },

  });

  useEffect(() => {
    scrollMessageContainerToBottom();
  }, [messages]);

  useEffect(() => {
    if ((props.sendVal ?? "").length > 0) {
      sendMessage(props.sendVal);
    }
  }, [props.sendVal]);

  const sendMessage = async (val) => {
    const newMessage = {
      role: "user",
      content: input,
    };

    try {
      const response = await append(newMessage);
    } catch (error) {
      console.error("Error appending message:", error);
    }
  };

  const clearMessage = () => {
    window.location.reload(true);
  };

  const scrollMessageContainerToBottom = () => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = onLoadFile;
      reader.readAsArrayBuffer(file);
    }
  };

  const onLoadFile = async (event) => {
    const typedArray = new Uint8Array(event.target.result);
    let combinedText = "";
    pdfjsLib
      .getDocument({
        data: typedArray,
      })
      .promise.then((pdf) => {
        console.log("loaded pdf: ", pdf.numPages);

        // Loop through all pages to extract text
        const getPageText = (pageNumber) => {
          if (pageNumber <= pdf.numPages) {
            pdf.getPage(pageNumber).then((page) => {
              page.getTextContent().then((content) => {
                let text = "";
                content.items.forEach((item) => {
                  text += item.str + " ";
                });
                combinedText += text;

                // Recursively call getPageText for next page
                getPageText(pageNumber + 1);
              });
            });
          } else {
            setExtractedText(combinedText);
          }
        };

        // Start extracting text from page 1
        getPageText(1);
      });
  };

  return (
    <div className={``}>
      {messages.length === 0 && (
        <>
          <div className="mt-4 w-1/2 mx-auto">
            <Label htmlFor="file">Upload a file</Label>
            <FileInput id="file" onChange={handleFileUpload} />
          </div>
        </>
      )}

      <div ref={messageContainerRef} className={`h-[70vh] overflow-y-auto`}>
        {messages.length > 0
          ? messages.map((m) => (
              <div key={m.id} className="whitespace-pre-wrap">
                {m.role === "user" ? (
                  <UserChat content={m.content} />
                  
                ) : m.role === "assistant" ? (
                  // Add a condition to check if role is 'assistant' before rendering BotChat
                  <BotChat object={m} content={m.content} />
                ) : null}
                 {messages.length === 1 && (
        <>
        <div className=" ml-32 p-2 bg-gray-200 inline-block rounded-lg ">Creating Vector DB...</div>
        </>
      )}
              </div>
            ))
          : null}
      </div>

     
      <div
        className={` ${
          props.full === "true" ? "visible" : "hidden"
        } flex h-[6vh] my-2`}
      >
        <form onSubmit={handleSubmit} className="ml-[2vw] mr-[1vw]">
          <input
            className={`w-[82vw] lg:w-[85vw] h-[6vh] bg-[#ECEBEB] pl-[2vw] rounded drop-shadow-md relative focus:outline-none`}
            value={input}
            placeholder="Say something..."
            onChange={handleInputChange}
          />
          <button
            className={`${
              props.full === "true"
                ? "right-[15vw] lg:right-[13vw]"
                : "left-[42vw]"
            } absolute bottom-[vh] px-4 py-2`}
          >
            <img src="paper-plane-right-bold.png" width={25} alt="Send" />
          </button>
        </form>

        <button
          className={`border w-[13vw] lg:w-[10vw] bg-[#ECEBEB] font-semibold rounded hover:bg-[#D9D9D9] h-[6vh] text-sm md:text-base`}
          onClick={clearMessage}
        >
          + New Chat
        </button>
      </div>
    </div>
  );
};

export default OpenAI;
