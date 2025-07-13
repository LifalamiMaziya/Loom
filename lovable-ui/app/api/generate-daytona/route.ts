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

  // This creates a streamable response so the user sees real-time logs
  const readableStream = new ReadableStream({
    start(controller) {
      // Point to the new script we are about to create
      const scriptPath = "scripts/generate-with-gemini.ts";
      const child = spawn("npx", ["tsx", scriptPath, prompt], {
        env: {
          ...process.env,
          // Securely pass the API keys to the script's environment
          DAYTONA_API_KEY: process.env.DAYTONA_API_KEY,
          GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        },
        shell: true, // Use shell to ensure npx is found
      });

      // Stream stdout (standard output) from the script to the browser
      child.stdout.on("data", (data) => {
        controller.enqueue(data);
      });

      // Stream stderr (error output) as well
      child.stderr.on("data", (data) => {
        controller.enqueue(data);
      });

      // When the script finishes, close the connection
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
