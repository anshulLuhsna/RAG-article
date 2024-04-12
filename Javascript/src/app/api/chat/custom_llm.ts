import { LLM, type BaseLLMParams } from "@langchain/core/language_models/llms";
import type { CallbackManagerForLLMRun } from "langchain/callbacks";
import { GenerationChunk } from "langchain/schema";


export interface CustomLLMInput extends BaseLLMParams {
    // Add any custom parameters your LLM might need
    apiKey: string;
  }
  
  export class CustomLLM extends LLM {
    apiKey: string;
  
    constructor(fields: CustomLLMInput) {
      super(fields);
      this.apiKey = fields.apiKey;
    }
  
    _llmType(): string {
      return "custom_llm";
    }
  
    async _call(
      prompt: string,
      options: this["ParsedCallOptions"],
      runManager: CallbackManagerForLLMRun
    ): Promise<string> {
    //   console.log("Inside callAPi")

      // Implement the logic to call the WorqHat API
      const response = await this.callWorqHatAPI(prompt, options, runManager);
      return response;
    }
  
    async *_streamResponseChunks(
      prompt: string,
      options: this["ParsedCallOptions"],
      runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<GenerationChunk> {
    //   console.log("Inside _streamResponseChunks")
      // Implement the logic to stream the response from the WorqHat API
      const stream = await this.streamWorqHatAPI(prompt, options, runManager);
      for await (const chunk of stream) {
        yield chunk;
      }
    }
  
    private async callWorqHatAPI(
      prompt: string,
      options: this["ParsedCallOptions"],
      runManager: CallbackManagerForLLMRun
    ): Promise<string> {
    //   console.log("Inside callAPi")
      // Implement the logic to call the WorqHat API and return the response
      // You can use the `fetch` function or a library like `axios` to make the API call
      // Make sure to handle any errors and pass the `runManager` to enable tracing
      const response = await fetch("https://api.worqhat.com/api/ai/content/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          // Construct the request body based on the WorqHat API requirements
          "question": prompt
          // Include any other necessary parameters
        }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
  
      return await response.text();
    }
  
    private async *streamWorqHatAPI(
        prompt: string,
        options: this["ParsedCallOptions"],
        runManager?: CallbackManagerForLLMRun
      ): AsyncGenerator<GenerationChunk> {
        // console.log(prompt);
      
        // Extract message, context, and history using regular expressions
        const messageRegex = /question\s*:\s*(.*)/i;
        const contextRegex = /context\s*:\s*([\s\S]*)/i;
        const historyRegex = /history\s*:\s*(\[[\s\S]*?\])/i;
      
        const messageMatch = prompt.match(messageRegex);
        const contextMatch = prompt.match(contextRegex);
        const historyMatch = prompt.match(historyRegex);
      
        const message = messageMatch ? messageMatch[1].trim() : "";
        const context = contextMatch ? contextMatch[1].trim() : "";
        const historyString = historyMatch ? historyMatch[1].trim() : "[]";
      
        // Parse history string into an array of messages
        const history = JSON.parse(historyString);
        console.log(history)
        const response = await fetch("https://api.worqhat.com/api/ai/content/v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            "question": message,
            "training_data": context,
            "preserve_history": true,
            "conversation_history": history,
            "stream_data": true
          }),
        });
      
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
      
        const reader = response.body.getReader();
        let result = await reader.read();
        while (!result.done) {
          yield new GenerationChunk({
            text: new TextDecoder().decode(result.value),
          });
          await runManager?.handleLLMNewToken(new TextDecoder().decode(result.value));
          result = await reader.read();
        }
      }
  }
  