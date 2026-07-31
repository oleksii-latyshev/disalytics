use ahash::AHashMap;
use parser::first_pass::parser_settings::ParserInputs;
use parser::parse_demo::{DemoOutput, Parser, ParsingMode};
use parser::second_pass::parser_settings::create_huffman_lookup_table;
use parser::second_pass::variants::VarVec;
use std::collections::BTreeMap;
use std::fmt::Write as _;
use wasm_bindgen::prelude::*;

const TICK_PROPS: [&str; 13] = [
    "X",
    "Y",
    "Z",
    "is_alive",
    "CCSPlayerPawn.m_iHealth",
    "CCSPlayerPawn.m_ArmorValue",
    "CCSPlayerPawn.m_iTeamNum",
    "CCSPlayerPawn.m_flFlashDuration",
    "CCSPlayerPawn.m_bIsScoped",
    "CCSPlayerPawn.m_bIsWalking",
    "CCSPlayerPawn.m_bIsDefusing",
    "CCSPlayerPawn.m_angEyeAngles",
    "CCSPlayerController.CCSPlayerController_InGameMoneyServices.m_iAccount",
];

fn inputs<'a>(
    huf: &'a Vec<(u8, u8)>,
    player_props: Vec<String>,
    events: Vec<String>,
    projectiles: bool,
    only_header: bool,
) -> ParserInputs<'a> {
    ParserInputs {
        real_name_to_og_name: AHashMap::default(),
        wanted_players: vec![],
        wanted_player_props: player_props,
        wanted_other_props: vec![],
        wanted_prop_states: AHashMap::default(),
        wanted_ticks: vec![],
        wanted_events: events,
        parse_ents: true,
        parse_projectiles: projectiles,
        parse_grenades: false,
        only_header,
        only_convars: false,
        huffman_lookup_table: huf,
        order_by_steamid: false,
        list_props: false,
        fallback_bytes: None,
    }
}

fn owned(values: &[&str]) -> Vec<String> {
    values.iter().map(|value| value.to_string()).collect()
}

fn run(bytes: &[u8], settings: ParserInputs<'_>) -> Result<DemoOutput, String> {
    let mut parser = Parser::new(settings, ParsingMode::ForceSingleThreaded);
    parser.parse_demo(bytes).map_err(|error| format!("{error:?}"))
}

fn column_rows(output: &DemoOutput) -> usize {
    output
        .df
        .values()
        .map(|column| match &column.data {
            None => 0,
            Some(VarVec::Bool(v)) => v.len(),
            Some(VarVec::F32(v)) => v.len(),
            Some(VarVec::I32(v)) => v.len(),
            Some(VarVec::U32(v)) => v.len(),
            Some(VarVec::U64(v)) => v.len(),
            Some(VarVec::String(v)) => v.len(),
            Some(VarVec::XYVec(v)) => v.len(),
            Some(VarVec::XYZVec(v)) => v.len(),
            Some(VarVec::Stickers(v)) => v.len(),
            Some(VarVec::InputHistory(v)) => v.len(),
            Some(VarVec::StringVec(v)) => v.len(),
            Some(VarVec::U32Vec(v)) => v.len(),
            Some(VarVec::U64Vec(v)) => v.len(),
        })
        .max()
        .unwrap_or(0)
}

#[wasm_bindgen]
pub fn probe(demo: &[u8], stage: u32) -> String {
    #[cfg(feature = "diagnostic")]
    console_error_panic_hook::set_once();

    let huf = create_huffman_lookup_table();
    let mut report = String::new();
    let _ = writeln!(report, "stage {stage}, bytes {}", demo.len());

    let settings = match stage {
        0 => inputs(&huf, vec![], vec![], false, true),
        1 => inputs(&huf, vec![], owned(&["all"]), false, false),
        2 => inputs(&huf, owned(&TICK_PROPS), vec![], false, false),
        3 => inputs(&huf, vec![], vec![], true, false),
        _ => return "unknown stage".to_string(),
    };

    let output = match run(demo, settings) {
        Ok(output) => output,
        Err(error) => return format!("stage {stage} failed: {error}"),
    };

    if let Some(header) = &output.header {
        let mut keys: Vec<&String> = header.keys().collect();
        keys.sort();
        let _ = writeln!(report, "header keys {}", keys.len());
        if let Some(map) = header.get("map_name") {
            let _ = writeln!(report, "map {map}");
        }
    }

    let mut counts: BTreeMap<&str, usize> = BTreeMap::new();
    for event in &output.game_events {
        *counts.entry(event.name.as_str()).or_insert(0) += 1;
    }
    let _ = writeln!(report, "events total {}", output.game_events.len());
    let _ = writeln!(report, "distinct event names {}", counts.len());
    let _ = writeln!(
        report,
        "player_first_connect {}",
        counts.get("player_first_connect").copied().unwrap_or(0)
    );
    let _ = writeln!(report, "prop columns {}", output.df.len());
    let _ = writeln!(report, "rows per column {}", column_rows(&output));

    report
}

#[wasm_bindgen]
pub fn ping(demo: &[u8]) -> String {
    #[cfg(feature = "diagnostic")]
    console_error_panic_hook::set_once();
    format!("received {} bytes, first {:?}, last {:?}", demo.len(), &demo[..4.min(demo.len())], demo.last())
}

#[wasm_bindgen]
pub fn grow(megabytes: usize) -> String {
    #[cfg(feature = "diagnostic")]
    console_error_panic_hook::set_once();
    let mut held: Vec<Vec<u8>> = Vec::new();
    for step in 0..megabytes {
        let mut block = vec![0u8; 1024 * 1024];
        block[0] = step as u8;
        held.push(block);
    }
    format!("allocated {} MB", held.len())
}

#[wasm_bindgen]
pub fn env_check() -> String {
    format!("env var read ok: {:?}", std::env::var("CS2_PROF").is_ok())
}

#[wasm_bindgen]
pub fn clock_check() -> String {
    let started = std::time::Instant::now();
    format!("Instant::now() ok, elapsed {:?}", started.elapsed())
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn linear_memory_bytes() -> usize {
    core::arch::wasm32::memory_size(0) * 65536
}

#[cfg(not(target_arch = "wasm32"))]
#[wasm_bindgen]
pub fn linear_memory_bytes() -> usize {
    0
}
