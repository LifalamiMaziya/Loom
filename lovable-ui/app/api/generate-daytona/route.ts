// src/app/api/generate-daytona/route.ts

import { NextRequest } from "next/server";
import { spawn } from "child_process";

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  if (!prompt) {
    return new Response(JSON.stringify({ error: "Prompt is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // This creates a streamable response
  const readableStream = new ReadableStream({
    start(controller) {
      // Execute the new generation script
      const scriptPath = "scripts/generate-with-gemini.ts";
      const child = spawn("npx", ["tsx", scriptPath, prompt], {
        env: {
          ...process.env,
          // Pass the API keys to the script's environment
          DAYTONA_API_KEY: process.env.DAYTONA_API_KEY,
          GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        },
        shell: true,
      });

      // Stream stdout from the script to the client
      child.stdout.on("data", (data) => {
        controller.enqueue(data);
      });

      // Stream stderr from the script to the client
      child.stderr.on("data", (data) => {
        controller.enqueue(data);
      });

      child.on("close", (code) => {
        console.log(`Child process exited with code ${code}`);
        controller.close();
      });

      child.on("error", (err) => {
        console.error("Failed to start subprocess.", err);
        controller.error(err);
        controller.close();
      });
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
