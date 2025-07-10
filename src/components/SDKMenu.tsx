import { Button, Typography } from "@mui/joy";
import { useIDE } from "../utilities/IDEContext";
import { open } from "@tauri-apps/plugin-dialog";
import { useToast } from "react-toast-plus";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";

export default () => {
  const { selectedToolchain, hasDarwinSDK, checkSDK } = useIDE();
  const { addToast } = useToast();

  const install = useCallback(async () => {
    let xipPath = await open({
      directory: false,
      multiple: false,
      filters: [
        {
          name: "XCode",
          extensions: ["xip"],
        },
      ],
    });
    if (!xipPath) {
      addToast.error("No Xcode.xip selected");
      return;
    }
    let promise = invoke("install_sdk", {
      xcodePath: xipPath,
      toolchainPath: selectedToolchain?.path || "",
    });
    addToast.promise(promise, {
      pending: "Installing SDK (this may take a while)...",
      success: () => {
        checkSDK();
        return "SDK installed successfully!";
      },
      error: (e) => {
        console.error("Failed to install SDK:", e);
        return `Failed to install SDK: ${e}`;
      },
    });
  }, [selectedToolchain, addToast]);

  useEffect(() => {
    checkSDK();
  }, [checkSDK]);

  if (hasDarwinSDK === null) {
    return <div>Checking for SDK...</div>;
  }

  return (
    <div
      style={{
        width: "fit-content",
        display: "flex",
        flexDirection: "column",
        gap: "var(--padding-md)",
      }}
    >
      <Typography level="body-md" color={hasDarwinSDK ? "success" : "danger"}>
        {hasDarwinSDK
          ? "Darwin SDK is installed!"
          : "Darwin SDK is not installed."}
      </Typography>
      <div
        style={{
          display: "flex",
          gap: "var(--padding-md)",
        }}
      >
        <Button
          variant="soft"
          onClick={(e) => {
            e.preventDefault();
            openUrl(
              "https://developer.apple.com/services-account/download?path=/Developer_Tools/Xcode_16.3/Xcode_16.3.xip"
            );
          }}
        >
          Download XCode
        </Button>
        <Button variant="soft" onClick={install} disabled={!selectedToolchain}>
          {hasDarwinSDK ? "Reinstall SDK" : "Install SDK"}
        </Button>
        <Button variant="soft" onClick={checkSDK} disabled={!selectedToolchain}>
          Check Again
        </Button>
      </div>
    </div>
  );
};
