#![forbid(unsafe_code)]

mod error;
mod upstream;

pub use error::{ErrorCode, ParseError};
pub use upstream::event_names;

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
