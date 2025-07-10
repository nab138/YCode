use std::process::{Command, Stdio};

pub fn windows_to_wsl_path(path: &str) -> String {
    let (drive_letter_index, rest_of_path_index) = if path.starts_with("\\\\?\\") {
        (4, 6)
    } else {
        (0, 2)
    };

    let drive_letter = path[drive_letter_index..]
        .chars()
        .next()
        .unwrap()
        .to_ascii_lowercase();
    let rest_of_path = path[rest_of_path_index..].replace("\\", "/");
    format!("/mnt/{}/{}", drive_letter, rest_of_path)
}

#[tauri::command]
pub async fn has_wsl() -> bool {
    if !is_windows() {
        return false;
    }

    let output = Command::new("wsl")
        .arg("echo")
        .arg("1")
        .stdout(Stdio::piped())
        .output()
        .expect("failed to execute process");

    let output = String::from_utf8_lossy(&output.stdout);
    return output.trim() == "1";
}

#[tauri::command]
pub fn is_windows() -> bool {
    cfg!(target_os = "windows")
}
