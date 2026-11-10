mod adb;
mod commands;
mod db;
mod error;
mod models;
mod scrcpy;
mod state;

use state::AppState;

pub fn run() {
    let _ = env_logger::try_init();

    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::system::ping,
            commands::system::window_action,
            commands::system::get_dependency_status,
            commands::system::start_adb,
            commands::system::stop_adb,
            commands::system::adb_version,
            commands::system::app_resource_usage,
            commands::system::check_for_updates,
            commands::system::open_path,
            commands::system::pick_file,
            commands::system::pick_folder,
            commands::system::save_file,
            commands::devices::list_devices,
            commands::devices::refresh_device,
            commands::devices::wireless_pair,
            commands::devices::tcpip_connect,
            commands::devices::tcpip_enable,
            commands::devices::disconnect_device,
            commands::devices::forget_device,
            commands::devices::rename_device,
            commands::mirror::start_mirror,
            commands::mirror::stop_mirror,
            commands::mirror::list_sessions,
            commands::files::take_screenshot,
            commands::files::list_files,
            commands::files::push_file,
            commands::files::pull_file,
            commands::files::mkdir,
            commands::files::delete_file,
            commands::files::rename_file,
            commands::apps::list_packages,
            commands::apps::install_apk,
            commands::apps::uninstall_package,
            commands::apps::launch_package,
            commands::apps::force_stop_package,
            commands::data::get_performance,
            commands::data::get_history,
            commands::data::clear_history,
            commands::data::get_recordings,
            commands::data::get_settings,
            commands::data::set_settings,
            commands::data::get_sequences,
            commands::data::save_sequence,
            commands::data::delete_sequence,
            commands::data::run_sequence,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MirrorDeck");
}
