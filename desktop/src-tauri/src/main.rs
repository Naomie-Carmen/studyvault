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

fn main() {
    let menu = create_app_menu();

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(handle_menu_event)
        .setup(|app| {
            // Updater disabled in v1.0.0 beta — re-enable later with TAURI_PRIVATE_KEY
                                  let handle = app.handle();
            tauri::async_runtime::spawn(async move {
                if let Ok(Some(update)) = handle.updater().check().await {
                    let _ = update.download_and_install().await;
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application StudyVault Desktop");
}
