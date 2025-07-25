import { useEffect, useRef } from "react";
import "./Console.css";
import { listen } from "@tauri-apps/api/event";
import Convert from "ansi-to-html";
import { Virtuoso } from "react-virtuoso";
import { useIDE } from "../../utilities/IDEContext";

const convert = new Convert();

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function Console() {
  const { consoleLines, setConsoleLines } = useIDE();
  const listenerAdded = useRef(false);
  const unlisten = useRef<() => void>(() => {});

  useEffect(() => {
    if (!listenerAdded.current) {
      (async () => {
        const unlistenFn = await listen("build-output", (event) => {
          let line = event.payload as string;
          if (line.includes("command.done")) {
            if (line.split(".")[2] === "999") {
              setConsoleLines((lines) => [...lines, "Command failed"]);
            } else {
              setConsoleLines((lines) => [
                ...lines,
                "Command finished with exit code: " + line.split(".")[2],
              ]);
            }
          } else {
            setConsoleLines((lines) => [...lines, line]);
          }
        });
        unlisten.current = unlistenFn;
      })();
      listenerAdded.current = true;
    }
    return () => {
      unlisten.current();
    };
  }, []);

  return (
    <div className="console-container">
      <Virtuoso
        className="console-tile"
        atBottomThreshold={10}
        followOutput={"auto"}
        data={consoleLines}
        itemContent={(_, line) => (
          <pre
            style={{ margin: 0, width: "fit-content", padding: 0 }}
            dangerouslySetInnerHTML={{
              __html: convert.toHtml(escapeHtml(line)),
            }}
          />
        )}
      />
    </div>
  );
}
