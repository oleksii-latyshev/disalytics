use crate::js::{count, set};
use demo_parser::{GrenadeTrajectory, TickTrack};
use js_sys::{Float32Array, Int16Array, Object, Uint8Array, Uint16Array};

/// Every buffer becomes a JavaScript-owned typed array rather than a view into linear memory: the
/// worker transfers these and is then terminated, and a view would not survive either.
pub fn track(track: &TickTrack) -> Object {
    let out = Object::new();

    set(&out, "tickRate", track.tick_rate);
    set(&out, "sampleHz", track.sample_hz);
    set(&out, "frameCount", count(track.frame_count));
    set(&out, "slotCount", count(track.slot_count));
    set(&out, "posX", Float32Array::from(&track.pos_x[..]));
    set(&out, "posY", Float32Array::from(&track.pos_y[..]));
    set(&out, "posZ", Float32Array::from(&track.pos_z[..]));
    set(&out, "yaw", Int16Array::from(&track.yaw[..]));
    set(&out, "pitch", Int16Array::from(&track.pitch[..]));
    set(&out, "health", Uint8Array::from(&track.health[..]));
    set(&out, "flags", Uint8Array::from(&track.flags[..]));
    set(&out, "speed", Uint16Array::from(&track.speed[..]));
    set(&out, "armour", Uint8Array::from(&track.armour[..]));
    set(&out, "weapon", Uint8Array::from(&track.weapon[..]));
    set(&out, "grenades", Uint8Array::from(&track.grenades[..]));
    set(&out, "money", Uint16Array::from(&track.money[..]));

    out
}

pub fn trajectory(trajectory: &GrenadeTrajectory) -> Object {
    let out = Object::new();

    set(&out, "sampleHz", trajectory.sample_hz);
    set(&out, "firstTick", trajectory.first_tick);
    set(&out, "sampleCount", count(trajectory.sample_count));
    set(&out, "x", Float32Array::from(&trajectory.x[..]));
    set(&out, "y", Float32Array::from(&trajectory.y[..]));
    set(&out, "z", Float32Array::from(&trajectory.z[..]));

    out
}
