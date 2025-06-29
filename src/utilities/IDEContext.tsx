// create a context to store a few state values about the system that are checked at startup
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { Window } from "@tauri-apps/api/window";
import { emit, listen } from "@tauri-apps/api/event";
import * as dialog from "@tauri-apps/plugin-dialog";
import { useToast } from "react-toast-plus";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Checkbox,
  Input,
  Modal,
  ModalDialog,
  Typography,
} from "@mui/joy";
import { useCommandRunner } from "./Command";
import { useStore } from "./StoreContext";

export interface IDEContextType {
  initialized: boolean;
  isWindows: boolean;
  hasWSL: boolean;
  toolchains: ListToolchainResponse | null;
  selectedToolchain: Toolchain | null;
  devices: DeviceInfo[];
  openFolderDialog: () => void;
  consoleLines: string[];
  setConsoleLines: React.Dispatch<React.SetStateAction<string[]>>;
  scanToolchains: () => Promise<void>;
  locateToolchain: () => Promise<void>;
  setSelectedToolchain: (
    value: Toolchain | ((oldValue: Toolchain | null) => Toolchain | null) | null
  ) => void;
}

export type DeviceInfo = {
  name: string;
  id: number;
  uuid: string;
};

export type Toolchain = {
  version: string;
  path: string;
  isSwiftly: boolean;
};

type ListToolchainResponseWithSwiftly = {
  swiftlyInstalled: true;
  swiftlyVersion: string;
  toolchains: Toolchain[];
};

type ListToolchainResponseWithoutSwiftly = {
  swiftlyInstalled: false;
  swiftlyVersion: null;
  toolchains: Toolchain[];
};

export type ListToolchainResponse =
  | ListToolchainResponseWithSwiftly
  | ListToolchainResponseWithoutSwiftly;

export const IDEContext = createContext<IDEContextType | null>(null);

