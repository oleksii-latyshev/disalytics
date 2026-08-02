// `#![forbid(unsafe_code)]` cannot live here: `#[wasm_bindgen]` expands to unsafe shims. Keeping
// this wrapper free of logic is what makes that acceptable — AGENTS.md §4.

use wasm_bindgen::prelude::{JsError, wasm_bindgen};

#[wasm_bindgen(js_name = parserVersion)]
#[must_use]
pub fn parser_version() -> String {
    demo_parser::VERSION.to_owned()
}

/// # Errors
///
/// The message is the `ErrorCode` identifier and never prose — `AGENTS.md` §7.3 leaves the
/// translated copy to the UI, so anything readable crossing this boundary would be the wrong thing
/// to put on a screen.
#[wasm_bindgen(js_name = eventNames)]
pub fn event_names(demo_bytes: &[u8]) -> Result<Vec<String>, JsError> {
    demo_parser::event_names(demo_bytes).map_err(|error| JsError::new(error.code().as_str()))
}
