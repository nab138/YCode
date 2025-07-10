use crate::{device::DeviceInfo, emit_error_and_return};
use serde::{Deserialize, Serialize};
use std::{
    io::{BufRead, BufReader},
    path::PathBuf,
    process::{Command, Stdio},
    thread,
};
use tauri::Emitter;

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

pub fn swift_bin(toolchain_path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(toolchain_path);
    if !path.exists() || !path.is_dir() {
        return Err("Invalid toolchain path".to_string());
    }
    let swift_path = path.join("usr").join("bin").join("swift");
    if !swift_path.exists() || !swift_path.is_file() {
        return Err("Swift binary not found in toolchain".to_string());
    }
    Ok(swift_path)
}

#[tauri::command]
pub fn has_darwin_sdk(toolchain_path: &str) -> bool {
    let swift_bin = swift_bin(toolchain_path);
    if swift_bin.is_err() {
        return false;
    }
    let swift_bin = swift_bin.unwrap();

    let output = std::process::Command::new(swift_bin)
        .arg("sdk")
        .arg("list")
        .output();
    if output.is_err() {
        return false;
    }
    let output = output.unwrap();
    if !output.status.success() {
        return false;
    }
    let output_str = String::from_utf8_lossy(&output.stdout);

    output_str.contains("darwin")
}

#[tauri::command]
pub fn validate_toolchain(toolchain_path: &str) -> bool {
    let swift_path = swift_bin(toolchain_path);
    if swift_path.is_err() {
        return false;
    }
    let swift_path = swift_path.unwrap();

    let output = std::process::Command::new(swift_path)
        .arg("--version")
        .output();
    if output.is_err() {
        return false;
    }
    let output = output.unwrap();
    if !output.status.success() {
        return false;
    }

    true
}

#[tauri::command]
pub async fn get_toolchain_info(
    toolchain_path: String,
    is_swiftly: bool,
) -> Result<Toolchain, String> {
    if !validate_toolchain(&toolchain_path) {
        return Err("Invalid toolchain path".to_string());
    }
    let swift_path = swift_bin(&toolchain_path)?;

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
    Ok(Toolchain {
        version,
        path: toolchain_path.clone(),
        is_swiftly,
    })
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
            if validate_toolchain(&toolchain.path) {
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

async fn build_swift_internal(
    window: tauri::Window,
    folder: String,
    toolchain_path: String,
    debug: bool,
    emit_exit_code: bool,
) -> Result<(), String> {
    let swift_bin = swift_bin(&toolchain_path)?;
    let mut cmd = Command::new(swift_bin);
    cmd.arg("build")
        .arg("-c")
        .arg(if debug { "debug" } else { "release" })
        .arg("--swift-sdk")
        .arg("arm64-apple-ios")
        .current_dir(folder);

    pipe_command(&mut cmd, window, emit_exit_code).await
}

#[tauri::command]
pub async fn build_swift(
    window: tauri::Window,
    folder: String,
    toolchain_path: String,
    debug: bool,
) -> Result<(), String> {
    if !validate_toolchain(&toolchain_path) {
        return Err("Invalid toolchain path".to_string());
    }

    build_swift_internal(window, folder, toolchain_path, debug, true).await
}

#[tauri::command]
pub async fn clean_swift(
    window: tauri::Window,
    folder: String,
    toolchain_path: String,
) -> Result<(), String> {
    let swift_bin = swift_bin(&toolchain_path)?;
    let mut cmd = Command::new(swift_bin);
    cmd.arg("package").arg("clean").current_dir(folder);

    window
        .emit("build-output", "Cleaning...")
        .expect("failed to send output");

    pipe_command(&mut cmd, window, true).await
}

#[tauri::command]
pub async fn deploy_swift(
    handle: tauri::AppHandle,
    window: tauri::Window,
    anisette_server: String,
    device: DeviceInfo,
    folder: String,
    toolchain_path: String,
    debug: bool,
) -> Result<(), String> {
    if !validate_toolchain(&toolchain_path) {
        return Err("Invalid toolchain path".to_string());
    }

    build_swift_internal(window, folder, toolchain_path, debug, false).await?;

    todo!("Bundle into .app and deploy")
}

pub async fn pipe_command(
    cmd: &mut Command,
    window: tauri::Window,
    emit_exit_code: bool,
) -> Result<(), String> {
    let name = "build-output";
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut command = match cmd.spawn() {
        Ok(cmd) => cmd,
        Err(_) => {
            return emit_error_and_return(&window, "Failed to spawn build command");
        }
    };

    let stdout = match command.stdout.take() {
        Some(out) => out,
        None => {
            return emit_error_and_return(&window, "Failed to get stdout");
        }
    };

    let stderr = match command.stderr.take() {
        Some(err) => err,
        None => {
            return emit_error_and_return(&window, "Failed to get stderr");
        }
    };

    let stdout_handle = spawn_output_thread(stdout, window.clone(), name.to_string());
    let stderr_handle = spawn_output_thread(stderr, window.clone(), name.to_string());

    stdout_handle.join().expect("stdout thread panicked");
    stderr_handle.join().expect("stderr thread panicked");

    let exit_status = match command.wait() {
        Ok(status) => status,
        Err(_) => {
            return emit_error_and_return(&window, "Failed to wait for command");
        }
    };

    let exit_code = exit_status.code().unwrap_or(1);

    if exit_code != 0 || emit_exit_code {
        window
            .emit(name, format!("command.done.{}", exit_code))
            .expect("failed to send output");
    }

    if exit_code != 0 {
        return Err(format!("Command exited with code {}", exit_code));
    }

    Ok(())
}

fn spawn_output_thread<R: std::io::Read + Send + 'static>(
    reader: R,
    window: tauri::Window,
    name: String,
) -> std::thread::JoinHandle<()> {
    thread::spawn(move || {
        let reader = BufReader::new(reader);
        for line in reader.lines() {
            match line {
                Ok(line) => {
                    window.emit(&name, line).expect("failed to send output");
                }
                Err(err) => {
                    window
                        .emit(&name, "command.done.999".to_string())
                        .expect("failed to send output");
                    eprintln!("Error reading output: {}", err);
                    return;
                }
            }
        }
    })
}
