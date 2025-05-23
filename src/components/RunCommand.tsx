// Create a simple component to display text in a console-style in a mui joy modal.

import {
  Button,
  Input,
  Modal,
  ModalClose,
  ModalDialog,
  Typography,
} from "@mui/joy";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import Convert from "ansi-to-html";
import "./RunCommand.css";
import { invoke } from "@tauri-apps/api/core";

const convert = new Convert();

interface RunCommandProps {
  title: string;
  failedMessage?: string;
  doneMessage?: string;
  command: string;
  listener: string;
  run: boolean;
  setRun: (run: boolean) => void;
  askPassword?: boolean;
}

export default ({
  title,
  command,
  listener,
  run,
  setRun,
  failedMessage,
  doneMessage,
  askPassword,
}: RunCommandProps) => {
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState("");

  const [body, setBody] = useState("");
  const [html, setHtml] = useState("");
  const [status, setStatus] = useState("none");

  const preRef = useRef<HTMLPreElement | null>(null);
  const listenerAdded = useRef(false);
  const hasRun = useRef(false);
  const passwordAsked = useRef(false);

  function startCommand() {
    if (hasRun.current) return;
    setOpen(true);
    setStatus("running");
    if (askPassword) {
      invoke(command, { password });
      setPassword("");
    } else {
      invoke(command);
    }
    hasRun.current = true;
  }
  useEffect(() => {
    if (run && askPassword && !passwordAsked.current) {
      setPasswordOpen(true);
      passwordAsked.current = true;
    } else if (run && !hasRun.current) {
      startCommand();
    }
  }, [run]);

  useEffect(() => {
    if (!listenerAdded.current) {
      listen(listener, (event) => {
        let line = event.payload as string;
        if (line.includes("command.done")) {
          if (line.split(".")[2] !== "0") {
            setStatus("failed");
            return;
          }
          setStatus("done");
          return;
        }
        setBody((body) => body + line + "\n");
      });
      listenerAdded.current = true;
    }
  }, []);

  useEffect(() => {
    if (open) {
      if (body.startsWith("\n")) {
        setHtml(convert.toHtml(body.slice(1)));
      } else {
        setHtml(convert.toHtml(body));
      }
    }
  }, [body]);

  useEffect(() => {
    if (preRef.current) {
      const element = preRef.current;
      setTimeout(() => {
        element.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 0);
    }
  }, [html]);

  return (
    <>
      <Modal
        open={passwordOpen}
        onClose={() => {
          setPasswordOpen(false);
          setPassword("");
          passwordAsked.current = false;
        }}
      >
        <ModalDialog>
          <Typography level="body-md">
            Enter your WSL sudo password. It will not be saved.
          </Typography>
          <form
            onSubmit={() => {
              setPasswordOpen(false);
              startCommand();
            }}
          >
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              variant="soft"
              sx={{
                margin: "10px 0",
                width: "100%",
              }}
            >
              Submit
            </Button>
          </form>
        </ModalDialog>
      </Modal>
      <Modal
        open={open}
        onClose={
          status === "done" || status === "failed"
            ? () => {
                setOpen(false);
                setRun(false);
                setBody("");
                setHtml("");
                setStatus("none");
                hasRun.current = false;
                passwordAsked.current = false;
              }
            : () => {}
        }
      >
        <ModalDialog>
          {(status === "done" || status === "failed") && <ModalClose />}
          <Typography level="h3">
            {status === "failed"
              ? failedMessage ?? "Failed"
              : status === "done"
              ? doneMessage ?? "Done"
              : title}
          </Typography>
          <div className="console">
            <pre ref={preRef} dangerouslySetInnerHTML={{ __html: html }}></pre>
          </div>
        </ModalDialog>
      </Modal>
    </>
  );
};
