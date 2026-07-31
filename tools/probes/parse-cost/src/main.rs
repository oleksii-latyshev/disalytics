use ahash::AHashMap;
use parser::first_pass::parser_settings::ParserInputs;
use parser::parse_demo::{Parser, ParsingMode};
use parser::second_pass::parser_settings::create_huffman_lookup_table;
use std::env;
use std::process::exit;
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
        only_header: false,
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

fn settings_for<'a>(pass: &str, huf: &'a Vec<(u8, u8)>) -> Option<ParserInputs<'a>> {
    match pass {
        "events" => Some(inputs(huf, vec![], owned(&["all"]), false)),
        "ticks" => Some(inputs(huf, owned(&TICK_PROPS), vec![], false)),
        "projectiles" => Some(inputs(huf, vec![], vec![], true)),
        _ => None,
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let Some(path) = args.get(1) else {
        eprintln!("usage: parse-cost-probe <demo.dem> <st|mt> <events|ticks|projectiles|all>");
        exit(2);
    };
    let mode_name = args.get(2).map(String::as_str).unwrap_or("mt");
    let pass_name = args.get(3).map(String::as_str).unwrap_or("all");

    let mode = match mode_name {
        "st" => ParsingMode::ForceSingleThreaded,
        "mt" => ParsingMode::ForceMultiThreaded,
        other => {
            eprintln!("unknown mode {other}, expected st or mt");
            exit(2);
        }
    };

    let passes: Vec<&str> = if pass_name == "all" {
        vec!["events", "ticks", "projectiles"]
    } else {
        vec![pass_name]
    };

    let bytes = std::fs::read(path).expect("cannot read demo");
    let huf = create_huffman_lookup_table();
    println!("demo {} bytes, mode {mode_name}", bytes.len());

    let mut total = 0.0;
    for pass in &passes {
        let Some(settings) = settings_for(pass, &huf) else {
            eprintln!("unknown pass {pass}");
            exit(2);
        };
        let started = Instant::now();
        let mode = match mode {
            ParsingMode::ForceSingleThreaded => ParsingMode::ForceSingleThreaded,
            ParsingMode::ForceMultiThreaded => ParsingMode::ForceMultiThreaded,
            ParsingMode::Normal => ParsingMode::Normal,
        };
        let output = Parser::new(settings, mode).parse_demo(&bytes).expect("parse failed");
        let elapsed = started.elapsed().as_secs_f64();
        total += elapsed;
        println!(
            "{pass:>12}  {elapsed:>6.2}s   events {:>6}  columns {:>3}",
            output.game_events.len(),
            output.df.len()
        );
    }

    if passes.len() > 1 {
        println!("{:>12}  {total:>6.2}s", "total");
    }
}
