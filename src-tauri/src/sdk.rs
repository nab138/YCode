use std::{path::PathBuf, process::Command};

use tauri::{AppHandle, Manager};

const DARWIN_TOOLS_VERSION: &str = "1.0.1";

#[tauri::command]
pub async fn install_sdk(
    app: AppHandle,
    xcode_path: String,
    toolchain_path: String,
) -> Result<(), String> {
    if xcode_path.is_empty() {
        return Err("Xcode not found".to_string());
    }
    if toolchain_path.is_empty() {
        return Err("Toolchain not found".to_string());
    }
    let output_dir = std::env::temp_dir()
        .join("DarwinSDKBuild")
        .join("darwin.artifactbundle");
    if output_dir.exists() {
        std::fs::remove_dir_all(&output_dir)
            .map_err(|e| format!("Failed to remove existing output directory: {}", e))?;
    }
    std::fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output directory: {}", e))?;

    install_toolset(&output_dir).await?;

    install_developer(&app, &output_dir, &xcode_path).await?;

    Ok(())
}

async fn install_toolset(output_path: &PathBuf) -> Result<(), String> {
    let toolset_dir = output_path.join("toolset");
    std::fs::create_dir_all(&toolset_dir)
        .map_err(|e| format!("Failed to create toolset directory: {}", e))?;

    let arch = if cfg!(target_arch = "x86_64") {
        "x86_64"
    } else if cfg!(target_arch = "aarch64") {
        "aarch64"
    } else {
        return Err("Unsupported architecture".to_string());
    };
    let toolset_url = format!(
        "https://github.com/xtool-org/darwin-tools-linux-llvm/releases/download/v{}/toolset-{}.tar.gz",
        DARWIN_TOOLS_VERSION, arch
    );

    let response = reqwest::get(&toolset_url)
        .await
        .map_err(|e| format!("Failed to download toolset: {}", e))?;
    if !response.status().is_success() {
        return Err(format!("Failed to download toolset: {}", response.status()));
    }
    let tar_gz = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    let mut archive = tar::Archive::new(flate2::read::GzDecoder::new(&*tar_gz));
    archive
        .unpack(&toolset_dir)
        .map_err(|e| format!("Failed to extract toolset: {}", e))?;

    Ok(())
}

async fn install_developer(
    app: &AppHandle,
    output_path: &PathBuf,
    xcode_path: &str,
) -> Result<(), String> {
    let dev_stage = output_path.join("DeveloperStage");
    std::fs::create_dir_all(&dev_stage)
        .map_err(|e| format!("Failed to create DeveloperStage directory: {}", e))?;

    let unxip_path = app
        .path()
        .resolve("unxip", tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve unxip path: {}", e))?;

    let status = Command::new(unxip_path)
        .current_dir(&dev_stage)
        .arg(xcode_path)
        .status();
    match status {
        Ok(status) if status.success() => {
            println!("Sucess!");
            Ok(())
        }
        Ok(status) => Err(format!("unxip command failed with status: {}", status)),
        Err(e) => Err(format!("Failed to execute unxip command: {}", e)),
    }
}
