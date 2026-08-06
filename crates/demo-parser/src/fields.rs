//! Reading one field off one game event. Upstream types every field as a [`Variant`], so which
//! arm a given field lands on is discovered rather than declared.

use parser::second_pass::game_events::GameEvent;
use parser::second_pass::variants::Variant;

pub(crate) fn field<'a>(event: &'a GameEvent, name: &str) -> Option<&'a Variant> {
    event
        .fields
        .iter()
        .find(|field| field.name == name)
        .and_then(|field| field.data.as_ref())
}

/// An absent actor reaches us as an empty string rather than as a missing field, so both read as
/// nothing here.
pub(crate) fn text<'a>(event: &'a GameEvent, name: &str) -> Option<&'a str> {
    match field(event, name)? {
        Variant::String(value) if !value.is_empty() => Some(value),
        _ => None,
    }
}

pub(crate) fn integer(event: &GameEvent, name: &str) -> Option<i64> {
    match field(event, name)? {
        Variant::I32(value) => Some(i64::from(*value)),
        Variant::U32(value) => Some(i64::from(*value)),
        _ => None,
    }
}

pub(crate) fn float(event: &GameEvent, name: &str) -> Option<f32> {
    match field(event, name)? {
        Variant::F32(value) => Some(*value),
        _ => None,
    }
}

pub(crate) fn boolean(event: &GameEvent, name: &str) -> bool {
    matches!(field(event, name), Some(Variant::Bool(true)))
}

/// A `SteamID` arrives as decimal text on events and as `u64` in the tick table. The text form is
/// the one that survives 64 bits, so it is parsed rather than read through a float.
pub(crate) fn steam_id(event: &GameEvent, name: &str) -> Option<u64> {
    match field(event, name)? {
        Variant::String(value) => value.parse().ok(),
        Variant::U64(value) => Some(*value),
        _ => None,
    }
}

pub(crate) fn narrow(value: Option<i64>) -> i32 {
    i32::try_from(value.unwrap_or_default()).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::{boolean, float, integer, narrow, steam_id, text};
    use parser::second_pass::game_events::{EventField, GameEvent};
    use parser::second_pass::variants::Variant;

    fn event_with(fields: Vec<(&str, Option<Variant>)>) -> GameEvent {
        GameEvent {
            name: "player_death".to_owned(),
            tick: 100,
            fields: fields
                .into_iter()
                .map(|(name, data)| EventField {
                    name: name.to_owned(),
                    data,
                })
                .collect(),
        }
    }

    #[test]
    fn an_absent_actor_reads_as_nothing_whether_it_is_empty_or_missing() {
        let event = event_with(vec![
            ("attacker_steamid", Some(Variant::String(String::new()))),
            ("assister_steamid", None),
        ]);

        assert_eq!(text(&event, "attacker_steamid"), None);
        assert_eq!(text(&event, "assister_steamid"), None);
        assert_eq!(text(&event, "not_a_field"), None);
    }

    #[test]
    fn a_steamid_survives_its_64_bits_through_the_text_form() {
        let event = event_with(vec![(
            "user_steamid",
            Some(Variant::String("76561199226814817".to_owned())),
        )]);

        assert_eq!(
            steam_id(&event, "user_steamid"),
            Some(76_561_199_226_814_817)
        );
    }

    #[test]
    fn an_integer_field_reads_the_same_whether_upstream_signed_it() {
        let event = event_with(vec![
            ("penetrated", Some(Variant::I32(2))),
            ("round", Some(Variant::U32(7))),
            ("distance", Some(Variant::F32(1.5))),
        ]);

        assert_eq!(integer(&event, "penetrated"), Some(2));
        assert_eq!(integer(&event, "round"), Some(7));
        assert_eq!(integer(&event, "distance"), None);
        assert_eq!(float(&event, "distance"), Some(1.5));
    }

    #[test]
    fn a_missing_flag_is_false_rather_than_unknown() {
        let event = event_with(vec![("headshot", Some(Variant::Bool(false)))]);

        assert!(!boolean(&event, "headshot"));
        assert!(!boolean(&event, "noscope"));
    }

    #[test]
    fn a_value_too_wide_for_the_schema_narrows_to_zero_rather_than_wrapping() {
        assert_eq!(narrow(Some(4_096)), 4_096);
        assert_eq!(narrow(None), 0);
        assert_eq!(narrow(Some(i64::MAX)), 0);
    }
}
