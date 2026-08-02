#![forbid(unsafe_code)]

mod error;

pub use error::{ErrorCode, ParseError};

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
