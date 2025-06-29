use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::device::DeviceInfo;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ToolchainResult {
    pub swiftly_installed: bool,
    pub swiftly_version: Option<String>,
    pub toolchains: Vec<Toolchain>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Toolchain {
    pub version: String,
    pub path: String,
    pub is_swiftly: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct SwiftlyConfig {
    pub installed_toolchains: Vec<String>,
    pub version: String,
}

#[tauri::command]
pub async fn validate_toolchain(toolchain_path: String) -> bool {
    let path = PathBuf::from(toolchain_path);
    if !path.exists() || !path.is_dir() {
        return false;
    }
    let swift_path = path.join("usr").join("bin").join("swift");
    if !swift_path.exists() || !swift_path.is_file() {
        return false;
    }

    true
}

#[tauri::command]
pub async fn get_toolchain_version(toolchain_path: String) -> Result<String, String> {
    if !validate_toolchain(toolchain_path.clone()).await {
        return Err("Invalid toolchain path".to_string());
    }
    let path = PathBuf::from(toolchain_path);
    let swift_path = path.join("usr").join("bin").join("swift");
    if !swift_path.exists() || !swift_path.is_file() {
        return Err("Swift binary not found in toolchain".to_string());
    }

    let output = std::process::Command::new(swift_path)
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to execute swift command: {}", e))?;
    let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let version = version
        .split_whitespace()
        .nth(2)
        .ok_or("Failed to parse swift version".to_string())?
        .to_string();
    Ok(version)
}

#[tauri::command]
pub async fn get_swiftly_toolchains() -> Result<ToolchainResult, String> {
    if !cfg!(target_os = "linux") {
        return Err("YCode only supports linux right now".to_string());
    }
    let swiftly_home_dir = get_swiftly_path();
    if let Some(_) = swiftly_home_dir {
        let config = get_swiftly_config()?;
        let toolchains_unfiltered: Vec<Toolchain> = config
            .installed_toolchains
            .iter()
            .map(|version| {
                let path = PathBuf::from(swiftly_home_dir.as_ref().unwrap())
                    .join("toolchains")
                    .join(version);
                Toolchain {
                    version: version.clone(),
                    path: path.to_string_lossy().to_string(),
                    is_swiftly: true,
                }
            })
            .collect();

        let mut toolchains = Vec::new();
        for toolchain in toolchains_unfiltered {
            if validate_toolchain(toolchain.path.clone()).await {
                toolchains.push(toolchain);
            }
        }

        return Ok(ToolchainResult {
            swiftly_installed: true,
            swiftly_version: Some(config.version),
            toolchains,
        });
    } else {
        return Ok(ToolchainResult {
            swiftly_installed: false,
            swiftly_version: None,
            toolchains: vec![],
        });
    }
}

fn get_swiftly_config() -> Result<SwiftlyConfig, String> {
    let swiftly_home_dir = get_swiftly_path().ok_or("Swiftly home directory not found")?;

    let config_path = format!("{}/config.json", swiftly_home_dir);
    let content = std::fs::read_to_string(&config_path)
        .map_err(|_| "Failed to read config file".to_string())?;

    // TODO: why?
    let content = content.trim_end_matches('%').to_string();
    let config: SwiftlyConfig = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;

    Ok(config)
}

fn get_swiftly_path() -> Option<String> {
    let swiftly_home_dir = std::env::var("SWIFTLY_HOME_DIR").unwrap_or_default();
    if !swiftly_home_dir.is_empty() {
        return Some(swiftly_home_dir);
    }
    let home_dir = std::env::var("HOME").unwrap_or_default();
    if !home_dir.is_empty() {
        let swiftly_path = format!("{}/.local/share/swiftly", home_dir);
        if std::path::Path::new(&swiftly_path).exists() {
            return Some(swiftly_path);
        }
    }

    None
}

#[tauri::command]
pub async fn build_swift(window: tauri::Window, folder: String) -> Result<(), String> {
    Err("Not implemented yet".to_string())
}

#[tauri::command]
pub async fn clean_swift(window: tauri::Window, folder: String) -> Result<(), String> {
    Err("Not implemented yet".to_string())
}

#[tauri::command]
pub async fn deploy_swift(
    handle: tauri::AppHandle,
    window: tauri::Window,
    anisette_server: String,
    device: DeviceInfo,
    folder: String,
) -> Result<(), String> {
    Err("Not implemented yet".to_string())
}
