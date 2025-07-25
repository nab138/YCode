import { Button, Typography } from "@mui/joy";
import { useIDE } from "../utilities/IDEContext";
import { open } from "@tauri-apps/plugin-dialog";
import { useToast } from "react-toast-plus";
import { useCallback, useEffect } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { installSdkOperation } from "../utilities/operations";

export default () => {
  const { selectedToolchain, hasDarwinSDK, checkSDK, startOperation, isWindows, hasWSL } =
    useIDE();
  const { addToast } = useToast();

  const isWindowsReady = !isWindows || hasWSL;

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
    const params = {
      xcodePath: xipPath,
      toolchainPath: selectedToolchain?.path || "",
    };
    await startOperation(installSdkOperation, params);
    checkSDK();
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
        {isWindowsReady ? (hasDarwinSDK
          ? "Darwin SDK is installed!"
          : "Darwin SDK is not installed.") : "Install WSL and Swift first."}
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
