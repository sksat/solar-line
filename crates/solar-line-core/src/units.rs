/// Type-safe unit newtypes for orbital mechanics.
///
/// All units use km-based system consistent with standard astrodynamics:
/// - Distance: km
/// - Speed: km/s
/// - Time: seconds
/// - Angles: radians
/// - Gravitational parameter: km³/s²
use std::fmt;
use std::ops::{Add, Div, Mul, Neg, Sub};

macro_rules! unit_newtype {
    ($name:ident, $unit_str:expr) => {
        #[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
        pub struct $name(pub f64);

        impl $name {
            pub fn value(self) -> f64 {
                self.0
            }
        }

        impl fmt::Display for $name {
            fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                write!(f, "{} {}", self.0, $unit_str)
            }
        }

        impl Add for $name {
            type Output = Self;
            fn add(self, rhs: Self) -> Self {
                Self(self.0 + rhs.0)
            }
        }

        impl Sub for $name {
            type Output = Self;
            fn sub(self, rhs: Self) -> Self {
                Self(self.0 - rhs.0)
            }
        }

        impl Neg for $name {
            type Output = Self;
            fn neg(self) -> Self {
                Self(-self.0)
            }
        }

        impl Mul<f64> for $name {
            type Output = Self;
            fn mul(self, rhs: f64) -> Self {
                Self(self.0 * rhs)
            }
        }

        impl Mul<$name> for f64 {
            type Output = $name;
            fn mul(self, rhs: $name) -> $name {
                $name(self * rhs.0)
            }
        }

        impl Div<f64> for $name {
            type Output = Self;
            fn div(self, rhs: f64) -> Self {
                Self(self.0 / rhs)
            }
        }

        impl Div<$name> for $name {
            type Output = f64;
            fn div(self, rhs: $name) -> f64 {
                self.0 / rhs.0
            }
        }
    };
}

unit_newtype!(Km, "km");
unit_newtype!(KmPerSec, "km/s");
unit_newtype!(Seconds, "s");
unit_newtype!(Radians, "rad");
unit_newtype!(Mu, "km³/s²");

impl Km {
    pub fn abs(self) -> Self {
        Self(self.0.abs())
    }
}

impl KmPerSec {
    pub fn abs(self) -> Self {
        Self(self.0.abs())
    }
}

impl Radians {
    /// Normalize angle to [0, 2π)
    pub fn normalize(self) -> Self {
        let two_pi = std::f64::consts::TAU;
        let mut v = self.0 % two_pi;
        if v < 0.0 {
            v += two_pi;
        }
        Self(v)
    }

    /// Normalize angle to (-π, π]
    pub fn normalize_signed(self) -> Self {
        let two_pi = std::f64::consts::TAU;
        let pi = std::f64::consts::PI;
        let mut v = self.0 % two_pi;
        if v > pi {
            v -= two_pi;
        } else if v <= -pi {
            v += two_pi;
        }
        Self(v)
    }

    pub fn sin(self) -> f64 {
        self.0.sin()
    }

    pub fn cos(self) -> f64 {
        self.0.cos()
    }

    pub fn tan(self) -> f64 {
        self.0.tan()
    }
}

/// Eccentricity with validation.
/// For elliptical orbits: 0 <= e < 1
/// For parabolic: e == 1
/// For hyperbolic: e > 1
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct Eccentricity(f64);

impl Eccentricity {
    /// Create a new eccentricity value. Returns None if negative.
    pub fn new(e: f64) -> Option<Self> {
        if e >= 0.0 {
            Some(Self(e))
        } else {
            None
        }
    }

    /// Create eccentricity for an elliptical orbit (0 <= e < 1).
    /// Returns None if out of range.
    pub fn elliptical(e: f64) -> Option<Self> {
        if (0.0..1.0).contains(&e) {
            Some(Self(e))
        } else {
            None
        }
    }

    pub fn value(self) -> f64 {
        self.0
    }

    pub fn is_circular(&self) -> bool {
        self.0 == 0.0
    }

    pub fn is_elliptical(&self) -> bool {
        self.0 < 1.0
    }

    pub fn is_parabolic(&self) -> bool {
        (self.0 - 1.0).abs() < f64::EPSILON
    }

    pub fn is_hyperbolic(&self) -> bool {
        self.0 > 1.0
    }
}

