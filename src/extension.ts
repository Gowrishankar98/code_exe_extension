import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

// Define the expected response shapes from backend
interface GenerateResponse {
  original?: string;
  file_path?: string;
}

interface ImproveResponse {
  improved?: string;
  file_path?: string;
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("code_exe.generateCode", () => {
      const panel = vscode.window.createWebviewPanel(
        "code_exeChat",
        "💬 Code_exe Chat",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, "media")),
          ],
        }
      );

      const htmlPath = path.join(context.extensionPath, "src", "panel.html");
      const htmlContent = fs.readFileSync(htmlPath, "utf8");
      panel.webview.html = htmlContent;

      panel.webview.onDidReceiveMessage(async (message) => {
        console.log("📥 Got message from webview:", message.command);

        // -----------------------
        // Code GENERATION flow
        // -----------------------
        if (message.command === "prompt") {
          console.log("🧠 Got prompt from webview:", message.value);

          try {
            const response = await fetch("http://127.0.0.1:8000/code", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                mode: "generate",
                prompt: message.value,
                auto_save: true, // Set true for file save
                filename: "output.js",
              }),
            });

            const data = (await response.json()) as GenerateResponse;
            if (data.original) {
              panel.webview.postMessage({
                command: "answer",
                value: data.original,
              });
              console.log("✅ Backend responded:", data);
            }
          } catch (err) {
            console.error("❌ Fetch error:", err);
            panel.webview.postMessage({
              command: "response",
              value: "Failed to connect to backend.",
            });
          }
        }

        // -----------------------
        // Code IMPROVEMENT flow
        // -----------------------
        if (message.command === "improve") {
          try {
            const response = await fetch("http://127.0.0.1:8000/code", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                mode: "improve",
                code: message.code,
                auto_save: false,
                filename: "improved.js",
              }),
            });

            const data = (await response.json()) as ImproveResponse;
            if (data.improved) {
              panel.webview.postMessage({
                command: "answer",
                value: data.improved,
              });
              console.log("✅ Backend improvement responded:", data);
            }
          } catch (err) {
            console.error("❌ Fetch error (improve):", err);
            panel.webview.postMessage({
              command: "response",
              value: "Failed to connect to backend (improve).",
            });
          }
        }
      });
    })
  );
}

export function deactivate() {}
