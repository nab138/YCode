import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import Menu from "@mui/joy/Menu";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import { useCallback, useEffect, useRef, useState } from "react";
import MenuBarButton from "./MenuBarButton";
import MenuGroup, { MenuBarData } from "./MenuGroup";
import { Shortcut, acceleratorPresssed } from "../../utilities/Shortcut";
import CommandButton from "../CommandButton";
import {
  Construction,
  PhonelinkSetup,
  Refresh,
  CleaningServices,
} from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Divider, Option, Select } from "@mui/joy";
import { DeviceInfo, useIDE } from "../../utilities/IDEContext";
import { useStore } from "../../utilities/StoreContext";
import { useToast } from "react-toast-plus";

const bar = [
  {
    label: "File",
    items: [
      {
        label: "New",
        items: [
          {
            name: "New File...",
            shortcut: "Ctrl+N",
            callback: () => {
              console.log("New File!");
            },
          },
          {
            name: "New Project...",
            callbackName: "newProject",
          },
        ],
      },
      {
        label: "Open",
        items: [
          {
            name: "Open File...",
            shortcut: "Ctrl+O",
            callback: () => {
              console.log("Open File!");
            },
          },
          {
            name: "Open Folder...",
            callbackName: "openFolderDialog",
          },
        ],
      },
      {
        label: "Save",
        items: [
          {
            name: "Save",
            shortcut: "Ctrl+S",
            callbackName: "save",
          },
          {
            name: "Save As...",
            shortcut: "Ctrl+Shift+S",
            callback: () => {
              console.log("Save As!");
            },
          },
        ],
      },
    ],
  },
  {
    label: "Edit",
    items: [
      {
        label: "Timeline",
        items: [
          {
            name: "Undo",
            shortcut: "Ctrl+Z",
            callback: () => {
              console.log("Undo!");
            },
          },
          {
            name: "Redo",
            shortcut: "Ctrl+Shift+Z",
            callback: () => {
              console.log("Redo!");
            },
          },
        ],
      },
      {
        label: "Settings",
        items: [
          {
            name: "Preferences...",
            callback: async () => {
              let prefsWindow = await WebviewWindow.getByLabel("prefs");
              if (prefsWindow) {
                prefsWindow.show();
                prefsWindow.center();
                prefsWindow.setFocus();
                return;
              }

              const appWindow = new WebviewWindow("prefs", {
                title: "Preferences",
                resizable: false,
                width: 800,
                height: 600,
                url: "/preferences/general",
              });
              appWindow.once("tauri://created", function () {
                appWindow.center();
              });
              appWindow.once("tauri://error", function (e) {
                console.error("Error creating window:", e);
              });
            },
          },
        ],
      },
    ],
  },
  {
    label: "View",
    items: [
      {
        label: "Navigation",
        items: [
          {
            name: "Show Welcome Page",
            callbackName: "welcomePage",
          },
        ],
      },
      {
        label: "Debug",
        items: [
          {
            name: "Reload Window",
            callback: async () => {
              window.location.reload();
            },
            shortcut: "Ctrl+R",
          },
        ],
      },
    ],
  },
  {
    label: "Help",
    items: [
      {
        label: "About YCode",
        items: [
          {
            name: "View Github",
            callback: () => {
              openUrl("https://github.com/nab138/YCode");
            },
          },
        ],
      },
    ],
  },
] as MenuBarData;

