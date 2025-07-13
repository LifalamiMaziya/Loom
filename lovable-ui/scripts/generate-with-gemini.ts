// scripts/generate-with-gemini.ts

import { Daytona } from "@daytonaio/sdk";

async function main() {
  const prompt = process.argv[2];

  if (!prompt) {
    console.error("Error: No prompt provided.");
    process.exit(1);
  }

  if (!process.env.DAYTONA_API_KEY || !process.env.GEMINI_API_KEY) {
    console.error("Error: Missing DAYTONA_API_KEY or GEMINI_API_KEY");
    process.exit(1);
  }

  console.log("Initializing Daytona...");
  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
  });

  console.log("Creating a new sandbox environment...");
  const sandbox = await daytona.createSandbox({
    image: "node:20",
    name: "gemini-app-generator",
  });

  try {
    console.log("Sandbox created. Installing Gemini CLI...");
    // Install Gemini CLI globally in the sandbox
    await sandbox.execute("npm install -g @google/gemini-cli");
    console.log("Gemini CLI installed.");

    // Set the Gemini API Key as an environment variable within the sandbox
    await sandbox.execute(`export GEMINI_API_KEY="${process.env.GEMINI_API_KEY}"`);
    console.log("Gemini API key configured in sandbox.");
    
    console.log(`Generating app with the following prompt: "${prompt}"`);
    
    // Execute the Gemini CLI with the user's prompt.
    // We run this non-interactively.
    const generationProcess = await sandbox.spawn(
        "gemini", 
        ["--non-interactive", prompt]
    );

    // Wait for the generation to complete
    await new Promise<void>((resolve, reject) => {
      generationProcess.stdout.on('data', (data) => console.log(data.toString()));
      generationProcess.stderr.on('data', (data) => console.error(data.toString()));
      generationProcess.on('close', (code) => {
        if (code === 0) {
          console.log("Gemini code generation completed successfully.");
          resolve();
        } else {
          reject(new Error(`Gemini CLI process exited with code ${code}`));
        }
      });
    });

    console.log("Installing project dependencies...");
    await sandbox.execute("npm install");

    console.log("Starting the development server...");
    await sandbox.spawn("npm", ["run", "dev"], { detached: true });

    console.log("Getting preview link...");
    const previewLink = await sandbox.getPreviewLink(3000);

    console.log("\n✅ Your app is ready! ✅\n");
    console.log(`Preview URL: ${previewLink}`);

    // Send a special message to the frontend to signal completion
    console.log(`[PREVIEW_URL]${previewLink}`);

  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    // You might want to add logic to destroy the sandbox later
    // await sandbox.destroy();
  }
}

main();
