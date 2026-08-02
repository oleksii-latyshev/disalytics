// `#![forbid(unsafe_code)]` cannot live here: `#[wasm_bindgen]` expands to unsafe shims. Keeping
// this wrapper free of logic is what makes that acceptable — AGENTS.md §4.

use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen(js_name = parserVersion)]
#[must_use]
pub fn parser_version() -> String {
    demo_parser::VERSION.to_owned()
}