export interface MenuBarProps {
  callbacks: Record<string, () => void>;
}
export default function MenuBar({ callbacks }: MenuBarProps) {
  const menus = useRef<Array<HTMLButtonElement>>([]);
  const [menuIndex, setMenuIndex] = useState<null | number>(null);

  const resetMenuIndex = useCallback(() => setMenuIndex(null), []);
  const { path } = useParams<"path">();
  const { devices } = useIDE();
  const [anisetteServer] = useStore<string>(
    "apple-id/anisette-server",
    "ani.sidestore.io"
  );
  const { addToast } = useToast();

  useEffect(() => {
    const items: { shortcut: Shortcut; callback: () => void }[] = [];

    for (const menu of bar) {
      for (const group of menu.items) {
        for (const item of group.items) {
          if (item.shortcut) {
            const shortcut = Shortcut.fromString(item.shortcut);
            let callback;
            if (item.callbackName !== undefined) {
              callback = callbacks[item.callbackName];
            } else {
              callback = item.callback ?? (() => {});
            }
            items.push({
              shortcut,
              callback,
            });
          }
        }
      }
    }

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (!acceleratorPresssed(event)) return;

      for (const item of items) {
        if (item.shortcut.pressed(event)) {
          event.preventDefault();
          item.callback();
        }
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [bar, callbacks]);

  const openNextMenu = () => {
    if (typeof menuIndex === "number") {
      if (menuIndex === menus.current.length - 1) {
        setMenuIndex(0);
      } else {
        setMenuIndex(menuIndex + 1);
      }
    }
  };

  const openPreviousMenu = () => {
    if (typeof menuIndex === "number") {
      if (menuIndex === 0) {
        setMenuIndex(menus.current.length - 1);
      } else {
        setMenuIndex(menuIndex - 1);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      openNextMenu();
    }
    if (event.key === "ArrowLeft") {
      openPreviousMenu();
    }
  };

  const createHandleButtonKeyDown =
    (index: number) => (event: React.KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        if (index === menus.current.length - 1) {
          menus.current[0]?.focus();
        } else {
          menus.current[index + 1]?.focus();
        }
      }
      if (event.key === "ArrowLeft") {
        if (index === 0) {
          menus.current[menus.current.length]?.focus();
        } else {
          menus.current[index - 1]?.focus();
        }
      }
    };

  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    if (devices.length > 0) {
      setSelectedDevice(devices[0]);
    } else {
      setSelectedDevice(null);
    }
  }, [devices]);

  return (
    <List
      size="sm"
      orientation="horizontal"
      aria-label="YCode menu bar"
      role="menubar"
      sx={{
        bgcolor: "background.body",
        width: "100%",
        borderColor: "divider",
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
        paddingRight: 0,
      }}
    >
      {bar &&
        bar.map((menu, index) => (
          <ListItem key={index}>
            <MenuBarButton
              open={menuIndex === index}
              onOpen={() => {
                setMenuIndex((prevMenuIndex) =>
                  prevMenuIndex === null ? index : null
                );
              }}
              onKeyDown={createHandleButtonKeyDown(1)}
              onMouseEnter={() => {
                if (typeof menuIndex === "number") {
                  setMenuIndex(index);
                }
              }}
              ref={(instance) => {
                menus.current[index] = instance!;
              }}
              menu={
                <Menu
                  size="sm"
                  onClose={() => {
                    menus.current[index]?.focus();
                  }}
                >
                  <MenuGroup
                    handleKeyDown={handleKeyDown}
                    resetMenuIndex={resetMenuIndex}
                    groups={menu.items}
                    callbacks={callbacks}
                  />
                </Menu>
              }
            >
              {menu.label}
            </MenuBarButton>
          </ListItem>
        ))}
      <CommandButton
        variant="plain"
        command="clean_swift"
        icon={<CleaningServices />}
        parameters={{ folder: path }}
        sx={{ marginLeft: "auto", marginRight: 0 }}
      />
      <CommandButton
        variant="plain"
        command="build_swift"
        icon={<Construction />}
        parameters={{ folder: path }}
        sx={{ marginRight: 0 }}
      />
      <Divider orientation="vertical" />
      <div style={{ display: "flex", alignItems: "center" }}>
        <CommandButton
          variant="plain"
          command="refresh_idevice"
          icon={<Refresh />}
          parameters={{}}
          sx={{ marginLeft: 0, marginRight: 0 }}
          clearConsole={false}
        />
        <Select
          size="sm"
          value={selectedDevice?.id.toString() ?? "none"}
          onChange={(_, value) => {
            setSelectedDevice(
              devices.find((d) => d.id.toString() === value) || null
            );
          }}
          placeholder="Select Device..."
        >
          {devices.length < 1 && (
            <Option disabled value="none">
              No devices connected
            </Option>
          )}
          {devices.map((device, index) => (
            <Option key={index} value={device.id.toString()}>
              {device.name}
            </Option>
          ))}
        </Select>
        <CommandButton
          variant="plain"
          command="deploy_swift"
          icon={<PhonelinkSetup />}
          parameters={{
            folder: path,
            anisetteServer,
            device: selectedDevice,
          }}
          validate={() => {
            if (!selectedDevice) {
              addToast.error("Please select a device to deploy to.");
              return false;
            }
            return true;
          }}
          sx={{ marginRight: 0 }}
        />
      </div>
    </List>
  );
}
