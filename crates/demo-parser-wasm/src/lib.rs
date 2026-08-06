// `#![forbid(unsafe_code)]` cannot live here: `#[wasm_bindgen]` expands to unsafe shims. Keeping
// this wrapper free of logic is what makes that acceptable — AGENTS.md §4.

mod events;
mod header;
mod js;
mod track;

use demo_parser::{MatchHeader, PASS_COUNT, ParseObserver};
use js_sys::{Function, Object};
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::{JsError, wasm_bindgen};

#[wasm_bindgen(js_name = parserVersion)]
#[must_use]
pub fn parser_version() -> String {
    demo_parser::VERSION.to_owned()
}

/// How many passes over the demo one parse makes, so the caller's percentage is derived from the
/// parser rather than from a number written twice.
#[wasm_bindgen(js_name = passCount)]
#[must_use]
pub fn pass_count() -> usize {
    PASS_COUNT
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

/// The demo's bytes, filled one chunk at a time.
///
/// Handing a whole `Uint8Array` across the boundary would hold the file twice — once in the
/// JavaScript heap, once in linear memory — against the 1.5 GB peak in `AGENTS.md` §16. Streaming
/// the file in leaves only the chunk in flight duplicated.
#[wasm_bindgen]
pub struct DemoBuffer {
    bytes: Vec<u8>,
}

#[wasm_bindgen]
impl DemoBuffer {
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new(size_bytes: usize) -> Self {
        Self {
            bytes: Vec::with_capacity(size_bytes),
        }
    }

    pub fn push(&mut self, chunk: &[u8]) {
        self.bytes.extend_from_slice(chunk);
    }

    #[wasm_bindgen(getter, js_name = byteLength)]
    #[must_use]
    pub fn byte_length(&self) -> usize {
        self.bytes.len()
    }
}

/// Parses `demo` and returns `{ track, events }` as plain `JavaScript` values.
///
/// `on_pass` receives the number of passes finished so far, `on_header` the match header — which is
/// complete while the last pass is still running. The header is not repeated in the return value:
/// `AGENTS.md` §7.3 gives it its own message precisely so it can arrive early.
///
/// Every buffer in the result is a `JavaScript`-owned typed array, so the caller can transfer them
/// and terminate the worker.
///
/// # Errors
///
/// The message is the `ErrorCode` identifier and never prose.
#[wasm_bindgen(js_name = parseDemo)]
pub fn parse_demo(
    demo: DemoBuffer,
    on_pass: &Function,
    on_header: &Function,
) -> Result<Object, JsError> {
    let mut observer = JsObserver { on_pass, on_header };
    let parsed = demo_parser::parse_observed(&demo.bytes, &mut observer)
        .map_err(|error| JsError::new(error.code().as_str()))?;

    // The demo outweighs everything built from it by two orders of magnitude, so it goes before the
    // JavaScript copies are allocated rather than at the end of the scope.
    drop(demo);

    let out = Object::new();
    js::set(&out, "track", track::track(&parsed.track));
    js::set(&out, "events", events::events(&parsed.events));

    Ok(out)
}

struct JsObserver<'a> {
    on_pass: &'a Function,
    on_header: &'a Function,
}

/// A callback that throws is the caller's own defect, and a pass boundary is not somewhere the
/// parse can be unwound to — the demo would have to be read again from the start. So the exception
/// is dropped here and the parse runs to completion.
impl ParseObserver for JsObserver<'_> {
    fn pass_completed(&mut self, _label: &'static str, completed_passes: usize) {
        drop(
            self.on_pass
                .call1(&JsValue::NULL, &js::count(completed_passes)),
        );
    }

    fn header_ready(&mut self, header: &MatchHeader) {
        drop(
            self.on_header
                .call1(&JsValue::NULL, &header::header(header).into()),
        );
    }
}
