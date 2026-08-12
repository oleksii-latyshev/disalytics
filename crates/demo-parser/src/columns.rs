use crate::error::ParseError;
use ahash::AHashMap;
use parser::parse_demo::DemoOutput;
use parser::second_pass::variants::{PropColumn, VarVec};
use std::collections::BTreeMap;

/// Upstream returns its table as `prop id -> column` and its names separately. Resolving names once
/// keeps the numeric ids upstream assigns out of the rest of the crate.
pub(crate) struct Columns<'a> {
    df: &'a AHashMap<u32, PropColumn>,
    ids: BTreeMap<&'a str, u32>,
    row_count: usize,
}

impl<'a> Columns<'a> {
    pub(crate) fn of(output: &'a DemoOutput) -> Self {
        let mut ids = BTreeMap::new();
        for info in &output.prop_controller.prop_infos {
            ids.insert(info.prop_friendly_name.as_str(), info.id);
        }
        let row_count = output
            .df
            .values()
            .map(PropColumn::len)
            .max()
            .unwrap_or_default();

        Self {
            df: &output.df,
            ids,
            row_count,
        }
    }

    pub(crate) const fn row_count(&self) -> usize {
        self.row_count
    }

    fn data(&self, name: &str) -> Option<&'a VarVec> {
        let id = self.ids.get(name)?;
        self.df.get(id)?.data.as_ref()
    }

    /// Fails rather than returning an empty column: `docs/PARSER.md` §5 measured upstream dropping
    /// an unresolved prop with no error at all, and a short table is the one outcome that must not
    /// reach the schema silently.
    pub(crate) fn require(&self, name: &str) -> Result<(), ParseError> {
        match self.data(name) {
            Some(_) => Ok(()),
            None => Err(ParseError::MalformedDemo {
                detail: format!("requested prop {name} produced no column"),
            }),
        }
    }

    pub(crate) fn floats(&self, name: &str) -> &'a [Option<f32>] {
        match self.data(name) {
            Some(VarVec::F32(values)) => values,
            _ => &[],
        }
    }

    pub(crate) fn texts(&self, name: &str) -> &'a [Option<String>] {
        match self.data(name) {
            Some(VarVec::String(values)) => values,
            _ => &[],
        }
    }

    pub(crate) fn booleans(&self, name: &str) -> &'a [Option<bool>] {
        match self.data(name) {
            Some(VarVec::Bool(values)) => values,
            _ => &[],
        }
    }

    /// Upstream's custom list props land here — an inventory is one row holding many definition
    /// indices, and an empty row is a player carrying nothing rather than a missing sample.
    pub(crate) fn integer_lists(&self, name: &str) -> &'a [Vec<u32>] {
        match self.data(name) {
            Some(VarVec::U32Vec(values)) => values,
            _ => &[],
        }
    }

    pub(crate) fn ids_64(&self, name: &str) -> &'a [Option<u64>] {
        match self.data(name) {
            Some(VarVec::U64(values)) => values,
            _ => &[],
        }
    }

    /// Upstream picks `i32` or `u32` per prop from the send table, and which one a given prop lands
    /// on is not ours to predict — every integer column is read through here.
    pub(crate) fn integers(&self, name: &str) -> IntegerColumn<'a> {
        match self.data(name) {
            Some(VarVec::I32(values)) => IntegerColumn::Signed(values),
            Some(VarVec::U32(values)) => IntegerColumn::Unsigned(values),
            _ => IntegerColumn::Absent,
        }
    }
}

pub(crate) enum IntegerColumn<'a> {
    Signed(&'a [Option<i32>]),
    Unsigned(&'a [Option<u32>]),
    Absent,
}

impl IntegerColumn<'_> {
    pub(crate) fn at(&self, row: usize) -> Option<i64> {
        match self {
            Self::Signed(values) => values.get(row).copied().flatten().map(i64::from),
            Self::Unsigned(values) => values.get(row).copied().flatten().map(i64::from),
            Self::Absent => None,
        }
    }
}

pub(crate) fn float_at(column: &[Option<f32>], row: usize) -> Option<f32> {
    column.get(row).copied().flatten()
}

pub(crate) fn bool_at(column: &[Option<bool>], row: usize) -> bool {
    column.get(row).copied().flatten().unwrap_or(false)
}

pub(crate) fn id_at(column: &[Option<u64>], row: usize) -> Option<u64> {
    column.get(row).copied().flatten()
}

pub(crate) fn text_at(column: &[Option<String>], row: usize) -> Option<&str> {
    column.get(row)?.as_deref()
}

pub(crate) fn list_at(column: &[Vec<u32>], row: usize) -> &[u32] {
    column.get(row).map_or(&[], Vec::as_slice)
}
