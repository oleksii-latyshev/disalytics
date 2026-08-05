use thiserror::Error;

/// The string form crosses the WASM boundary as the whole of the error — `AGENTS.md` §7.3 lets the
/// worker emit a code and never prose, because the UI owns the translated copy. Renaming one is a
/// protocol change.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorCode {
    NotADemo,
    TruncatedDemo,
    UnsupportedDemoVersion,
    UnsupportedContainer,
    PovDemoUnsupported,
    MalformedDemo,
}

impl ErrorCode {
    pub const ALL: [Self; 6] = [
        Self::NotADemo,
        Self::TruncatedDemo,
        Self::UnsupportedDemoVersion,
        Self::UnsupportedContainer,
        Self::PovDemoUnsupported,
        Self::MalformedDemo,
    ];

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::NotADemo => "NOT_A_DEMO",
            Self::TruncatedDemo => "TRUNCATED_DEMO",
            Self::UnsupportedDemoVersion => "UNSUPPORTED_DEMO_VERSION",
            Self::UnsupportedContainer => "UNSUPPORTED_CONTAINER",
            Self::PovDemoUnsupported => "POV_DEMO_UNSUPPORTED",
            Self::MalformedDemo => "MALFORMED_DEMO",
        }
    }
}

/// The `Display` text is for host tests and native builds. It is never what reaches a user.
#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum ParseError {
    #[error("the file does not begin with a Source 2 demo header")]
    NotADemo,

    #[error("the demo ends mid-message after {read_bytes} bytes")]
    TruncatedDemo { read_bytes: usize },

    #[error("demo protocol {protocol} predates Source 2")]
    UnsupportedDemoVersion { protocol: u32 },

    #[error("the container is neither raw, zstd nor bzip2")]
    UnsupportedContainer,

    #[error("the demo was recorded from a player's point of view, not by the game server")]
    PovDemoUnsupported,

    /// Upstream distinguishes three dozen ways a demo can be broken. A user can act on none of
    /// them, so they arrive here as one code and keep their upstream wording for the log.
    #[error("the demo is a Source 2 demo but could not be read: {detail}")]
    MalformedDemo { detail: String },
}

impl ParseError {
    #[must_use]
    pub const fn code(&self) -> ErrorCode {
        match self {
            Self::NotADemo => ErrorCode::NotADemo,
            Self::TruncatedDemo { .. } => ErrorCode::TruncatedDemo,
            Self::UnsupportedDemoVersion { .. } => ErrorCode::UnsupportedDemoVersion,
            Self::UnsupportedContainer => ErrorCode::UnsupportedContainer,
            Self::PovDemoUnsupported => ErrorCode::PovDemoUnsupported,
            Self::MalformedDemo { .. } => ErrorCode::MalformedDemo,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{ErrorCode, ParseError};
    use std::collections::BTreeSet;

    #[test]
    fn every_code_has_a_distinct_identifier() {
        let identifiers: BTreeSet<&str> = ErrorCode::ALL.iter().map(|code| code.as_str()).collect();

        assert_eq!(identifiers.len(), ErrorCode::ALL.len());
    }

    #[test]
    fn identifiers_are_screaming_snake_case() {
        for code in ErrorCode::ALL {
            let identifier = code.as_str();

            assert!(!identifier.is_empty());
            assert!(
                identifier
                    .bytes()
                    .all(|byte| byte.is_ascii_uppercase() || byte == b'_'),
                "{identifier} is not SCREAMING_SNAKE_CASE"
            );
        }
    }

    #[test]
    fn each_error_reports_its_own_code() {
        let cases = [
            (ParseError::NotADemo, ErrorCode::NotADemo),
            (
                ParseError::TruncatedDemo { read_bytes: 4_096 },
                ErrorCode::TruncatedDemo,
            ),
            (
                ParseError::UnsupportedDemoVersion { protocol: 4 },
                ErrorCode::UnsupportedDemoVersion,
            ),
            (
                ParseError::UnsupportedContainer,
                ErrorCode::UnsupportedContainer,
            ),
            (
                ParseError::PovDemoUnsupported,
                ErrorCode::PovDemoUnsupported,
            ),
            (
                ParseError::MalformedDemo {
                    detail: "OutOfBytesError".to_owned(),
                },
                ErrorCode::MalformedDemo,
            ),
        ];

        assert_eq!(cases.len(), ErrorCode::ALL.len());
        for (error, expected) in cases {
            assert_eq!(error.code(), expected);
        }
    }
}
