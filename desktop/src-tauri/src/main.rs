#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    CustomMenuItem, Menu, MenuItem, Submenu, WindowMenuEvent,
};

fn create_app_menu() -> Menu {
    // Menu Fichier
    let file_menu = Submenu::new(
        "Fichier",
        Menu::new().add_native_item(MenuItem::Quit),
    );

    // Menu Édition
    let edit_menu = Submenu::new(
        "Édition",
        Menu::new()
            .add_native_item(MenuItem::Undo)
            .add_native_item(MenuItem::Redo)
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::Cut)
            .add_native_item(MenuItem::Copy)
            .add_native_item(MenuItem::Paste)
            .add_native_item(MenuItem::SelectAll),
    );

    // Menu Aide
    let check_updates = CustomMenuItem::new("check_updates", "Vérifier les mises à jour");
    let about = CustomMenuItem::new("about", "À propos de StudyVault");

    let help_menu = Submenu::new(
        "Aide",
        Menu::new()
            .add_item(check_updates)
            .add_native_item(MenuItem::Separator)
            .add_item(about),
    );

    Menu::new()
        .add_submenu(file_menu)
        .add_submenu(edit_menu)
        .add_submenu(help_menu)
}

fn handle_menu_event(event: WindowMenuEvent) {
    match event.menu_item_id() {
        "check_updates" => {
            let window = event.window();
            let _ = window.emit("tauri://update", {});
            let _ = tauri::api::dialog::message(
                Some(window),
                "Mises à jour",
                "Recherche de mise à jour en cours. Si une nouvelle version est disponible, une notification apparaîtra.",
            );
        }
        "about" => {
            let window = event.window();
            let _ = tauri::api::dialog::message(
                Some(window),
                "À propos de StudyVault",
                "StudyVault v1.0.0\n\nBibliothèque universitaire SaaS complète.\nDéveloppé avec React, Express & Tauri.\n\n© 2026 StudyVault — Tous droits réservés.",
            );
        }
        _ => {}
    }
}

#[tauri::command]
fn get_device_id() -> String {
    let comp = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "DESKTOP-PC".to_string());
    let user = std::env::var("USERNAME")
        .or_else(|_| std::env::var("USER"))
        .unwrap_or_else(|_| "USER".to_string());
    format!("DESKTOP-{}-{}", comp.trim(), user.trim())
}

#[tauri::command]
fn open_system_folder(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        let _ = std::fs::create_dir_all(p);
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
fn create_local_folder(path: String) -> Result<String, String> {
    let p = std::path::Path::new(&path);
    std::fs::create_dir_all(p).map_err(|e| e.to_string())?;
    Ok(path)
}

fn main() {
    let menu = create_app_menu();

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(handle_menu_event)
        .invoke_handler(tauri::generate_handler![
            get_device_id,
            open_system_folder,
            create_local_folder
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application StudyVault Desktop");
}