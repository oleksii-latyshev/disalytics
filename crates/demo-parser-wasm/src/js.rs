use js_sys::{Array, Object, Reflect};
use wasm_bindgen::JsValue;

/// `Reflect::set` fails when the receiver refuses the write — a frozen object, an exotic proxy.
/// Every receiver here is a plain object created a line earlier, so threading a `Result` through
/// every field of the schema would carry a failure that cannot occur.
pub fn set(target: &Object, key: &str, value: impl Into<JsValue>) {
    drop(Reflect::set(target, &JsValue::from_str(key), &value.into()));
}

/// A count that is also a `JavaScript` array length, which the language caps at `2^32 - 1`.
pub fn count(value: usize) -> JsValue {
    JsValue::from(u32::try_from(value).unwrap_or(u32::MAX))
}

pub fn optional<T: Into<JsValue>>(value: Option<T>) -> JsValue {
    value.map_or(JsValue::NULL, Into::into)
}

pub fn array<T>(items: &[T], to_js: impl Fn(&T) -> JsValue) -> Array {
    let out = Array::new();

    for item in items {
        out.push(&to_js(item));
    }

    out
}
