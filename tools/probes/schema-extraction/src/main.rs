use ahash::AHashMap;
use parser::first_pass::parser_settings::ParserInputs;
use parser::parse_demo::{DemoOutput, Parser, ParsingMode};
use parser::second_pass::parser_settings::create_huffman_lookup_table;
use parser::second_pass::variants::{VarVec, Variant};
use std::collections::{BTreeMap, BTreeSet};
use std::env;
use std::time::Instant;

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
    grenades: bool,
    list_props: bool,
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
        parse_grenades: grenades,
        only_header: false,
        only_convars: false,
        huffman_lookup_table: huf,
        order_by_steamid: false,
        list_props,
        fallback_bytes: None,
    }
}

fn owned(values: &[&str]) -> Vec<String> {
    values.iter().map(|value| value.to_string()).collect()
}

fn run(bytes: &[u8], label: &str, settings: ParserInputs<'_>) -> (DemoOutput, f64) {
    run_with(bytes, label, settings, ParsingMode::Normal)
}

fn run_with(bytes: &[u8], label: &str, settings: ParserInputs<'_>, mode: ParsingMode) -> (DemoOutput, f64) {
    let started = Instant::now();
    let mut parser = Parser::new(settings, mode);
    let output = parser.parse_demo(bytes).expect("parse failed");
    let elapsed = started.elapsed().as_secs_f64();
    println!("\n=== pass: {label} — {elapsed:.2}s ===");
    (output, elapsed)
}

fn column_len(column: &parser::second_pass::variants::PropColumn) -> usize {
    match &column.data {
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
    }
}

fn head(column: &parser::second_pass::variants::PropColumn, take: usize) -> String {
    match &column.data {
        None => "-".to_string(),
        Some(VarVec::Bool(v)) => format!("{:?}", &v[..take.min(v.len())]),
        Some(VarVec::F32(v)) => format!("{:?}", &v[..take.min(v.len())]),
        Some(VarVec::I32(v)) => format!("{:?}", &v[..take.min(v.len())]),
        Some(VarVec::U32(v)) => format!("{:?}", &v[..take.min(v.len())]),
        Some(VarVec::U64(v)) => format!("{:?}", &v[..take.min(v.len())]),
        Some(VarVec::String(v)) => format!("{:?}", &v[..take.min(v.len())]),
        Some(VarVec::XYZVec(v)) => format!("{:?}", &v[..take.min(v.len())]),
        Some(VarVec::XYVec(v)) => format!("{:?}", &v[..take.min(v.len())]),
        _ => "…".to_string(),
    }
}

fn report_ticks(output: &DemoOutput, samples: usize) {
    println!("prop columns: {}", output.df.len());
    let mut by_id: BTreeMap<u32, String> = BTreeMap::new();
    for info in &output.prop_controller.prop_infos {
        by_id.insert(info.id, info.prop_friendly_name.clone());
    }
    let mut rows: BTreeMap<String, (usize, usize, String)> = BTreeMap::new();
    for (id, column) in &output.df {
        let name = by_id.get(id).cloned().unwrap_or_else(|| format!("id:{id}"));
        rows.insert(name, (column_len(column), column.num_nones, head(column, samples)));
    }
    let requested: BTreeSet<&str> = output.prop_controller.wanted_player_props.iter().map(String::as_str).collect();
    let produced: BTreeSet<&str> = rows.keys().map(String::as_str).collect();
    let missing: Vec<&&str> = requested.iter().filter(|name| !produced.contains(**name)).collect();
    if !missing.is_empty() {
        println!("requested but not produced as a named column: {missing:?}");
    }
    for (name, (len, nones, sample)) in rows {
        println!("    {len:>9} values ({nones} none)  {name}");
        if samples > 0 {
            println!("              {sample}");
        }
    }
}

fn report_projectiles(output: &DemoOutput) {
    println!("projectile sample records: {}", output.projectiles.len());
    if output.projectiles.is_empty() {
        return;
    }
    let mut per_type: BTreeMap<String, usize> = BTreeMap::new();
    let mut per_entity: BTreeMap<i32, (usize, i32, i32)> = BTreeMap::new();

    for record in &output.projectiles {
        let name = record.grenade_type.clone().unwrap_or_else(|| "unknown".to_string());
        *per_type.entry(name).or_insert(0) += 1;
        let (Some(entity), Some(tick)) = (record.entity_id, record.tick) else { continue };
        let slot = per_entity.entry(entity).or_insert((0, tick, tick));
        slot.0 += 1;
        slot.1 = slot.1.min(tick);
        slot.2 = slot.2.max(tick);
    }

    for (name, count) in &per_type {
        println!("    {count:>7} samples  {name}");
    }

    let mut lengths: Vec<usize> = per_entity.values().map(|slot| slot.0).collect();
    lengths.sort_unstable();
    println!("distinct projectile entities: {}", per_entity.len());
    if !lengths.is_empty() {
        println!(
            "samples per entity: min {} / median {} / max {}",
            lengths[0],
            lengths[lengths.len() / 2],
            lengths[lengths.len() - 1]
        );
    }
    if let Some((entity, _)) = per_entity.iter().max_by_key(|(_, slot)| slot.0) {
        println!("trajectory of entity {entity}, first 10 samples:");
        for record in output.projectiles.iter().filter(|r| r.entity_id == Some(*entity)).take(10) {
            println!(
                "    tick {:>7}  ({:>9.1}, {:>9.1}, {:>9.1})  {}",
                record.tick.unwrap_or(-1),
                record.x.unwrap_or(f32::NAN),
                record.y.unwrap_or(f32::NAN),
                record.z.unwrap_or(f32::NAN),
                record.grenade_type.clone().unwrap_or_default()
            );
        }
    }
}

