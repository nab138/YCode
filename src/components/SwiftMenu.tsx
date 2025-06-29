import { Button, FormControl, Radio, RadioGroup, Typography } from "@mui/joy";
import { Toolchain, useIDE } from "../utilities/IDEContext";
import { useMemo } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";

export default () => {
  const {
    selectedToolchain,
    setSelectedToolchain,
    toolchains,
    scanToolchains,
    locateToolchain,
  } = useIDE();

  const allToolchains = useMemo(() => {
    let all: Toolchain[] = [];
    if (toolchains !== null && toolchains.toolchains) {
      all = [...toolchains.toolchains];
    }
    if (
      selectedToolchain &&
      !all.some(
        (t) => stringifyToolchain(t) === stringifyToolchain(selectedToolchain)
      )
    ) {
      all.push(selectedToolchain);
    }
    return all;
  }, [selectedToolchain, toolchains]);
  return (
    <div style={{ width: "fit-content" }}>
      <Typography level="body-sm">
        {toolchains === null
          ? "Checking for Swift..."
          : toolchains.swiftlyInstalled
          ? `Swiftly Detected: ${toolchains.swiftlyVersion}`
          : "YCode was unable to detect Swiftly."}
      </Typography>
      {toolchains !== null && allToolchains.length === 0 && (
        <Typography
          level="body-md"
          style={{ marginBottom: "var(--padding-md)" }}
          color="warning"
        >
          No Swift toolchains found. You can install one using "
          <span
            style={{
              fontFamily: "monospace",
            }}
          >
            swiftly install latest
          </span>
          " or manually.
        </Typography>
      )}
      {toolchains !== null && allToolchains.length > 0 && (
        <>
          <Typography level="body-md">Select a toolchain:</Typography>
          <RadioGroup
            value={stringifyToolchain(selectedToolchain)}
            sx={{
              marginTop: "var(--padding-xs)",
            }}
          >
            {allToolchains.map((toolchain) => (
              <FormControl
                sx={{ marginBottom: "var(--padding-md)" }}
                key={stringifyToolchain(toolchain)}
              >
                <Radio
                  label={toolchain.version}
                  value={stringifyToolchain(toolchain)}
                  variant="outlined"
                  overlay
                  onChange={() => setSelectedToolchain(toolchain)}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--padding-xs)",
                  }}
                >
                  <Typography level="body-sm">{toolchain.path}</Typography>
                  <Typography level="body-sm" color="primary">
                    {toolchain.isSwiftly ? "(Swiftly)" : "(Manually Installed)"}
                  </Typography>
                </div>
              </FormControl>
            ))}
          </RadioGroup>
        </>
      )}
      <div
        style={{
          display: "flex",
          gap: "var(--padding-md)",
        }}
      >
        {
          <Button variant="soft" onClick={locateToolchain}>
            Locate Existing Toolchain
          </Button>
        }
        {toolchains?.swiftlyInstalled === false &&
          selectedToolchain === null && (
            <Button
              variant="soft"
              onClick={() => {
                openUrl("https://swift.org/install/");
              }}
            >
              Download Swift
            </Button>
          )}
        {
          <Button
            variant="soft"
            onClick={() => {
              scanToolchains();
            }}
          >
            Scan Again
          </Button>
        }
      </div>
    </div>
  );
};

function stringifyToolchain(toolchain: Toolchain | null): string | null {
  if (!toolchain) return null;
  return `${toolchain.path}:${toolchain.version}:${toolchain.isSwiftly}`;
}