export const IDEProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isWindows, setIsWindows] = useState<boolean>(false);
  const [hasWSL, setHasWSL] = useState<boolean>(false);
  const [toolchains, setToolchains] = useState<ListToolchainResponse | null>(
    null
  );
  const [initialized, setInitialized] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [selectedToolchain, setSelectedToolchain] = useStore<Toolchain | null>(
    "swift/selected-toolchain",
    null
  );

  const scanToolchains = useCallback(() => {
    return invoke<ListToolchainResponse>("get_swiftly_toolchains").then(
      (response) => {
        if (response) {
          setToolchains(response);
        }
      }
    );
  }, []);

  const locateToolchain = useCallback(async () => {
    const path = await dialog.open({
      directory: true,
      multiple: false,
    });
    if (!path) {
      addToast.error("No path selected");
      return;
    }
    if (await invoke("validate_toolchain", { toolchainPath: path })) {
      const version = await invoke<string>("get_toolchain_version", {
        toolchainPath: path,
      }).catch((error) => {
        console.error("Error getting toolchain version:", error);
        addToast.error("Failed to get toolchain version");
        return null;
      });
      if (!version) {
        addToast.error("Invalid toolchain path or version not found");
        return;
      }
      if (version) {
        const toolchain: Toolchain = {
          version: version,
          path: path,
          isSwiftly: false,
        };
        setSelectedToolchain(toolchain);
      }
    } else {
      addToast.error("Invalid toolchain path");
    }
  }, []);

  useEffect(() => {
    let initPromises: Promise<void>[] = [];
    initPromises.push(scanToolchains());
    initPromises.push(
      invoke("has_wsl").then((response) => {
        setHasWSL(response as boolean);
      })
    );
    initPromises.push(
      invoke("is_windows").then((response) => {
        setIsWindows(response as boolean);
      })
    );

    Promise.all(initPromises)
      .then(() => {
        setInitialized(true);
      })
      .catch((error) => {
        console.error("Error initializing IDE context:", error);
        alert(
          "An error occurred while initializing the IDE context. Please check the console for details."
        );
      });
  }, []);

  useEffect(() => {
    if (initialized) {
      let changeWindows = async () => {
        let splash = await Window.getByLabel("splashscreen");
        let main = await Window.getByLabel("main");
        if (splash && main) {
          splash.close();
          await main.show();
          main.setFocus();
        }
      };
      changeWindows();
    }
  }, [initialized]);

  const listenerAdded = useRef(false);
  const listener2Added = useRef(false);
  const listener3Added = useRef(false);
  const unlisten = useRef<() => void>(() => {});
  const unlisten2fa = useRef<() => void>(() => {});
  const unlistenAppleid = useRef<() => void>(() => {});

  const { addToast } = useToast();

  const [tfaOpen, setTfaOpen] = useState(false);
  const tfaInput = useRef<HTMLInputElement | null>(null);
  const [appleIdOpen, setAppleIdOpen] = useState(false);
  const appleIdInput = useRef<HTMLInputElement | null>(null);
  const applePassInput = useRef<HTMLInputElement | null>(null);
  const saveCredentials = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!listenerAdded.current) {
      (async () => {
        const unlistenFn = await listen("idevices", (event) => {
          let devices = event.payload as DeviceInfo[];
          console.log("Received devices:", devices);
          setDevices(devices);
          if (devices.length === 0) {
            addToast.info("No devices found");
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

  useEffect(() => {
    if (!listener2Added.current) {
      (async () => {
        const unlistenFn = await listen("2fa-required", () => {
          setTfaOpen(true);
        });
        unlisten2fa.current = unlistenFn;
      })();
      listener2Added.current = true;
    }
    return () => {
      unlisten2fa.current();
    };
  }, []);

  useEffect(() => {
    if (!listener3Added.current) {
      (async () => {
        const unlistenFn = await listen("apple-id-required", () => {
          setAppleIdOpen(true);
        });
        unlistenAppleid.current = unlistenFn;
      })();
      listener3Added.current = true;
    }
    return () => {
      unlistenAppleid.current();
    };
  }, []);

  const navigate = useNavigate();

  const openFolderDialog = useCallback(async () => {
    const path = await dialog.open({
      directory: true,
      multiple: false,
    });
    if (path) {
      navigate("/ide/" + encodeURIComponent(path));
    }
  }, []);

  const { cancelCommand } = useCommandRunner();

  const contextValue = useMemo(
    () => ({
      isWindows,
      hasWSL,
      toolchains,
      initialized,
      devices,
      openFolderDialog,
      consoleLines,
      setConsoleLines,
      selectedToolchain,
      scanToolchains,
      locateToolchain,
      setSelectedToolchain,
    }),
    [
      isWindows,
      hasWSL,
      toolchains,
      initialized,
      devices,
      openFolderDialog,
      consoleLines,
      setConsoleLines,
      selectedToolchain,
      scanToolchains,
      locateToolchain,
      setSelectedToolchain,
    ]
  );

  return (
    <IDEContext.Provider value={contextValue}>
      {children}
      <Modal
        open={tfaOpen}
        onClose={() => {
          if (!tfaInput.current?.value) {
            addToast.error("Please enter a 2FA code");
            return;
          }
          emit("2fa-recieved", tfaInput.current?.value || "");
          setTfaOpen(false);
        }}
      >
        <ModalDialog>
          <Typography level="body-md">
            A two-factor authentication code has been sent, please enter it
            below.
          </Typography>
          <form
            onSubmit={() => {
              if (!tfaInput.current?.value) {
                addToast.error("Please enter a 2FA code");
                return;
              }
              emit("2fa-recieved", tfaInput.current?.value || "");
              setTfaOpen(false);
              tfaInput.current!.value = ""; // Clear the input after submission
              return false; // Prevent form submission
            }}
          >
            <Input type="number" slotProps={{ input: { ref: tfaInput } }} />
            <Button
              variant="soft"
              sx={{
                margin: "10px 0",
                width: "100%",
              }}
              type="submit"
            >
              Submit
            </Button>
          </form>
        </ModalDialog>
      </Modal>
      <Modal
        open={appleIdOpen}
        onClose={() => {
          setAppleIdOpen(false);
          appleIdInput.current!.value = "";
          applePassInput.current!.value = "";
          emit("login-cancelled");
          cancelCommand();
        }}
      >
        <ModalDialog>
          <Typography level="body-md">
            Login with your apple account to continue
          </Typography>
          <Typography level="body-xs">
            Your credentials will only be sent to apple. In general, never trust
            a third-party app with your Apple ID. We recommend using a burner
            account with YCode and other sideloaders. (YCode is not very secure)
          </Typography>
          <form
            onSubmit={() => {
              if (
                appleIdInput.current?.value &&
                applePassInput.current?.value
              ) {
                setAppleIdOpen(false);
                emit("apple-id-recieved", {
                  appleId: appleIdInput.current.value,
                  applePass: applePassInput.current.value,
                  saveCredentials: saveCredentials.current?.checked || false,
                });
              } else {
                addToast.error("Please enter your Apple ID and password");
              }
              return false;
            }}
          >
            <Input
              type="text"
              slotProps={{ input: { ref: appleIdInput } }}
              placeholder="Apple ID"
              sx={{ marginBottom: "var(--padding-sm)" }}
            />
            <Input
              type="password"
              slotProps={{ input: { ref: applePassInput } }}
              placeholder="Password"
            />
            <Checkbox
              slotProps={{ input: { ref: saveCredentials } }}
              sx={{ marginTop: "var(--padding-sm)", color: "grey" }}
              label="Remember credentials"
              size="sm"
            />
            <Button
              variant="soft"
              sx={{
                margin: "var(--padding-md) 0",
                width: "100%",
                marginBottom: "0",
              }}
              type="submit"
            >
              Submit
            </Button>
            <Button
              variant="soft"
              sx={{
                margin: "var(--padding-md) 0",
                width: "100%",
                marginBottom: "0",
              }}
              onClick={() => {
                setAppleIdOpen(false);
                appleIdInput.current!.value = "";
                applePassInput.current!.value = "";
                emit("login-cancelled");
                cancelCommand();
              }}
              color="neutral"
            >
              Cancel
            </Button>
          </form>
        </ModalDialog>
      </Modal>
    </IDEContext.Provider>
  );
};

export const useIDE = () => {
  const context = React.useContext(IDEContext);
  if (!context) {
    throw new Error("useIDEContext must be used within an IDEContextProvider");
  }
  return context;
};
