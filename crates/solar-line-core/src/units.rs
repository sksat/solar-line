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
}
