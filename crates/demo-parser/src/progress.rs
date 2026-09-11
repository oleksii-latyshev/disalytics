use crate::upstream::{PASS_COUNT, PASS_LABELS};
use crate::{MatchHeader, ParseObserver};
use std::cell::{Cell, RefCell};

/// Which half of the work a percentage measures, named in the vocabulary of `AGENTS.md` §7.3's
/// progress message.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ParsePhase {
    Decompress,
    Parse,
}

impl ParsePhase {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Decompress => "decompress",
            Self::Parse => "parse",
        }
    }
}

/// Positions in, whole-number percentages out, each one handed to the observer once.
///
/// Upstream reports its position once per frame — hundreds of thousands of times a pass — and the
/// WASM wrapper turns every report it is given into a call into JavaScript, so this is what keeps
/// that to about a hundred per phase. Every pass is an equal share of the parse: the ticks pass
/// costs more than the other two, but a weight measured on one demo is a guess about the next.
///
/// The observer is behind a `RefCell` because upstream's hook is a shared `Fn`. It is borrowed only
/// for the length of one report, and upstream calls the hook synchronously, so no two borrows meet.
pub(crate) struct Progress<'o> {
    observer: RefCell<&'o mut dyn ParseObserver>,
    last: Cell<Option<(ParsePhase, u8)>>,
}

impl<'o> Progress<'o> {
    pub(crate) fn new(observer: &'o mut dyn ParseObserver) -> Self {
        Self {
            observer: RefCell::new(observer),
            last: Cell::new(None),
        }
    }

    pub(crate) fn decompressing(&self, consumed_bytes: usize, file_bytes: usize) {
        self.report(
            ParsePhase::Decompress,
            consumed_bytes as u64,
            file_bytes as u64,
        );
    }

    /// A pass never reaches its own end by reading: completing it does, so the percentage that
    /// closes a pass waits for the output that pass is still building.
    pub(crate) fn reading(&self, pass: usize, position: usize, demo_bytes: usize) {
        let within = position.min(demo_bytes.saturating_sub(1)) as u64;
        let demo = demo_bytes as u64;

        self.report(
            ParsePhase::Parse,
            pass as u64 * demo + within,
            PASS_COUNT as u64 * demo,
        );
    }

    pub(crate) fn pass_completed(&self, pass: usize, demo_bytes: usize) {
        let completed = pass + 1;
        let demo = demo_bytes as u64;

        self.report(
            ParsePhase::Parse,
            completed as u64 * demo,
            PASS_COUNT as u64 * demo,
        );
        self.observer
            .borrow_mut()
            .pass_completed(PASS_LABELS[pass], completed);
    }

    pub(crate) fn header_ready(&self, header: &MatchHeader) {
        self.observer.borrow_mut().header_ready(header);
    }

    fn report(&self, phase: ParsePhase, done: u64, total: u64) {
        let percent = percent_of(done, total);
        let is_repeat = self
            .last
            .get()
            .is_some_and(|(last_phase, last)| last_phase == phase && last >= percent);

        if is_repeat {
            return;
        }

        self.last.set(Some((phase, percent)));
        self.observer.borrow_mut().progressed(phase, percent);
    }
}

fn percent_of(done: u64, total: u64) -> u8 {
    if total == 0 {
        return 100;
    }

    u8::try_from(done.min(total) * 100 / total).unwrap_or(100)
}

#[cfg(test)]
mod tests {
    use super::{PASS_COUNT, ParsePhase, Progress, percent_of};
    use crate::ParseObserver;

    #[derive(Default)]
    struct Reports(Vec<(ParsePhase, u8)>);

    impl ParseObserver for Reports {
        fn progressed(&mut self, phase: ParsePhase, percent: u8) {
            self.0.push((phase, percent));
        }
    }

    #[test]
    fn a_percentage_is_reported_once_however_many_positions_land_on_it() {
        let mut reports = Reports::default();
        {
            let progress = Progress::new(&mut reports);
            for position in 0..10_000 {
                progress.reading(0, position, 10_000);
            }
            progress.pass_completed(0, 10_000);
        }

        let percents: Vec<u8> = reports.0.iter().map(|(_, percent)| *percent).collect();
        assert_eq!(percents, (0..=33).collect::<Vec<u8>>());
    }

    #[test]
    fn a_parse_reaches_a_hundred_only_when_its_last_pass_completes() {
        let mut reports = Reports::default();
        let highest_while_reading = {
            let progress = Progress::new(&mut reports);
            for pass in 0..PASS_COUNT {
                for position in (0..=1_000).step_by(7) {
                    progress.reading(pass, position, 1_000);
                }
                progress.reading(pass, 1_000, 1_000);
                if pass + 1 < PASS_COUNT {
                    progress.pass_completed(pass, 1_000);
                }
            }
            let highest = progress.last.get().map(|(_, percent)| percent);
            progress.pass_completed(PASS_COUNT - 1, 1_000);
            highest
        };

        assert_eq!(highest_while_reading, Some(99));
        assert_eq!(reports.0.last(), Some(&(ParsePhase::Parse, 100)));
        assert!(reports.0.windows(2).all(|pair| pair[0].1 < pair[1].1));
    }

    #[test]
    fn the_parse_starts_counting_from_nothing_once_the_container_is_open() {
        let mut reports = Reports::default();
        {
            let progress = Progress::new(&mut reports);
            progress.decompressing(50, 100);
            progress.decompressing(100, 100);
            progress.reading(0, 0, 1_000);
        }

        assert_eq!(
            reports.0,
            vec![
                (ParsePhase::Decompress, 50),
                (ParsePhase::Decompress, 100),
                (ParsePhase::Parse, 0),
            ]
        );
    }

    #[test]
    fn a_position_past_the_end_or_an_empty_total_reads_as_complete() {
        assert_eq!(percent_of(5, 4), 100);
        assert_eq!(percent_of(0, 0), 100);
        assert_eq!(percent_of(1, 3), 33);
    }
}
