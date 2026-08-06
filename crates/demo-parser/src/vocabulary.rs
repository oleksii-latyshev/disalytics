//! The engine's own words for things, translated into the schema's. Game vocabulary is canonical
//! and never localised — `CODE_REQUIREMENTS.md` §10 — so these are identifiers, not copy.

use crate::schema::{BuyType, HitGroup, RoundWinReason, Team};

/// Per-player equipment value at freeze-time end. The ladder is a review aid, not a rule the game
/// enforces — it exists so a round can be labelled without the viewer adding up loadouts.
const ECO_CEILING: i32 = 2_000;
const FORCE_BUY_CEILING: i32 = 3_500;
const SEMI_BUY_CEILING: i32 = 4_750;

pub(crate) fn team_of(winner: &str) -> Option<Team> {
    match winner {
        "CT" => Some(Team::Ct),
        "T" => Some(Team::T),
        _ => None,
    }
}

pub(crate) fn reason_of(reason: &str) -> RoundWinReason {
    match reason {
        "ct_killed" => RoundWinReason::AllCtEliminated,
        "t_killed" => RoundWinReason::AllTEliminated,
        "bomb_defused" => RoundWinReason::BombDefused,
        "bomb_exploded" => RoundWinReason::BombExploded,
        "time_ran_out" => RoundWinReason::TimeExpired,
        _ => RoundWinReason::Draw,
    }
}

/// Knife and world kills report `-1` here rather than a name, which is what the catch-all covers.
pub(crate) fn hit_group_of(hit_group: &str) -> HitGroup {
    match hit_group {
        "head" => HitGroup::Head,
        "chest" => HitGroup::Chest,
        "stomach" => HitGroup::Stomach,
        "left_arm" => HitGroup::LeftArm,
        "right_arm" => HitGroup::RightArm,
        "left_leg" => HitGroup::LeftLeg,
        "right_leg" => HitGroup::RightLeg,
        "neck" => HitGroup::Neck,
        "gear" => HitGroup::Gear,
        _ => HitGroup::Generic,
    }
}

/// A half start is only a pistol round when the players are on pistol-round money: overtime halves
/// also swap sides, and both of them open with a full buy.
pub(crate) const fn buy_type_of(equipment_value: i32, is_half_start: bool) -> BuyType {
    if is_half_start && equipment_value < ECO_CEILING {
        return BuyType::Pistol;
    }
    if equipment_value < ECO_CEILING {
        BuyType::Eco
    } else if equipment_value < FORCE_BUY_CEILING {
        BuyType::ForceBuy
    } else if equipment_value < SEMI_BUY_CEILING {
        BuyType::SemiBuy
    } else {
        BuyType::FullBuy
    }
}

#[cfg(test)]
mod tests {
    use super::{buy_type_of, hit_group_of, reason_of, team_of};
    use crate::schema::{BuyType, HitGroup, RoundWinReason, Team};

    #[test]
    fn every_win_reason_the_engine_names_maps_to_one_of_ours() {
        assert_eq!(reason_of("ct_killed"), RoundWinReason::AllCtEliminated);
        assert_eq!(reason_of("t_killed"), RoundWinReason::AllTEliminated);
        assert_eq!(reason_of("bomb_defused"), RoundWinReason::BombDefused);
        assert_eq!(reason_of("bomb_exploded"), RoundWinReason::BombExploded);
        assert_eq!(reason_of("time_ran_out"), RoundWinReason::TimeExpired);
    }

    #[test]
    fn an_unknown_win_reason_is_a_draw_rather_than_a_panic() {
        assert_eq!(reason_of("something_new"), RoundWinReason::Draw);
        assert_eq!(reason_of(""), RoundWinReason::Draw);
    }

    #[test]
    fn the_winner_is_only_ever_one_of_the_two_sides() {
        assert_eq!(team_of("CT"), Some(Team::Ct));
        assert_eq!(team_of("T"), Some(Team::T));
        assert_eq!(team_of("Draw"), None);
    }

    #[test]
    fn hitgroups_arrive_with_underscores_and_leave_kebab_cased() {
        assert_eq!(hit_group_of("left_arm"), HitGroup::LeftArm);
        assert_eq!(hit_group_of("right_leg"), HitGroup::RightLeg);
        assert_eq!(hit_group_of("head"), HitGroup::Head);
    }

    #[test]
    fn the_numeric_hitgroup_a_knife_kill_reports_is_generic() {
        assert_eq!(hit_group_of("-1"), HitGroup::Generic);
        assert_eq!(hit_group_of("generic"), HitGroup::Generic);
    }

    #[test]
    fn the_first_round_of_a_half_is_a_pistol_round() {
        assert_eq!(buy_type_of(0, true), BuyType::Pistol);
        assert_eq!(buy_type_of(900, true), BuyType::Pistol);
    }

    #[test]
    fn an_overtime_half_swaps_sides_on_full_buys_and_is_not_a_pistol_round() {
        assert_eq!(buy_type_of(5_100, true), BuyType::FullBuy);
        assert_eq!(buy_type_of(3_600, true), BuyType::SemiBuy);
    }

    #[test]
    fn the_buy_ladder_runs_from_eco_to_full() {
        assert_eq!(buy_type_of(0, false), BuyType::Eco);
        assert_eq!(buy_type_of(1_999, false), BuyType::Eco);
        assert_eq!(buy_type_of(2_000, false), BuyType::ForceBuy);
        assert_eq!(buy_type_of(3_499, false), BuyType::ForceBuy);
        assert_eq!(buy_type_of(3_500, false), BuyType::SemiBuy);
        assert_eq!(buy_type_of(4_749, false), BuyType::SemiBuy);
        assert_eq!(buy_type_of(4_750, false), BuyType::FullBuy);
    }
}
