use crate::js::{array, set};
use demo_parser::{MatchHeader, PlayerInfo};
use js_sys::Object;
use wasm_bindgen::JsValue;

pub fn header(header: &MatchHeader) -> Object {
    let out = Object::new();

    set(&out, "map", header.map.as_str());
    set(&out, "tickRate", header.tick_rate);
    set(&out, "players", array(&header.players, player));

    out
}

fn player(player: &PlayerInfo) -> JsValue {
    let out = Object::new();

    set(&out, "slot", player.slot);
    // A 64-bit SteamID does not survive a JavaScript number, so it crosses as decimal text.
    set(&out, "steamId", player.steam_id.to_string().as_str());
    set(&out, "name", player.name.as_str());
    set(&out, "team", player.team.as_str());

    out.into()
}
