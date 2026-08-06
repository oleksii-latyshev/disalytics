use crate::js::{array, optional, set};
use crate::track::trajectory;
use demo_parser::{
    Blind, BombDefuse, BombPlant, Damage, DefuseOutcome, Grenade, Kill, MatchEvents, PlayerEconomy,
    Round, WorldPoint,
};
use js_sys::Object;
use wasm_bindgen::JsValue;

pub fn events(events: &MatchEvents) -> Object {
    let out = Object::new();

    set(&out, "rounds", array(&events.rounds, round));
    set(&out, "kills", array(&events.kills, kill));
    set(&out, "damage", array(&events.damage, damage));
    set(&out, "grenades", array(&events.grenades, grenade));
    set(&out, "blinds", array(&events.blinds, blind));
    set(&out, "plants", array(&events.plants, plant));
    set(&out, "defuses", array(&events.defuses, defuse));

    out
}

fn round(round: &Round) -> JsValue {
    let out = Object::new();

    set(&out, "number", round.number);
    set(&out, "startTick", round.start_tick);
    set(&out, "freezeTimeEndTick", round.freeze_time_end_tick);
    set(&out, "endTick", round.end_tick);
    set(&out, "winner", round.winner.as_str());
    set(&out, "reason", round.reason.as_str());
    set(&out, "economy", array(&round.economy, economy));

    out.into()
}

fn economy(economy: &PlayerEconomy) -> JsValue {
    let out = Object::new();

    set(&out, "slot", economy.slot);
    set(&out, "money", economy.money);
    set(&out, "equipmentValue", economy.equipment_value);
    set(&out, "buyType", economy.buy_type.as_str());

    out.into()
}

fn kill(kill: &Kill) -> JsValue {
    let out = Object::new();

    set(&out, "tick", kill.tick);
    set(&out, "attacker", optional(kill.attacker));
    set(&out, "victim", kill.victim);
    set(&out, "assister", optional(kill.assister));
    set(&out, "weapon", kill.weapon.as_str());
    set(&out, "isHeadshot", kill.is_headshot);
    set(&out, "isWallbang", kill.is_wallbang);
    set(&out, "isThroughSmoke", kill.is_through_smoke);
    set(&out, "isNoScope", kill.is_no_scope);
    set(&out, "isAttackerBlind", kill.is_attacker_blind);
    set(&out, "isVictimBlind", kill.is_victim_blind);
    set(&out, "distanceUnits", kill.distance_units);

    out.into()
}

fn damage(damage: &Damage) -> JsValue {
    let out = Object::new();

    set(&out, "tick", damage.tick);
    set(&out, "attacker", optional(damage.attacker));
    set(&out, "victim", damage.victim);
    set(&out, "weapon", damage.weapon.as_str());
    set(&out, "healthDamage", damage.health_damage);
    set(&out, "armorDamage", damage.armor_damage);
    set(&out, "hitGroup", damage.hit_group.as_str());

    out.into()
}

fn grenade(grenade: &Grenade) -> JsValue {
    let out = Object::new();

    set(&out, "thrower", grenade.thrower);
    set(&out, "type", grenade.grenade_type.as_str());
    set(&out, "throwTick", grenade.throw_tick);
    set(&out, "detonationTick", optional(grenade.detonation_tick));
    set(
        &out,
        "detonationPosition",
        grenade.detonation_position.map_or(JsValue::NULL, point),
    );
    set(&out, "expiryTick", optional(grenade.expiry_tick));
    set(&out, "trajectory", trajectory(&grenade.trajectory));

    out.into()
}

fn point(point: WorldPoint) -> JsValue {
    let out = Object::new();

    set(&out, "x", point.x);
    set(&out, "y", point.y);
    set(&out, "z", point.z);

    out.into()
}

fn blind(blind: &Blind) -> JsValue {
    let out = Object::new();

    set(&out, "tick", blind.tick);
    set(&out, "victim", blind.victim);
    set(&out, "attacker", optional(blind.attacker));
    set(&out, "durationSeconds", blind.duration_seconds);
    set(&out, "isTeammate", blind.is_teammate);

    out.into()
}

fn plant(plant: &BombPlant) -> JsValue {
    let out = Object::new();

    set(&out, "tick", plant.tick);
    set(&out, "planter", plant.planter);
    set(&out, "siteEntityId", plant.site_entity_id);

    out.into()
}

fn defuse(defuse: &BombDefuse) -> JsValue {
    let out = Object::new();

    set(&out, "startTick", defuse.start_tick);
    set(&out, "defuser", defuse.defuser);
    set(&out, "hasKit", defuse.has_kit);
    set(&out, "outcome", outcome(defuse.outcome));

    out.into()
}

fn outcome(outcome: DefuseOutcome) -> JsValue {
    let out = Object::new();

    match outcome {
        DefuseOutcome::Completed(tick) => {
            set(&out, "status", "completed");
            set(&out, "tick", tick);
        }
        DefuseOutcome::Aborted(tick) => {
            set(&out, "status", "aborted");
            set(&out, "tick", tick);
        }
        DefuseOutcome::Interrupted => set(&out, "status", "interrupted"),
    }

    out.into()
}
