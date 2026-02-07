use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};
use tauri_plugin_autostart::MacosLauncher;
use std::process::Command;
use std::env;

/// 從 Git Credential Manager 獲取 GitHub Token
#[tauri::command]
fn get_github_credential() -> Result<Option<String>, String> {
    // Windows: 使用 CREATE_NO_WINDOW 避免彈出終端視窗
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    #[cfg(target_os = "windows")]
    const DETACHED_PROCESS: u32 = 0x00000008;

    // 嘗試從 Git Credential Manager 獲取
    let mut cmd = Command::new("git");
    cmd.args(["credential", "fill"])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped()); // 捕獲錯誤以便調試

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW | DETACHED_PROCESS);

    let output = cmd.spawn()
        .and_then(|mut child| {
            use std::io::Write;
            if let Some(stdin) = child.stdin.as_mut() {
                stdin.write_all(b"protocol=https\nhost=github.com\n\n").ok();
            }
            child.wait_with_output()
        });

    match output {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    if line.starts_with("password=") {
                        let token = line.trim_start_matches("password=").to_string();
                        if !token.is_empty() {
                            return Ok(Some(token));
                        }
                    }
                }
            }
            // 如果沒有找到 token，返回 None（不是錯誤）
            Ok(None)
        }
        Err(e) => {
            // Git 命令執行失敗
            Err(format!("Failed to execute git credential: {}", e))
        }
    }
}

/// 從環境變數獲取 GitHub Token
#[tauri::command]
fn get_github_env_token() -> Option<String> {
    env::var("GITHUB_TOKEN").ok()
        .or_else(|| env::var("GH_TOKEN").ok())
}

/// 驗證 GitHub Token 是否有效
#[tauri::command]
async fn verify_github_token(token: String) -> Result<bool, String> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "ScriptHub-App")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(response.status().is_success())
}


#[tauri::command]
fn minimize_window(window: tauri::Window) {
    window.hide().unwrap();
}

#[tauri::command]
fn quit_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .invoke_handler(tauri::generate_handler![
            get_github_credential,
            get_github_env_token,
            verify_github_token,
            minimize_window,
            quit_app
        ])
        .setup(|app| {
            // 創建托盤右鍵菜單
            let show_item = MenuItem::with_id(app, "show", "顯示主窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // 創建托盤圖標
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("ScriptHub - 腳本管理器")
                .on_tray_icon_event(|tray, event| {
                    // 左鍵單擊托盤圖標顯示窗口
                    if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
