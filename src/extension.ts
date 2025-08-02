import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

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
        if (message.command === "prompt") {
          console.log("🧠 Got prompt from webview:", message.value);

          try {
            const response = await fetch("http://127.0.0.1:8000/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: message.value }),
            });

            const data = (await response.json()) as { code: string };
            if (typeof data === "object" && "code" in data) {
              panel.webview.postMessage({
                command: "answer",
                value: (data as any).code,
              });
              console.log("✅ Backend responded:", data);
            }
          } catch (err) {
            console.error("❌ Fetch error:");
            panel.webview.postMessage({
              command: "response",
              value: "Failed to connect to backend: ",
            });
          }
        }
      });
    })
  );
}

export function deactivate() {}