impl fmt::Display for Eccentricity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "e={}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f64::consts::{FRAC_PI_2, PI, TAU};

    #[test]
    fn test_km_arithmetic() {
        let a = Km(100.0);
        let b = Km(50.0);
        assert_eq!((a + b).value(), 150.0);
        assert_eq!((a - b).value(), 50.0);
        assert_eq!((a * 2.0).value(), 200.0);
        assert_eq!((3.0 * b).value(), 150.0);
        assert_eq!((a / 2.0).value(), 50.0);
        assert_eq!(a / b, 2.0); // dimensionless ratio
    }

    #[test]
    fn test_radians_normalize() {
        // Already normalized
        assert!((Radians(1.0).normalize().value() - 1.0).abs() < 1e-15);

        // Negative angle
        let r = Radians(-FRAC_PI_2).normalize();
        assert!((r.value() - (TAU - FRAC_PI_2)).abs() < 1e-15);

        // Greater than 2π
        let r = Radians(TAU + 1.0).normalize();
        assert!((r.value() - 1.0).abs() < 1e-14);
    }

    #[test]
    fn test_radians_normalize_signed() {
        // Positive within range
        assert!((Radians(1.0).normalize_signed().value() - 1.0).abs() < 1e-15);

        // Should wrap to negative
        let r = Radians(PI + 0.5).normalize_signed();
        assert!((r.value() - (-PI + 0.5)).abs() < 1e-14);

        // Already negative, within range
        let r = Radians(-1.0).normalize_signed();
        assert!((r.value() - (-1.0)).abs() < 1e-15);
    }

    #[test]
    fn test_radians_trig() {
        let r = Radians(FRAC_PI_2);
        assert!((r.sin() - 1.0).abs() < 1e-15);
        assert!(r.cos().abs() < 1e-15);
    }

    #[test]
    fn test_eccentricity_validation() {
        assert!(Eccentricity::new(-0.1).is_none());
        assert!(Eccentricity::new(0.0).is_some());
        assert!(Eccentricity::new(0.5).is_some());
        assert!(Eccentricity::new(1.5).is_some()); // hyperbolic is valid

        assert!(Eccentricity::elliptical(-0.1).is_none());
        assert!(Eccentricity::elliptical(0.5).is_some());
        assert!(Eccentricity::elliptical(1.0).is_none()); // not elliptical
        assert!(Eccentricity::elliptical(1.5).is_none());
    }

    #[test]
    fn test_eccentricity_classification() {
        let circular = Eccentricity::new(0.0).unwrap();
        assert!(circular.is_circular());
        assert!(circular.is_elliptical());

        let elliptical = Eccentricity::new(0.5).unwrap();
        assert!(!elliptical.is_circular());
        assert!(elliptical.is_elliptical());

        let parabolic = Eccentricity::new(1.0).unwrap();
        assert!(parabolic.is_parabolic());

        let hyperbolic = Eccentricity::new(1.5).unwrap();
        assert!(hyperbolic.is_hyperbolic());
    }

    #[test]
    fn test_display() {
        assert_eq!(format!("{}", Km(42164.0)), "42164 km");
        assert_eq!(format!("{}", KmPerSec(7.784)), "7.784 km/s");
        assert_eq!(format!("{}", Seconds(3600.0)), "3600 s");
    }

    #[test]
    fn test_negation() {
        assert_eq!((-KmPerSec(3.0)).value(), -3.0);
        assert_eq!((-Km(100.0)).value(), -100.0);
    }

    // --- Seconds type tests ---

    #[test]
    fn seconds_arithmetic() {
        let a = Seconds(3600.0);
        let b = Seconds(1800.0);
        assert_eq!((a + b).value(), 5400.0);
        assert_eq!((a - b).value(), 1800.0);
        assert_eq!((a * 2.0).value(), 7200.0);
        assert_eq!((2.0 * b).value(), 3600.0);
        assert_eq!((a / 2.0).value(), 1800.0);
        assert_eq!(a / b, 2.0);
    }

    #[test]
    fn seconds_negation() {
        assert_eq!((-Seconds(60.0)).value(), -60.0);
        assert_eq!((-Seconds(-30.0)).value(), 30.0);
    }

    #[test]
    fn seconds_display() {
        assert_eq!(format!("{}", Seconds(86400.0)), "86400 s");
        assert_eq!(format!("{}", Seconds(0.001)), "0.001 s");
    }

    // --- Mu type tests ---

    #[test]
    fn mu_arithmetic() {
        let a = Mu(3.986e5);
        let b = Mu(1.327e11);
        assert_eq!((a + b).value(), 3.986e5 + 1.327e11);
        assert_eq!((b - a).value(), 1.327e11 - 3.986e5);
        assert_eq!((a * 2.0).value(), 2.0 * 3.986e5);
        assert_eq!((0.5 * a).value(), 0.5 * 3.986e5);
        assert_eq!((a / 2.0).value(), 3.986e5 / 2.0);
        assert!((b / a - 1.327e11 / 3.986e5).abs() < 1e-6);
    }

    #[test]
    fn mu_negation() {
        assert_eq!((-Mu(100.0)).value(), -100.0);
    }

    #[test]
    fn mu_display() {
        assert_eq!(format!("{}", Mu(398600.4418)), "398600.4418 km³/s²");
    }

    // --- KmPerSec arithmetic tests ---

    #[test]
    fn km_per_sec_arithmetic() {
        let a = KmPerSec(10.0);
        let b = KmPerSec(3.0);
        assert_eq!((a + b).value(), 13.0);
        assert_eq!((a - b).value(), 7.0);
        assert_eq!((a * 0.5).value(), 5.0);
        assert_eq!((4.0 * b).value(), 12.0);
        assert_eq!((a / 5.0).value(), 2.0);
        assert!((a / b - 10.0 / 3.0).abs() < 1e-15);
    }

    // --- Radians arithmetic tests ---

    #[test]
    fn radians_arithmetic() {
        let a = Radians(PI);
        let b = Radians(FRAC_PI_2);
        assert!((a + b).value() - (PI + FRAC_PI_2) < 1e-15);
        assert!((a - b).value() - FRAC_PI_2 < 1e-15);
        assert_eq!((-a).value(), -PI);
        assert!((a * 2.0).value() - TAU < 1e-15);
        assert!((2.0 * b).value() - PI < 1e-15);
        assert!((a / 2.0).value() - FRAC_PI_2 < 1e-15);
        assert!((a / b - 2.0).abs() < 1e-15);
    }

    #[test]
    fn radians_display() {
        assert_eq!(format!("{}", Radians(3.14159)), "3.14159 rad");
    }

    // --- Km::abs / KmPerSec::abs edge cases ---

    #[test]
    fn km_abs() {
        assert_eq!(Km(-42.0).abs().value(), 42.0);
        assert_eq!(Km(42.0).abs().value(), 42.0);
        assert_eq!(Km(0.0).abs().value(), 0.0);
    }

    #[test]
    fn km_per_sec_abs() {
        assert_eq!(KmPerSec(-7.8).abs().value(), 7.8);
        assert_eq!(KmPerSec(7.8).abs().value(), 7.8);
        assert_eq!(KmPerSec(0.0).abs().value(), 0.0);
    }

    // --- Radians::tan() ---

    #[test]
    fn radians_tan() {
        // tan(π/4) = 1
        assert!((Radians(std::f64::consts::FRAC_PI_4).tan() - 1.0).abs() < 1e-15);
        // tan(0) = 0
        assert!(Radians(0.0).tan().abs() < 1e-15);
    }

    // --- normalize_signed boundary at exactly -π ---

    #[test]
    fn radians_normalize_signed_at_neg_pi() {
        // At exactly -π, should wrap to positive π (since range is (-π, π])
        let r = Radians(-PI).normalize_signed();
        assert!((r.value() - PI).abs() < 1e-14);
    }

    #[test]
    fn radians_normalize_signed_at_pi() {
        // At exactly π, should stay at π
        let r = Radians(PI).normalize_signed();
        assert!((r.value() - PI).abs() < 1e-14);
    }

    #[test]
    fn radians_normalize_large_negative() {
        // -3π should normalize to -π + 2π = π ... but modulo: -3π % 2π = -π → +2π = π
        let r = Radians(-3.0 * PI).normalize_signed();
        assert!((r.value() - PI).abs() < 1e-13);
    }

    #[test]
    fn radians_normalize_zero() {
        assert_eq!(Radians(0.0).normalize().value(), 0.0);
        assert_eq!(Radians(0.0).normalize_signed().value(), 0.0);
    }

    // --- Eccentricity edge cases ---

    #[test]
    fn eccentricity_value_and_display() {
        let e = Eccentricity::new(0.0167).unwrap();
        assert!((e.value() - 0.0167).abs() < 1e-15);
        assert_eq!(format!("{}", e), "e=0.0167");
    }

    #[test]
    fn eccentricity_elliptical_boundary() {
        // Exactly 0 is valid elliptical (circular)
        assert!(Eccentricity::elliptical(0.0).is_some());
        // Just below 1 is valid elliptical
        assert!(Eccentricity::elliptical(0.999999).is_some());
        // Exactly 1 is NOT elliptical
        assert!(Eccentricity::elliptical(1.0).is_none());
    }

    #[test]
    fn eccentricity_partial_ord() {
        let low = Eccentricity::new(0.1).unwrap();
        let high = Eccentricity::new(0.9).unwrap();
        assert!(low < high);
    }

    // --- Zero and special float tests ---

    #[test]
    fn unit_zero_operations() {
        let z = Km(0.0);
        assert_eq!((z + z).value(), 0.0);
        assert_eq!((z - z).value(), 0.0);
        assert_eq!((z * 100.0).value(), 0.0);
        assert_eq!((-z).value(), 0.0);
    }

    #[test]
    fn unit_division_by_itself() {
        assert_eq!(Km(42.0) / Km(42.0), 1.0);
        assert_eq!(KmPerSec(7.784) / KmPerSec(7.784), 1.0);
        assert_eq!(Seconds(3600.0) / Seconds(3600.0), 1.0);
        assert_eq!(Mu(3.986e5) / Mu(3.986e5), 1.0);
        assert_eq!(Radians(PI) / Radians(PI), 1.0);
    }
}
