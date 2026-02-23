/// Generic 3D vector for use with unit newtypes.
use std::fmt;
use std::ops::{Add, Neg, Sub};

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Vec3<T> {
    pub x: T,
    pub y: T,
    pub z: T,
}

impl<T: Copy> Vec3<T> {
    pub fn new(x: T, y: T, z: T) -> Self {
        Self { x, y, z }
    }
}

/// Vec3 of f64-newtypes that support the operations we need.
/// We implement common operations generically where the inner type supports them.
impl<T> Add for Vec3<T>
where
    T: Add<Output = T>,
{
    type Output = Self;
    fn add(self, rhs: Self) -> Self {
        Self {
            x: self.x + rhs.x,
            y: self.y + rhs.y,
            z: self.z + rhs.z,
        }
    }
}

impl<T> Sub for Vec3<T>
where
    T: Sub<Output = T>,
{
    type Output = Self;
    fn sub(self, rhs: Self) -> Self {
        Self {
            x: self.x - rhs.x,
            y: self.y - rhs.y,
            z: self.z - rhs.z,
        }
    }
}

impl<T> Neg for Vec3<T>
where
    T: Neg<Output = T>,
{
    type Output = Self;
    fn neg(self) -> Self {
        Self {
            x: -self.x,
            y: -self.y,
            z: -self.z,
        }
    }
}

impl<T> Vec3<T>
where
    T: Copy + std::ops::Mul<f64, Output = T>,
{
    /// Scalar multiplication
    pub fn scale(self, s: f64) -> Self {
        Self {
            x: self.x * s,
            y: self.y * s,
            z: self.z * s,
        }
    }
}

/// Trait for types that wrap an f64 value.
/// All implementors are `Copy`, so consuming `self` is intentional.
#[allow(clippy::wrong_self_convention)]
pub trait AsF64 {
    fn as_f64(self) -> f64;
}

impl AsF64 for f64 {
    fn as_f64(self) -> f64 {
        self
    }
}

impl<T: Copy + AsF64> Vec3<T> {
    /// Dot product returning f64 (in squared units of T).
    pub fn dot_raw(self, rhs: Self) -> f64 {
        self.x.as_f64() * rhs.x.as_f64()
            + self.y.as_f64() * rhs.y.as_f64()
            + self.z.as_f64() * rhs.z.as_f64()
    }

    /// Euclidean norm (magnitude) as f64, in units of T.
    pub fn norm_raw(self) -> f64 {
        self.dot_raw(self).sqrt()
    }
}

impl<T: fmt::Display> fmt::Display for Vec3<T> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "({}, {}, {})", self.x, self.y, self.z)
    }
}

// Implement AsF64 for our unit types
use crate::units::{Km, KmPerSec};

impl AsF64 for Km {
    fn as_f64(self) -> f64 {
        self.value()
    }
}

impl AsF64 for KmPerSec {
    fn as_f64(self) -> f64 {
        self.value()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::units::{Km, KmPerSec};

    #[test]
    fn test_vec3_f64_operations() {
        let a = Vec3::new(1.0_f64, 2.0, 3.0);
        let b = Vec3::new(4.0_f64, 5.0, 6.0);
        let sum = a + b;
        assert_eq!(sum, Vec3::new(5.0, 7.0, 9.0));
        let diff = b - a;
        assert_eq!(diff, Vec3::new(3.0, 3.0, 3.0));
    }

    #[test]
    fn test_vec3_km_operations() {
        let a = Vec3::new(Km(1.0), Km(0.0), Km(0.0));
        let b = Vec3::new(Km(0.0), Km(1.0), Km(0.0));
        let sum = a + b;
        assert_eq!(sum, Vec3::new(Km(1.0), Km(1.0), Km(0.0)));
    }

    #[test]
    fn test_vec3_dot_and_norm() {
        let v = Vec3::new(Km(3.0), Km(4.0), Km(0.0));
        assert!((v.norm_raw() - 5.0).abs() < 1e-15);
        assert!((v.dot_raw(v) - 25.0).abs() < 1e-15);
    }

    #[test]
    fn test_vec3_scale() {
        let v = Vec3::new(Km(1.0), Km(2.0), Km(3.0));
        let scaled = v.scale(2.0);
        assert_eq!(scaled, Vec3::new(Km(2.0), Km(4.0), Km(6.0)));
    }

    #[test]
    fn test_vec3_speed_norm() {
        // ISS orbital velocity roughly ~7.66 km/s
        let v = Vec3::new(KmPerSec(7.0), KmPerSec(3.0), KmPerSec(1.0));
        let speed = v.norm_raw();
        let expected = (49.0 + 9.0 + 1.0_f64).sqrt();
        assert!((speed - expected).abs() < 1e-15);
    }

    #[test]
    fn test_vec3_neg() {
        let v = Vec3::new(Km(1.0), Km(-2.0), Km(3.0));
        let neg_v = -v;
        assert_eq!(neg_v, Vec3::new(Km(-1.0), Km(2.0), Km(-3.0)));
    }
}
