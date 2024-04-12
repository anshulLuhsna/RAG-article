import React, { useEffect, useState } from 'react';

const BotChat = (props) => {
  // console.log(props.content)
  var decodedContent = ""
  var content = ""
  var jsonSeparated = props.content.split("\n\n");
  jsonSeparated = jsonSeparated.filter((item) => item !== "");

  jsonSeparated = jsonSeparated.map((item) => {
    item = item.replace(/^data:/g, "");
    item = item.trim();
    return item;
  });

  try{
  jsonSeparated.forEach((item) => {
    const parsedValue = JSON.parse(item);
    if (parsedValue && parsedValue.content) {
      decodedContent += parsedValue.content;
      content = decodedContent.replace(/(?:\r\n|\r|\n)/g, "\n");
      // console.log(content)
    }})
  }
  catch(error){
    console.log(error)
  }


  return (
    <div className="flex ml-[1vw] my-[2vh]">
      <div className="flex">
        <div className="relative">
          <div className="flex justify-center align-middle w-[14vw] sm:w-[7.5vw]">
            <img src="echo.png" width={100} alt="Echo Logo" />
          </div>
        </div>
        <div className="flex flex-col justify-center max-w-[70%]">
          <div className="bg-[#D9D9D9] rounded-xl text-sm p-2 sm:p-3">
           {content}
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotChat;