fn report_grenade_type_anomaly(output: &DemoOutput) {
    let mut checked = 0usize;
    let mut equal_to_tick = 0usize;
    for event in &output.game_events {
        for field in &event.fields {
            if !field.name.ends_with("grenade_type") {
                continue;
            }
            let Some(Variant::I32(value)) = field.data else { continue };
            checked += 1;
            if value == event.tick {
                equal_to_tick += 1;
            }
        }
    }
    println!("\n## grenade_type fields on events");
    println!("    i32-valued grenade_type fields: {checked}");
    println!("    of those, equal to the event tick: {equal_to_tick}");
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let path = args.get(1).expect("usage: probe <demo.dem>");
    let bytes = std::fs::read(path).expect("cannot read demo");
    let huf = create_huffman_lookup_table();
    println!("Demo: {path}\nSize: {} bytes", bytes.len());

    let (events_output, events_time) = run(
        &bytes,
        "A — events only",
        inputs(&huf, vec![], owned(&["all"]), false, false, false),
    );
    println!("game events: {}", events_output.game_events.len());
    println!("prop columns: {}", events_output.df.len());
    println!("projectile records: {}", events_output.projectiles.len());
    let event_names: BTreeSet<&String> = events_output.game_events_counter.iter().collect();
    println!("distinct event names: {}", event_names.len());

    let (ticks_output, ticks_time) = run(
        &bytes,
        "B — per-tick player props, no events",
        inputs(&huf, owned(&TICK_PROPS), vec![], false, false, false),
    );
    report_ticks(&ticks_output, 4);
    println!("game events: {}", ticks_output.game_events.len());

    let (projectiles_output, projectiles_time) = run(
        &bytes,
        "C — projectiles only (parse_grenades = false)",
        inputs(&huf, vec![], vec![], true, false, false),
    );
    report_projectiles(&projectiles_output);
    report_ticks(&projectiles_output, 8);

    let (combined_output, combined_time) = run(
        &bytes,
        "D — events + props + projectiles in one pass",
        inputs(&huf, owned(&TICK_PROPS), owned(&["all"]), true, true, false),
    );
    println!("game events: {}", combined_output.game_events.len());
    println!("prop columns: {}", combined_output.df.len());
    println!("projectile records: {}", combined_output.projectiles.len());

    let enriched_names: BTreeSet<&str> = combined_output
        .game_events
        .iter()
        .filter(|event| event.name == "player_death")
        .flat_map(|event| event.fields.iter().map(|field| field.name.as_str()))
        .collect();
    println!("player_death fields when props are also requested: {}", enriched_names.len());
    println!("    {enriched_names:?}");

    report_grenade_type_anomaly(&combined_output);

    let (st_output, st_time) = run_with(
        &bytes,
        "E — events only, ForceSingleThreaded",
        inputs(&huf, vec![], owned(&["all"]), false, false, false),
        ParsingMode::ForceSingleThreaded,
    );
    let mut mt_counts: BTreeMap<&str, usize> = BTreeMap::new();
    for event in &events_output.game_events {
        *mt_counts.entry(event.name.as_str()).or_insert(0) += 1;
    }
    let mut st_counts: BTreeMap<&str, usize> = BTreeMap::new();
    for event in &st_output.game_events {
        *st_counts.entry(event.name.as_str()).or_insert(0) += 1;
    }
    println!("game events: {} (multi-threaded pass A had {})", st_output.game_events.len(), events_output.game_events.len());
    println!("per-event differences between ForceSingleThreaded and Normal:");
    let names: BTreeSet<&str> = mt_counts.keys().chain(st_counts.keys()).copied().collect();
    for name in names {
        let mt = mt_counts.get(name).copied().unwrap_or(0);
        let st = st_counts.get(name).copied().unwrap_or(0);
        if mt != st {
            println!("    {name}: normal {mt} vs single-threaded {st}");
        }
    }
    let _ = st_time;

    println!("\n## Timing");
    println!("    A events      {events_time:.2}s");
    println!("    B ticks       {ticks_time:.2}s");
    println!("    C projectiles {projectiles_time:.2}s");
    println!("    A+B+C         {:.2}s", events_time + ticks_time + projectiles_time);
    println!("    D combined    {combined_time:.2}s");
}
